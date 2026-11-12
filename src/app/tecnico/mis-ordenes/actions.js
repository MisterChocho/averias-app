"use server";

// HU12 · Consultar mis órdenes (JOJO-94) y HU13 · Registrar atención (JOJO-95) — Sneider Araneda
//
// Usa las tablas del esquema (ordenes, atenciones, tecnicos). Las políticas RLS ya limitan al técnico
// a sus propias órdenes. Si Luis/Josep tienen sus acciones de HU12/HU13, se pueden reemplazar por estas.

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ESTADOS_VISIBLES = ["Asignada", "En atención"];

// Técnico activo del usuario actual (null si no está dado de alta o está inactivo)
async function tecnicoActual(supabase, userId) {
  const { data } = await supabase
    .from("tecnicos")
    .select("id, nombre_completo, estado")
    .eq("perfil_id", userId)
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------------
// HU12 · Órdenes asignadas al técnico (Asignada o En atención)
// ---------------------------------------------------------------------
export async function listarMisOrdenes() {
  const { user } = await requireRol("tecnico");
  const supabase = await createClient();

  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico) {
    return { ok: false, error: "Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta." };
  }
  if (tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico está inactiva. Pide al gerente que la active." };
  }

  const { data, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, direccion_atencion, telefono_contacto, horario_preferido, fecha_asignacion,
      averia:averias (
        codigo, descripcion,
        tipo:tipos_averia ( nombre ),
        cliente:clientes ( nombre_completo )
      )
    `)
    .eq("tecnico_id", tecnico.id)
    .in("estado", ESTADOS_VISIBLES)
    .order("fecha_asignacion", { ascending: true });

  if (error) {
    console.error("[mis-ordenes] listar", error.code, error.message);
    return { ok: false, error: "No se pudieron cargar tus órdenes. Intenta nuevamente." };
  }
  return { ok: true, tecnico: tecnico.nombre_completo, ordenes: data || [] };
}

// ---------------------------------------------------------------------
// HU13 · Datos de la orden para registrar la atención
// ---------------------------------------------------------------------
export async function cargarOrdenParaAtencion(ordenId) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  const { data: orden, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, tecnico_id, direccion_atencion, telefono_contacto, horario_preferido,
      averia:averias ( codigo, descripcion, tipo:tipos_averia ( nombre ), cliente:clientes ( nombre_completo ) ),
      atenciones ( diagnostico, solucion, fecha )
    `)
    .eq("id", ordenId)
    .maybeSingle();

  if (error) {
    console.error("[atencion] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la orden. Intenta nuevamente." };
  }
  if (!orden) return { ok: false, error: "La orden no existe." };

  // Solo órdenes asignadas a ese técnico
  if (orden.tecnico_id !== tecnico.id) {
    return { ok: false, error: "Solo puedes registrar la atención de órdenes asignadas a ti." };
  }
  if (!ESTADOS_VISIBLES.includes(orden.estado)) {
    return { ok: false, error: `Esta orden está «${orden.estado}» y ya no admite registrar atención.` };
  }

  return {
    ok: true,
    orden: {
      id: orden.id,
      codigo: orden.codigo,
      estado: orden.estado,
      direccion: orden.direccion_atencion,
      telefono: orden.telefono_contacto,
      horario: orden.horario_preferido,
      averia: orden.averia?.codigo,
      tipo: orden.averia?.tipo?.nombre,
      descripcion: orden.averia?.descripcion,
      cliente: orden.averia?.cliente?.nombre_completo,
    },
    atenciones: (orden.atenciones || []).slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
  };
}

// ---------------------------------------------------------------------
// HU13 · Registrar atención: guarda diagnóstico y solución y pasa la orden a «En atención»
// ---------------------------------------------------------------------
export async function registrarAtencion({ ordenId, diagnostico, solucion } = {}) {
  const { user } = await requireRol("tecnico");

  const diag = String(diagnostico || "").trim();
  const sol = String(solucion || "").trim();
  const errores = {};
  if (!ordenId) errores.general = "No se indicó la orden.";
  if (!diag) errores.diagnostico = "El diagnóstico es obligatorio.";
  if (!sol) errores.solucion = "La solución aplicada es obligatoria.";
  if (Object.keys(errores).length) return { ok: false, error: "Revisa los campos marcados.", errores };

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  // La orden debe ser de este técnico y estar Asignada o En atención
  const { data: orden } = await supabase
    .from("ordenes")
    .select("id, codigo, estado, tecnico_id")
    .eq("id", ordenId)
    .maybeSingle();
  if (!orden || orden.tecnico_id !== tecnico.id) {
    return { ok: false, error: "Solo puedes registrar la atención de órdenes asignadas a ti." };
  }
  if (!ESTADOS_VISIBLES.includes(orden.estado)) {
    return { ok: false, error: `Esta orden está «${orden.estado}» y ya no admite registrar atención.` };
  }

  // 1) Registro con autor (tecnico_id) y fecha/hora automática
  const { error: errAtencion } = await supabase.from("atenciones").insert({
    orden_id: orden.id,
    tecnico_id: tecnico.id,
    diagnostico: diag,
    solucion: sol,
  });
  if (errAtencion) {
    console.error("[atencion] insertar", errAtencion.code, errAtencion.message);
    return { ok: false, error: "No se pudo guardar la atención. Intenta nuevamente." };
  }

  // 2) La orden pasa a «En atención» (si ya lo estaba, no cambia)
  if (orden.estado !== "En atención") {
    const { error: errEstado } = await supabase
      .from("ordenes")
      .update({ estado: "En atención" })
      .eq("id", orden.id)
      .eq("tecnico_id", tecnico.id)
      .eq("estado", "Asignada");
    if (errEstado) {
      console.error("[atencion] estado", errEstado.code, errEstado.message);
      return {
        ok: false,
        error: "La atención se guardó, pero no se pudo cambiar la orden a «En atención». Avisa al gerente.",
      };
    }
  }

  revalidatePath("/tecnico/mis-ordenes");
  return { ok: true, codigo: orden.codigo, mensaje: `Atención de la orden ${orden.codigo} registrada correctamente.` };
}
