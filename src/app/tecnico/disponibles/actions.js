"use server";

// HU24 · Autoasignar orden (JOJO-96 frontend) — Sneider Araneda
//
// Reglas (criterios de aceptación):
//  - El técnico debe estar autenticado y «Activo».
//  - Solo ve órdenes «Pendiente» sin técnico y de SU zona (la zona del cliente de la avería).
//  - Al autoasignarse, la orden pasa a «Asignada»; si otro técnico la tomó antes, se avisa.
//  - No puede tomar más órdenes si ya tiene el máximo de activas («Asignada» o «En atención»).

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ESTADOS_ACTIVOS = ["Asignada", "En atención"];

async function tecnicoActual(supabase, userId) {
  const { data } = await supabase
    .from("tecnicos")
    .select("id, nombre_completo, estado, max_ordenes")
    .eq("perfil_id", userId)
    .maybeSingle();
  return data;
}

async function contarActivas(supabase, tecnicoId) {
  const { count } = await supabase
    .from("ordenes")
    .select("id", { count: "exact", head: true })
    .eq("tecnico_id", tecnicoId)
    .in("estado", ESTADOS_ACTIVOS);
  return count || 0;
}

async function zonasDelTecnico(supabase, tecnicoId) {
  const { data } = await supabase
    .from("tecnico_zonas")
    .select("zona_id, zona:zonas ( nombre )")
    .eq("tecnico_id", tecnicoId);
  return data || [];
}

// ---------------------------------------------------------------------
// Lista de órdenes disponibles para el técnico actual
// ---------------------------------------------------------------------
export async function listarDisponibles() {
  const { user } = await requireRol("tecnico");
  const supabase = await createClient();

  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico) {
    return { ok: false, error: "Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta." };
  }
  if (tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico está inactiva. No puedes autoasignarte órdenes." };
  }

  const zonas = await zonasDelTecnico(supabase, tecnico.id);
  const activas = await contarActivas(supabase, tecnico.id);
  const base = {
    ok: true,
    tecnico: tecnico.nombre_completo,
    zonas: zonas.map((z) => z.zona?.nombre).filter(Boolean),
    activas,
    maximo: tecnico.max_ordenes,
    lleno: activas >= tecnico.max_ordenes,
  };
  if (zonas.length === 0) return { ...base, ordenes: [] };

  const idsZona = zonas.map((z) => z.zona_id);
  const { data, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, direccion_atencion, horario_preferido, fecha_registro,
      averia:averias!inner (
        codigo, descripcion,
        tipo:tipos_averia ( nombre ),
        cliente:clientes!inner ( nombre_completo, zona_id, zona:zonas ( nombre ) )
      )
    `)
    .eq("estado", "Pendiente")
    .is("tecnico_id", null)
    .in("averia.cliente.zona_id", idsZona)
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("[disponibles] listar", error.code, error.message);
    return { ok: false, error: "No se pudieron cargar las órdenes. Intenta nuevamente." };
  }
  return { ...base, ordenes: data || [] };
}

// ---------------------------------------------------------------------
// Autoasignarse una orden
// ---------------------------------------------------------------------
export async function autoasignarse(ordenId) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa. No puedes autoasignarte órdenes." };
  }

  // Máximo de órdenes activas (HU11)
  const activas = await contarActivas(supabase, tecnico.id);
  if (activas >= tecnico.max_ordenes) {
    return {
      ok: false,
      error: `Alcanzaste tu límite de ${tecnico.max_ordenes} órdenes activas. Cierra una para tomar otra.`,
    };
  }

  // La orden debe seguir libre y ser de su zona
  const { data: orden } = await supabase
    .from("ordenes")
    .select("id, codigo, estado, tecnico_id, averia:averias ( cliente:clientes ( zona_id ) )")
    .eq("id", ordenId)
    .maybeSingle();
  if (!orden) return { ok: false, error: "La orden no existe." };
  if (orden.estado !== "Pendiente" || orden.tecnico_id) {
    return { ok: false, error: "Esta orden ya fue tomada por otro técnico." };
  }

  const zonas = await zonasDelTecnico(supabase, tecnico.id);
  const zonaOrden = orden.averia?.cliente?.zona_id;
  if (!zonas.some((z) => z.zona_id === zonaOrden)) {
    return { ok: false, error: "Esta orden no es de tu zona de cobertura." };
  }

  // Toma atómica: solo se actualiza si sigue «Pendiente» y sin técnico
  const { data: filas, error } = await supabase
    .from("ordenes")
    .update({
      tecnico_id: tecnico.id,
      estado: "Asignada",
      fecha_asignacion: new Date().toISOString(),
    })
    .eq("id", orden.id)
    .eq("estado", "Pendiente")
    .is("tecnico_id", null)
    .select("id");

  if (error) {
    console.error("[disponibles] autoasignar", error.code, error.message);
    return { ok: false, error: "No se pudo asignar la orden. Intenta nuevamente." };
  }
  if (!filas || filas.length === 0) {
    return { ok: false, error: "Esta orden ya fue tomada por otro técnico." };
  }

  revalidatePath("/tecnico/disponibles");
  revalidatePath("/tecnico/mis-ordenes");
  return { ok: true, codigo: orden.codigo };
}
