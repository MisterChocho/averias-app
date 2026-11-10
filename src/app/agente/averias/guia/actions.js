"use server";

// HU04 · Guía de diagnóstico y solución (JOJO-65 frontend) — Sneider Araneda
//
// Acciones propias de la pantalla. Usan solo las tablas del esquema (averias, guias, guia_pasos).
// Si Luis ya tiene sus acciones de HU04, se pueden reemplazar estas por las suyas
// (la pantalla solo necesita: cargar, iniciar, guardar paso, finalizar y derivar).

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Datos de la guía para la avería indicada
export async function cargarGuia(averiaId) {
  await requireRol("agente");
  if (!averiaId) return { ok: false, error: "No se indicó la avería." };

  const supabase = await createClient();
  const { data: averia, error } = await supabase
    .from("averias")
    .select(`
      id, codigo, descripcion, estado, tipo_averia_id, ultimo_paso, inicio_diagnostico,
      tipo:tipos_averia ( nombre ),
      cliente:clientes ( nombre_completo, codigo )
    `)
    .eq("id", averiaId)
    .maybeSingle();

  if (error) {
    console.error("[guia] cargarGuia", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la avería. Intenta nuevamente." };
  }
  if (!averia) return { ok: false, error: "La avería no existe." };

  // La guía solo se habilita para averías «Reportada» (o «En diagnóstico» para retomarla)
  if (!["Reportada", "En diagnóstico"].includes(averia.estado)) {
    return {
      ok: false,
      error: `La guía solo se habilita para averías «Reportada». Esta avería está «${averia.estado}».`,
    };
  }

  // Solo se muestran guías activas del tipo de avería registrada
  const { data: guia, error: errGuia } = await supabase
    .from("guias")
    .select("id, titulo, guia_pasos ( orden, instruccion )")
    .eq("tipo_averia_id", averia.tipo_averia_id)
    .maybeSingle();

  if (errGuia) {
    console.error("[guia] guias", errGuia.code, errGuia.message);
    return { ok: false, error: "No se pudo cargar la guía. Intenta nuevamente." };
  }

  const pasos = (guia?.guia_pasos || []).slice().sort((a, b) => a.orden - b.orden);

  return {
    ok: true,
    averia: {
      id: averia.id,
      codigo: averia.codigo,
      descripcion: averia.descripcion,
      estado: averia.estado,
      tipo: averia.tipo?.nombre,
      cliente: averia.cliente?.nombre_completo,
      ultimoPaso: averia.ultimo_paso || 0,
    },
    guia: guia && pasos.length ? { titulo: guia.titulo, pasos } : null,
  };
}

// Al abrir la guía: «Reportada» -> «En diagnóstico» y se guarda la hora de inicio.
// Es segura si se llama dos veces: solo cambia averías que todavía están «Reportada».
export async function iniciarGuia(averiaId) {
  await requireRol("agente");
  const supabase = await createClient();

  const { error } = await supabase
    .from("averias")
    .update({
      estado: "En diagnóstico",
      inicio_diagnostico: new Date().toISOString(),
      ultimo_paso: 0,
    })
    .eq("id", averiaId)
    .eq("estado", "Reportada");

  if (error) {
    console.error("[guia] iniciarGuia", error.code, error.message);
    return { ok: false, error: "No se pudo iniciar el diagnóstico." };
  }
  return { ok: true };
}

// Guarda el último paso visto para retomar la guía si la llamada se corta
export async function guardarPaso(averiaId, paso) {
  await requireRol("agente");
  const supabase = await createClient();

  const { error } = await supabase
    .from("averias")
    .update({ ultimo_paso: Number(paso) || 0 })
    .eq("id", averiaId)
    .eq("estado", "En diagnóstico");

  if (error) {
    console.error("[guia] guardarPaso", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el avance." };
  }
  return { ok: true };
}

// El agente indica el resultado final: «Resuelta» o «No resuelta».
// Guarda fecha/hora de fin y el tiempo total de diagnóstico (segundos).
export async function finalizarGuia(averiaId, resultado) {
  await requireRol("agente");
  if (!["Resuelta", "No resuelta"].includes(resultado)) {
    return { ok: false, error: "Elige «Resuelta» o «No resuelta»." };
  }

  const supabase = await createClient();
  const { data: averia, error: errLeer } = await supabase
    .from("averias")
    .select("estado, inicio_diagnostico")
    .eq("id", averiaId)
    .maybeSingle();

  if (errLeer || !averia) return { ok: false, error: "No se pudo leer la avería." };
  if (averia.estado !== "En diagnóstico") {
    return { ok: false, error: "La avería ya no está «En diagnóstico»." };
  }

  const ahora = new Date();
  const inicio = averia.inicio_diagnostico ? new Date(averia.inicio_diagnostico) : ahora;
  const cambios = {
    estado: resultado,
    fin_diagnostico: ahora.toISOString(),
    tiempo_diagnostico_seg: Math.max(0, Math.round((ahora - inicio) / 1000)),
  };
  if (resultado === "Resuelta") cambios.fecha_resolucion = ahora.toISOString();

  const { error } = await supabase
    .from("averias")
    .update(cambios)
    .eq("id", averiaId)
    .eq("estado", "En diagnóstico");

  if (error) {
    console.error("[guia] finalizarGuia", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el resultado. Intenta nuevamente." };
  }
  return { ok: true, resultado };
}

// Si el tipo de avería no tiene guía: se deriva a técnico (la avería queda «No resuelta»)
export async function derivarATecnico(averiaId) {
  await requireRol("agente");
  const supabase = await createClient();

  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("averias")
    .update({ estado: "No resuelta", fin_diagnostico: ahora })
    .eq("id", averiaId)
    .in("estado", ["Reportada", "En diagnóstico"]);

  if (error) {
    console.error("[guia] derivarATecnico", error.code, error.message);
    return { ok: false, error: "No se pudo derivar la avería a un técnico." };
  }
  return { ok: true };
}
