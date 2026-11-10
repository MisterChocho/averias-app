"use server";

// HU05 · Registrar valoración del cliente (JOJO-72 frontend) — Sneider Araneda
//
// Usa la tabla `valoraciones` (una por avería, no editable ni eliminable por las políticas RLS).
// Nota: en el esquema la avería resuelta por teléfono tiene estado «Resuelta»
// (en Jira se llama «Resuelta en primer contacto»).

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function cargarParaValoracion(averiaId) {
  await requireRol("agente");
  if (!averiaId) return { ok: false, error: "No se indicó la avería." };

  const supabase = await createClient();
  const { data: averia, error } = await supabase
    .from("averias")
    .select(`
      id, codigo, descripcion, estado,
      tipo:tipos_averia ( nombre ),
      cliente:clientes ( nombre_completo ),
      valoraciones ( puntaje, no_desea, comentario, fecha )
    `)
    .eq("id", averiaId)
    .maybeSingle();

  if (error) {
    console.error("[valoracion] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la avería. Intenta nuevamente." };
  }
  if (!averia) return { ok: false, error: "La avería no existe." };

  const existente = Array.isArray(averia.valoraciones) ? averia.valoraciones[0] : averia.valoraciones;

  if (!existente && averia.estado !== "Resuelta") {
    return {
      ok: false,
      error: `La valoración solo se habilita para averías resueltas en primer contacto. Esta avería está «${averia.estado}».`,
    };
  }

  return {
    ok: true,
    averia: {
      id: averia.id,
      codigo: averia.codigo,
      descripcion: averia.descripcion,
      tipo: averia.tipo?.nombre,
      cliente: averia.cliente?.nombre_completo,
    },
    existente: existente || null, // si ya tiene valoración se muestra en solo lectura
  };
}

export async function registrarValoracion({ averiaId, puntaje, noDesea, comentario } = {}) {
  const { user } = await requireRol("agente");

  const errores = {};
  const coment = String(comentario || "").trim();
  const pje = noDesea ? null : Number(puntaje);

  if (!averiaId) errores.general = "No se indicó la avería.";
  if (!noDesea && !(Number.isInteger(pje) && pje >= 1 && pje <= 5)) {
    errores.puntaje = "Elige un puntaje del 1 al 5 o «El cliente no desea valorar».";
  }
  if (!noDesea && pje && pje <= 2 && !coment) {
    errores.comentario = "El comentario es obligatorio cuando el puntaje es 1 o 2.";
  }
  if (Object.keys(errores).length) {
    return { ok: false, error: "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();

  // Solo averías resueltas por teléfono
  const { data: averia } = await supabase
    .from("averias")
    .select("estado")
    .eq("id", averiaId)
    .maybeSingle();
  if (!averia || averia.estado !== "Resuelta") {
    return { ok: false, error: "Solo se puede valorar una avería resuelta en primer contacto." };
  }

  const { error } = await supabase.from("valoraciones").insert({
    averia_id: averiaId,
    puntaje: pje,
    no_desea: Boolean(noDesea),
    comentario: coment || null,
    agente_id: user.id, // queda asociada al agente; la fecha la pone la base de datos
  });

  if (error) {
    // 23505 = ya existe (averia_id es único): no se permite una segunda valoración
    if (error.code === "23505") return { ok: false, error: "Esta avería ya tiene una valoración registrada." };
    console.error("[valoracion] insertar", error.code, error.message);
    return { ok: false, error: "No se pudo guardar la valoración. Intenta nuevamente." };
  }
  return { ok: true };
}
