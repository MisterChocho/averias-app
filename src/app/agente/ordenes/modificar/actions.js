"use server";

// HU07 · Modificar orden (JOJO-79 frontend) — Sneider Araneda
//
// Solo se puede modificar una orden «Pendiente» o «Asignada». Campos editables:
// dirección de atención y teléfono de contacto. El estado y el código no cambian.
// Si la orden ya tiene técnico, se le deja una notificación con los cambios.

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MODIFICABLES = ["Pendiente", "Asignada"];
const TELEFONO_VALIDO = /^9[0-9]{8}$/;

export async function cargarOrdenParaModificar(ordenId) {
  await requireRol("agente");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const supabase = await createClient();
  const { data: orden, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, direccion_atencion, telefono_contacto, horario_preferido, tecnico_id,
      averia:averias ( codigo, descripcion, tipo:tipos_averia ( nombre ), cliente:clientes ( nombre_completo ) )
    `)
    .eq("id", ordenId)
    .maybeSingle();

  if (error) {
    console.error("[modificar] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la orden. Intenta nuevamente." };
  }
  if (!orden) return { ok: false, error: "La orden no existe." };

  return {
    ok: true,
    modificable: MODIFICABLES.includes(orden.estado),
    orden: {
      id: orden.id,
      codigo: orden.codigo,
      estado: orden.estado,
      direccion: orden.direccion_atencion,
      telefono: orden.telefono_contacto,
      horario: orden.horario_preferido,
      conTecnico: Boolean(orden.tecnico_id),
      averia: orden.averia?.codigo,
      tipo: orden.averia?.tipo?.nombre,
      descripcion: orden.averia?.descripcion,
      cliente: orden.averia?.cliente?.nombre_completo,
    },
  };
}

const norm = (s) => String(s || "").replace(/\s+/g, "");

export async function modificarOrden({ ordenId, direccion, telefono } = {}) {
  await requireRol("agente");

  const dir = String(direccion || "").trim();
  const tel = norm(telefono);

  if (!ordenId) return { ok: false, error: "No se indicó la orden." };
  if (!dir) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      errores: { direccion: "La dirección de atención es obligatoria." },
    };
  }

  const supabase = await createClient();
  const { data: actual, error: errLeer } = await supabase
    .from("ordenes")
    .select("id, codigo, estado, direccion_atencion, telefono_contacto, tecnico_id")
    .eq("id", ordenId)
    .maybeSingle();

  if (errLeer || !actual) return { ok: false, error: "No se pudo leer la orden." };
  if (!MODIFICABLES.includes(actual.estado)) {
    return { ok: false, error: "Esta orden ya no puede modificarse" };
  }

  // Comparar normalizando ambos lados
  const cambios = {};
  if (dir !== String(actual.direccion_atencion || "").trim()) cambios.direccion_atencion = dir;
  if (tel !== norm(actual.telefono_contacto)) cambios.telefono_contacto = tel;

  if (Object.keys(cambios).length === 0) {
    return { ok: false, error: "No hay cambios para guardar. Modifica al menos un dato." };
  }

  // El teléfono solo se valida si realmente cambió
  if (cambios.telefono_contacto && !TELEFONO_VALIDO.test(tel)) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      errores: { telefono: "El teléfono debe tener 9 dígitos y empezar con 9." },
    };
  }

  // Solo actualiza si sigue «Pendiente»/«Asignada» (por si cambió mientras se editaba)
  const { data: filas, error } = await supabase
    .from("ordenes")
    .update(cambios)
    .eq("id", ordenId)
    .in("estado", MODIFICABLES)
    .select("id");

  if (error) {
    console.error("[modificar] update", error.code, error.message);
    return { ok: false, error: "No se pudo guardar la modificación. La orden conserva sus datos." };
  }
  if (!filas || filas.length === 0) return { ok: false, error: "Esta orden ya no puede modificarse" };

  // Si ya tiene técnico asignado, se le notifica el cambio
  let notificado = false;
  if (actual.tecnico_id) {
    const detalle = [
      cambios.direccion_atencion ? `dirección: ${dir}` : null,
      cambios.telefono_contacto ? `teléfono: ${tel}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    const { error: errNotif } = await supabase.from("notificaciones").insert({
      tecnico_id: actual.tecnico_id,
      orden_id: actual.id,
      mensaje: `La orden ${actual.codigo} fue modificada (${detalle}).`,
    });
    if (errNotif) console.error("[modificar] notificar", errNotif.code, errNotif.message);
    else notificado = true;
  }

  revalidatePath("/agente/ordenes");
  return {
    ok: true,
    codigo: actual.codigo,
    notificado,
    mensaje: `Orden ${actual.codigo} modificada correctamente.`,
  };
}
