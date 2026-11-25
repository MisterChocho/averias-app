"use server";

// HU14 · Cerrar orden (JOJO-97 frontend) — Sneider Araneda
//
// Reglas (criterios de aceptación):
//  - Solo se cierran órdenes del técnico que ya tengan la atención registrada.
//  - Se necesita al menos una fotografía como evidencia (el archivo se sube al bucket «evidencias»
//    desde el navegador; aquí solo se registra su ruta).
//  - Al cerrar, la orden pasa a «Cerrada» y se guarda la fecha y hora de cierre.

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function tecnicoActual(supabase, userId) {
  const { data } = await supabase
    .from("tecnicos")
    .select("id, estado")
    .eq("perfil_id", userId)
    .maybeSingle();
  return data;
}

// Valida que la orden sea del técnico, esté «En atención» y tenga atención registrada
async function validarOrden(supabase, tecnico, ordenId) {
  const { data: orden, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, tecnico_id, direccion_atencion,
      averia:averias ( codigo, descripcion, tipo:tipos_averia ( nombre ), cliente:clientes ( nombre_completo ) ),
      atenciones ( diagnostico, solucion, fecha )
    `)
    .eq("id", ordenId)
    .maybeSingle();

  if (error) {
    console.error("[cerrar] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la orden. Intenta nuevamente." };
  }
  if (!orden) return { ok: false, error: "La orden no existe." };
  if (orden.tecnico_id !== tecnico.id) {
    return { ok: false, error: "Solo puedes cerrar órdenes asignadas a ti." };
  }
  if (orden.estado === "Cerrada") return { ok: false, error: "Esta orden ya está cerrada." };
  if (orden.estado !== "En atención" || !orden.atenciones || orden.atenciones.length === 0) {
    return { ok: false, error: "Primero registra la atención de la orden para poder cerrarla." };
  }
  return { ok: true, orden };
}

// ---------------------------------------------------------------------
// Datos de la orden para la pantalla de cierre
// ---------------------------------------------------------------------
export async function cargarOrdenParaCierre(ordenId) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  const r = await validarOrden(supabase, tecnico, ordenId);
  if (!r.ok) return r;
  const o = r.orden;
  return {
    ok: true,
    orden: {
      id: o.id,
      codigo: o.codigo,
      estado: o.estado,
      direccion: o.direccion_atencion,
      averia: o.averia?.codigo,
      tipo: o.averia?.tipo?.nombre,
      descripcion: o.averia?.descripcion,
      cliente: o.averia?.cliente?.nombre_completo,
    },
    atenciones: o.atenciones.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
  };
}

// ---------------------------------------------------------------------
// Cerrar la orden: registra las evidencias y pasa la orden a «Cerrada»
// ---------------------------------------------------------------------
export async function cerrarOrden({ ordenId, rutas } = {}) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const lista = Array.isArray(rutas) ? rutas.filter((r) => typeof r === "string" && r.trim()) : [];
  if (lista.length === 0) return { ok: false, error: "Adjunta al menos una fotografía como evidencia." };
  // Las fotos deben estar en la carpeta de esta orden dentro del bucket
  if (lista.some((r) => !r.startsWith(`${ordenId}/`) || r.includes(".."))) {
    return { ok: false, error: "Las fotografías no corresponden a esta orden." };
  }

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  const r = await validarOrden(supabase, tecnico, ordenId);
  if (!r.ok) return r;
  const orden = r.orden;

  // 1) Registro de las evidencias
  const { error: errEv } = await supabase
    .from("evidencias")
    .insert(lista.map((ruta) => ({ orden_id: orden.id, ruta, subido_por: user.id })));
  if (errEv) {
    console.error("[cerrar] evidencias", errEv.code, errEv.message);
    return { ok: false, error: "No se pudieron registrar las fotografías. La orden sigue abierta." };
  }

  // 2) Cierre con fecha y hora (solo si sigue «En atención»)
  const { data: filas, error: errCierre } = await supabase
    .from("ordenes")
    .update({ estado: "Cerrada", fecha_cierre: new Date().toISOString() })
    .eq("id", orden.id)
    .eq("tecnico_id", tecnico.id)
    .eq("estado", "En atención")
    .select("id");
  if (errCierre || !filas || filas.length === 0) {
    if (errCierre) console.error("[cerrar] cierre", errCierre.code, errCierre.message);
    return { ok: false, error: "No se pudo cerrar la orden. Intenta nuevamente." };
  }

  revalidatePath("/tecnico/mis-ordenes");
  revalidatePath("/tecnico/disponibles");
  return { ok: true, codigo: orden.codigo };
}
