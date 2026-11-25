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
  const { user } = await requireRol("gerente");
  if (!tecnicoId) return { ok: false, error: "No se indicó el técnico." };

  const nuevas = Array.from(new Set((Array.isArray(zonaIds) ? zonaIds : []).map(Number))).filter((n) => Number.isInteger(n));
  if (nuevas.length === 0) return { ok: false, error: "Asigna al menos una zona al técnico." };

  const supabase = await createClient();

  const { data: tecnico } = await supabase.from("tecnicos").select("id, nombre_completo").eq("id", tecnicoId).maybeSingle();
  if (!tecnico) return { ok: false, error: "El técnico no existe." };

  const { data: zonas } = await supabase.from("zonas").select("id, nombre");
  const nombrePorId = Object.fromEntries((zonas || []).map((z) => [z.id, z.nombre]));
  if (nuevas.some((id) => !nombrePorId[id])) return { ok: false, error: "Alguna de las zonas elegidas no existe." };

  const { data: actuales } = await supabase.from("tecnico_zonas").select("zona_id").eq("tecnico_id", tecnicoId);
  const previas = (actuales || []).map((z) => z.zona_id);

  const quitar = previas.filter((id) => !nuevas.includes(id));
  const agregar = nuevas.filter((id) => !previas.includes(id));
  if (quitar.length === 0 && agregar.length === 0) {
    return { ok: false, error: "No hay cambios para guardar. Modifica al menos una zona." };
  }

  if (quitar.length) {
    const { error } = await supabase.from("tecnico_zonas").delete().eq("tecnico_id", tecnicoId).in("zona_id", quitar);
    if (error) {
      console.error("[zonas] quitar", error.code, error.message);
      return { ok: false, error: "No se pudieron guardar las zonas. Intenta nuevamente." };
    }
  }
  if (agregar.length) {
    const { error } = await supabase
      .from("tecnico_zonas")
      .insert(agregar.map((zona_id) => ({ tecnico_id: tecnicoId, zona_id })));
    if (error) {
      console.error("[zonas] agregar", error.code, error.message);
      return { ok: false, error: "No se pudieron guardar las zonas. Revisa el resultado e intenta nuevamente." };
    }
  }

  // Historial del cambio (zona previa y nueva, con quién lo autorizó)
  const texto = (ids) => ids.map((id) => nombrePorId[id]).filter(Boolean).sort().join(", ") || null;
  const { error: errHist } = await supabase.from("historial_zonas").insert({
    tecnico_id: tecnicoId,
    zona_anterior: texto(previas),
    zona_nueva: texto(nuevas),
    autorizado_por: user.id,
  });
  if (errHist) console.error("[zonas] historial", errHist.code, errHist.message);

  revalidatePath("/gerente/zonas");
  revalidatePath("/gerente/tecnicos");
  revalidatePath("/tecnico/disponibles");
  return { ok: true, nombre: tecnico.nombre_completo };
}
