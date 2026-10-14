"use server";

// Backend de averías
//   JOJO-44. HU03 - Registrar avería reportada
//
// Cómo usarlo desde el frontend:
//
//   import { listarTiposAveria, buscarDuplicada, registrarAveria } from "./actions";
//
//   1) Al cargar la pantalla: const t = await listarTiposAveria();
//        t.ok -> t.tipos = [{ id, nombre, requiere_tecnico }]   (llenar el combo)
//   2) Al elegir cliente + tipo: const d = await buscarDuplicada(clienteId, tipoId);
//        d.duplicada -> mostrar alerta con d.averia.codigo y d.averia.estado
//   3) Al confirmar el guardado: const r = await registrarAveria({ clienteId, tipoId, descripcion });
//        !r.ok y r.errores -> resaltar campos: r.errores.cliente / .tipo / .descripcion
//        !r.ok y r.error   -> mostrar el mensaje
//        r.ok -> r.averia = { id, codigo, estado, habilita_guia, habilita_orden }
//                habilita_guia  -> mostrar botón "Guía de diagnóstico" (HU04)
//                habilita_orden -> mostrar botón "Generar orden" (HU06)
//
//   El código, la fecha, el agente y el estado inicial los pone el servidor:
//   el frontend no los envía.

import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";

function mensajeDe(error) {
  return error.code === "P0001" ? error.message : MENSAJE_ERROR;
}

export async function listarTiposAveria() {
  await requireRol("agente");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipos_averia")
    .select("id, nombre, requiere_tecnico")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[averias] tipos", error.code, error.message);
    return { ok: false, error: MENSAJE_ERROR, reintentar: true };
  }
  return { ok: true, tipos: data || [] };
}

export async function buscarDuplicada(clienteId, tipoId) {
  await requireRol("agente");
  if (!clienteId || !tipoId) return { ok: true, duplicada: false, averia: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("averia_abierta_duplicada", {
    p_cliente_id: clienteId,
    p_tipo_id: Number(tipoId),
  });

  if (error) {
    console.error("[averias] duplicada", error.code, error.message);
    return { ok: false, error: MENSAJE_ERROR };
  }

  const averia = data?.[0] ?? null;
  return { ok: true, duplicada: !!averia, averia };
}

export async function registrarAveria({ clienteId, tipoId, descripcion }) {
  await requireRol("agente");

  const errores = {};
  if (!clienteId) errores.cliente = "Seleccione un cliente";
  if (!tipoId) errores.tipo = "El tipo de avería es obligatorio";
  if (!descripcion || !descripcion.trim())
    errores.descripcion = "La descripción es obligatoria";
  if (Object.keys(errores).length) return { ok: false, errores };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_averia", {
    p_cliente_id: clienteId,
    p_tipo_id: Number(tipoId),
    p_descripcion: descripcion,
  });

  if (error) {
    console.error("[averias] registrar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }
  return { ok: true, averia: data };
}