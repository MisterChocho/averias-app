"use server";

// Backend de la guía de diagnóstico
//   JOJO-64. HU04 - Consultar guía de diagnóstico y solución
//
// Cómo usarlo desde el frontend:
//   import { cargarGuia, iniciarGuia, guardarPaso, finalizarGuia, derivarATecnico } from "./actions";
//
//   1) Al abrir la pantalla: const d = await cargarGuia(averiaId);
//        !d.ok -> mostrar d.error (avería inexistente o no «Reportada» / «En diagnóstico»)
//        d.ok  -> d.averia = { id, codigo, descripcion, estado, tipo, cliente, ultimoPaso }
//                 d.guia   = { titulo, pasos: [{ orden, instruccion }] } ordenados, o null
//                 d.guia === null -> «No hay guía disponible para este tipo de avería»
//                                    y solo se permite derivarATecnico
//   2) Si hay guía y la avería está «Reportada»: await iniciarGuia(averiaId)
//        pasa a «En diagnóstico» y guarda la hora de inicio. Si ya estaba «En diagnóstico»
//        (llamada interrumpida) no cambia nada: se retoma en averia.ultimoPaso.
//   3) Al cambiar de paso: await guardarPaso(averiaId, numeroDePaso)
//   4) Al terminar: const r = await finalizarGuia(averiaId, "Resuelta" | "No resuelta")
//        r.ok -> r.resultado, r.tiempoSeg
//                r.redirigirA = "/agente/averias/valoracion?averia=<id>" (HU05) si fue «Resuelta»
//   5) Sin guía: const r = await derivarATecnico(averiaId)  -> la avería queda «No resuelta»
//
//   La guía es de solo lectura para el agente: aquí no se crea ni edita ninguna guía.
//   Las fechas, el estado y el tiempo de diagnóstico los pone la base de datos.

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Las reglas de negocio de la base de datos llegan con el código P0001 y ya traen el mensaje
function mensajeDe(error) {
  return error.code === "P0001" ? error.message : MENSAJE_ERROR;
}

function averiaValida(averiaId) {
  return typeof averiaId === "string" && UUID.test(averiaId);
}

// Datos de la avería y de su guía activa (no cambia ningún dato)
export async function cargarGuia(averiaId) {
  await requireRol("agente");
  if (!averiaId) return { ok: false, error: "No se indicó la avería." };
  if (!averiaValida(averiaId)) return { ok: false, error: "La avería no existe." };

  const supabase = await createClient();

  // Valida la avería y su estado, y trae solo la guía ACTIVA del tipo con los pasos en orden
  const { data: g, error } = await supabase.rpc("obtener_guia_averia", { p_averia_id: averiaId });
  if (error) {
    console.error("[guia] cargar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }

  // Datos para mostrar en el resumen de la pantalla
  const { data: averia, error: errAveria } = await supabase
    .from("averias")
    .select("descripcion, cliente:clientes ( nombre_completo )")
    .eq("id", averiaId)
    .maybeSingle();
  if (errAveria || !averia) {
    console.error("[guia] resumen", errAveria?.code, errAveria?.message);
    return { ok: false, error: MENSAJE_ERROR };
  }

  const pasos = g.guia?.pasos || [];

  return {
    ok: true,
    averia: {
      id: g.averia_id,
      codigo: g.codigo,
      descripcion: averia.descripcion,
      estado: g.estado,
      tipo: g.tipo,
      cliente: averia.cliente?.nombre_completo,
      ultimoPaso: g.ultimo_paso || 0,
    },
    guia: g.hay_guia && pasos.length ? { titulo: g.guia.titulo, pasos } : null,
  };
}

// Al abrir la guía: «Reportada» -> «En diagnóstico» y se guarda la hora de inicio.
// Es segura si se llama dos veces: una avería ya «En diagnóstico» conserva su hora de inicio.
export async function iniciarGuia(averiaId) {
  await requireRol("agente");
  if (!averiaValida(averiaId)) return { ok: false, error: "La avería no existe." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("iniciar_diagnostico", { p_averia_id: averiaId });

  if (error) {
    console.error("[guia] iniciar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }
  return {
    ok: true,
    estado: data.estado,
    ultimoPaso: data.ultimo_paso,
    inicioDiagnostico: data.inicio_diagnostico,
    hayGuia: data.hay_guia,
  };
}

// Guarda el paso actual para retomar la guía si la llamada se corta
export async function guardarPaso(averiaId, paso) {
  await requireRol("agente");
  if (!averiaValida(averiaId)) return { ok: false, error: "La avería no existe." };

  const numero = Number(paso);
  if (!Number.isInteger(numero) || numero < 1) {
    return { ok: false, error: "El paso indicado no es válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guardar_paso_diagnostico", {
    p_averia_id: averiaId,
    p_paso: numero,
  });

  if (error) {
    console.error("[guia] guardarPaso", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }
  return { ok: true, ultimoPaso: data };
}

// El agente indica el resultado final: «Resuelta» o «No resuelta».
// La base de datos guarda el fin del diagnóstico, la fecha de resolución (solo «Resuelta»)
// y el tiempo total de diagnóstico en segundos.
export async function finalizarGuia(averiaId, resultado) {
  await requireRol("agente");
  if (!averiaValida(averiaId)) return { ok: false, error: "La avería no existe." };
  if (!["Resuelta", "No resuelta"].includes(resultado)) {
    return { ok: false, error: "Elige «Resuelta» o «No resuelta»." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalizar_diagnostico", {
    p_averia_id: averiaId,
    p_resultado: resultado,
  });

  if (error) {
    console.error("[guia] finalizar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }
  return {
    ok: true,
    resultado: data.estado,
    tiempoSeg: data.tiempo_diagnostico_seg,
    // HU05: solo se redirige a la valoración cuando la avería quedó «Resuelta»
    redirigirA: data.habilita_valoracion ? `/agente/averias/valoracion?averia=${data.averia_id}` : null,
  };
}

// Si el tipo de avería no tiene guía activa: se deriva a técnico (la avería queda «No resuelta»)
export async function derivarATecnico(averiaId) {
  await requireRol("agente");
  if (!averiaValida(averiaId)) return { ok: false, error: "La avería no existe." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("derivar_a_tecnico", { p_averia_id: averiaId });

  if (error) {
    console.error("[guia] derivar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }
  return { ok: true, estado: data.estado };
}