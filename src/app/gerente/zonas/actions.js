"use server";

// HU10 · Asignar zonas de cobertura geográfica (JOJO-99 frontend) — Sneider Araneda
//
// Reglas (criterios de aceptación):
//  - El gerente asigna una o varias zonas a un técnico y puede reasignarlas.
//  - El cambio tiene efecto inmediato: «Órdenes disponibles» lee tecnico_zonas en cada consulta.
//  - Cada cambio queda en el historial (fecha, zona previa, zona nueva y quién lo autorizó).

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function listarZonasYTecnicos() {
  await requireRol("gerente");
  const supabase = await createClient();

  const [zonasRes, tecnicosRes, historialRes] = await Promise.all([
    supabase.from("zonas").select("id, nombre").order("nombre", { ascending: true }),
    supabase
      .from("tecnicos")
      .select("id, nombre_completo, estado, tecnico_zonas ( zona_id )")
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("historial_zonas")
      .select("id, fecha, zona_anterior, zona_nueva, tecnico:tecnicos ( nombre_completo ), autor:perfiles ( nombre_completo )")
      .order("fecha", { ascending: false })
      .limit(30),
  ]);

  if (zonasRes.error || tecnicosRes.error) {
    console.error("[zonas] listar", zonasRes.error?.message, tecnicosRes.error?.message);
    return { ok: false, error: "No se pudieron cargar las zonas y los técnicos. Intenta nuevamente." };
  }
  if (historialRes.error) console.error("[zonas] historial", historialRes.error.code, historialRes.error.message);

  return {
    ok: true,
    zonas: zonasRes.data || [],
    tecnicos: (tecnicosRes.data || []).map((t) => ({
      id: t.id,
      nombre: t.nombre_completo,
      estado: t.estado,
      zonaIds: (t.tecnico_zonas || []).map((z) => z.zona_id),
    })),
    historial: historialRes.data || [],
  };
}

export async function guardarZonas({ tecnicoId, zonaIds } = {}) {
  await requireRol("gerente");
  if (!tecnicoId) return { ok: false, error: "No se indicó el técnico." };

  const nuevas = Array.from(new Set((Array.isArray(zonaIds) ? zonaIds : []).map(Number))).filter((n) => Number.isInteger(n));
  if (nuevas.length === 0) return { ok: false, error: "Asigna al menos una zona al técnico." };

  // Backend de Luis y Jhosep: supabase/13_funciones_zonas.sql
  // La función quita y agrega zonas, guarda el historial (con el gerente que autoriza) y avisa
  // cuántas órdenes activas del técnico quedaron fuera de sus zonas.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("asignar_zonas_tecnico", {
    p_tecnico_id: tecnicoId,
    p_zonas: nuevas,
  });
  if (error) {
    console.error("[zonas] guardar", error.code, error.message);
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "No se pudieron guardar las zonas. Intenta nuevamente.",
    };
  }

  revalidatePath("/gerente/zonas");
  revalidatePath("/gerente/tecnicos");
  revalidatePath("/tecnico/disponibles");
  return { ok: true, nombre: data.nombre_completo, cambio: data.cambio, fuera: data.ordenes_fuera_de_zona };
}
