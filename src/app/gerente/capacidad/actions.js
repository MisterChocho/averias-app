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
const MAXIMO = 10;

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

  // Backend de Luis y Jhosep: supabase/12_funciones_capacidad.sql
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("actualizar_limite_tecnico", {
    p_tecnico_id: tecnicoId,
    p_max: n,
  });
  if (error) {
    console.error("[capacidad] guardar", error.code, error.message);
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "No se pudo guardar el límite. Intenta nuevamente.",
    };
  }

  revalidatePath("/gerente/capacidad");
  revalidatePath("/gerente/tecnicos");
  revalidatePath("/tecnico/disponibles");
  return { ok: true, nombre: data.nombre_completo, limite: data.max_ordenes, superaLimite: data.supera_limite };
}
