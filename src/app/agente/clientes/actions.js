"use server";

// Backend de clientes
//   JOJO-34. HU01 - Listar clientes
//
// Cómo usarlo desde el frontend:
//
//   import { listarClientes } from "./actions";
//
//   const r = await listarClientes();
//   if (!r.ok)  -> mostrar r.error y un botón "Reintentar" (volver a llamar listarClientes)
//   if (r.vacio) -> mostrar r.mensaje ("No hay clientes registrados")
//   else         -> r.clientes = [{ id, codigo, nombre_completo, documento, telefono }]
//
//   Al seleccionar un cliente, el frontend usa su id para continuar con la atención.
//   La lista es de solo lectura: este archivo solo hace consultas (select).

import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const MENSAJE_VACIO = "No hay clientes registrados";
const MENSAJE_ERROR = "No se pudo cargar la lista de clientes. Intenta nuevamente.";

// ---------------------------------------------------------------------
// HU01 - Listar clientes
// Devuelve nombre completo, DNI/RUC, teléfono y código de cada cliente,
// ordenados por nombre. Solo lectura.
// ---------------------------------------------------------------------
export async function listarClientes() {
  await requireRol("agente");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, codigo, nombre_completo, documento, telefono")
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("[clientes]", error.code, error.message);
    return { ok: false, error: MENSAJE_ERROR, reintentar: true };
  }

  const clientes = data || [];
  if (clientes.length === 0) {
    return { ok: true, clientes: [], vacio: true, mensaje: MENSAJE_VACIO };
  }

  return { ok: true, clientes, vacio: false };
}