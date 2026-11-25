"use server";

// HU11 · Configurar límites de capacidad por técnico (JOJO-100 frontend) — Sneider Araneda
//
// Reglas (criterios de aceptación):
//  - El gerente define el máximo de órdenes «Asignada» o «En atención» por técnico.
//  - Al llegar a su límite, el técnico queda bloqueado para tomar nuevas órdenes hasta cerrar una
//    (el bloqueo lo aplica la pantalla «Órdenes disponibles», que compara contra max_ordenes).

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MINIMO = 1;
const MAXIMO = 20;

export async function listarCapacidad() {
  await requireRol("gerente");
  const supabase = await createClient();

  const { data: tecnicos, error } = await supabase
    .from("tecnicos")
    .select("id, nombre_completo, estado, max_ordenes")
    .order("nombre_completo", { ascending: true });
  if (error) {
    console.error("[capacidad] listar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la capacidad de los técnicos. Intenta nuevamente." };
  }

  const { data: activas } = await supabase
    .from("ordenes")
    .select("tecnico_id")
    .not("tecnico_id", "is", null)
    .in("estado", ["Asignada", "En atención"]);
  const carga = {};
  (activas || []).forEach((o) => {
    carga[o.tecnico_id] = (carga[o.tecnico_id] || 0) + 1;
  });

  return {
    ok: true,
    minimo: MINIMO,
    maximo: MAXIMO,
    tecnicos: (tecnicos || []).map((t) => ({
      id: t.id,
      nombre: t.nombre_completo,
      estado: t.estado,
      limite: t.max_ordenes,
      activas: carga[t.id] || 0,
    })),
  };
}

export async function guardarCapacidad({ tecnicoId, limite } = {}) {
  await requireRol("gerente");
  if (!tecnicoId) return { ok: false, error: "No se indicó el técnico." };

  const n = Number(limite);
  if (!Number.isInteger(n) || n < MINIMO || n > MAXIMO) {
    return { ok: false, error: `El límite debe ser un número entero entre ${MINIMO} y ${MAXIMO}.` };
  }

  const supabase = await createClient();
  const { data: filas, error } = await supabase
    .from("tecnicos")
    .update({ max_ordenes: n })
    .eq("id", tecnicoId)
    .select("nombre_completo");
  if (error) {
    console.error("[capacidad] guardar", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el límite. Intenta nuevamente." };
  }
  if (!filas || filas.length === 0) return { ok: false, error: "El técnico no existe." };

  revalidatePath("/gerente/capacidad");
  revalidatePath("/gerente/tecnicos");
  revalidatePath("/tecnico/disponibles");
  return { ok: true, nombre: filas[0].nombre_completo, limite: n };
}
