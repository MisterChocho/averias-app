"use server";

// Backend de órdenes de avería
//   JOJO-49 · HU06 Registrar orden de avería  (Sneider Araneda)
//   JOJO-85 · HU08 Cancelar orden             (Sneider Araneda)
//
// Cómo usarlo desde el frontend (HU06: Luis · HU08: Josep):
//
//   import { obtenerDatosParaOrden, registrarOrden, cancelarOrden } from "./actions";
//
//   const datos = await obtenerDatosParaOrden(averiaId);       // precargar el formulario
//   const r1 = await registrarOrden({ averiaId, direccion, telefono, horario });
//   const r2 = await cancelarOrden({ ordenId, motivo });
//
//   Todas devuelven { ok: true, ... } o { ok: false, error: "mensaje para mostrar" }.
//   La confirmación ("¿Seguro que deseas cancelar?") la pide el frontend antes de llamar.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const ESTADOS_ACTIVOS = ["Pendiente", "Asignada", "En atención"];
const TELEFONO_VALIDO = /^9[0-9]{8}$/;

// Convierte los errores de Supabase/PostgreSQL en un mensaje entendible
function mensajeDeError(error, porDefecto) {
  if (!error) return porDefecto;
  // Los mensajes de las funciones SQL (raise exception) ya están en español
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23505") return "Esta avería ya tiene una orden activa.";
  if (error.code === "42501") return "No tienes permiso para realizar esta acción.";
  console.error("[ordenes]", error.code, error.message);
  return porDefecto;
}

// ---------------------------------------------------------------------
// HU06 · Datos para precargar el formulario de la orden
// Devuelve la avería con su cliente, tipo y descripción (no editables)
// y la dirección/teléfono del cliente como valores por defecto.
// ---------------------------------------------------------------------
export async function obtenerDatosParaOrden(averiaId) {
  await requireRol("agente");
  if (!averiaId) return { ok: false, error: "No se indicó la avería." };

  const supabase = await createClient();
  const { data: averia, error } = await supabase
    .from("averias")
    .select(`
      id, codigo, descripcion, estado,
      tipo:tipos_averia ( nombre ),
      cliente:clientes ( id, codigo, nombre_completo, documento, telefono, direccion ),
      ordenes ( codigo, estado )
    `)
    .eq("id", averiaId)
    .maybeSingle();

  if (error) return { ok: false, error: mensajeDeError(error, "No se pudo cargar la avería.") };
  if (!averia) return { ok: false, error: "La avería no existe." };

  const ordenActiva = (averia.ordenes || []).find((o) => ESTADOS_ACTIVOS.includes(o.estado));

  return {
    ok: true,
    // Se puede generar la orden solo si la avería está "No resuelta" y no tiene otra activa
    puedeGenerar: averia.estado === "No resuelta" && !ordenActiva,
    motivoBloqueo:
      averia.estado !== "No resuelta"
        ? `La avería está en estado "${averia.estado}". Solo se generan órdenes desde averías "No resuelta".`
        : ordenActiva
          ? `Esta avería ya tiene una orden activa (${ordenActiva.codigo}).`
          : null,
    averia: {
      id: averia.id,
      codigo: averia.codigo,
      tipo: averia.tipo?.nombre,
      descripcion: averia.descripcion,
      estado: averia.estado,
    },
    cliente: averia.cliente,
    // Valores por defecto editables del formulario
    valoresIniciales: {
      direccion: averia.cliente?.direccion || "",
      telefono: averia.cliente?.telefono || "",
      horario: "",
    },
  };
}

// ---------------------------------------------------------------------
// HU06 · Registrar orden de avería
// ---------------------------------------------------------------------
export async function registrarOrden({ averiaId, direccion, telefono, horario } = {}) {
  await requireRol("agente");

  const dir = String(direccion || "").trim();
  const tel = String(telefono || "").replace(/\s+/g, "");

  // Validaciones rápidas (la base de datos vuelve a validarlas)
  const errores = {};
  if (!averiaId) errores.averia = "Selecciona una avería.";
  if (!dir) errores.direccion = "La dirección de atención es obligatoria.";
  if (!TELEFONO_VALIDO.test(tel)) errores.telefono = "El teléfono debe tener 9 dígitos y empezar con 9.";
  if (Object.keys(errores).length) {
    return { ok: false, error: "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();
  const { data: codigo, error } = await supabase.rpc("registrar_orden", {
    p_averia_id: averiaId,
    p_direccion: dir,
    p_telefono: tel,
    p_horario: horario ? String(horario).trim() : null,
  });

  if (error) return { ok: false, error: mensajeDeError(error, "No se pudo registrar la orden.") };

  revalidatePath("/agente/ordenes");
  return { ok: true, codigo, mensaje: `Orden ${codigo} registrada correctamente.` };
}

// ---------------------------------------------------------------------
// HU08 · Cancelar orden
// ---------------------------------------------------------------------
export async function cancelarOrden({ ordenId, motivo } = {}) {
  await requireRol("agente");

  const mot = String(motivo || "").trim();
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };
  if (!mot) {
    return {
      ok: false,
      error: "El motivo de la cancelación es obligatorio.",
      errores: { motivo: "El motivo de la cancelación es obligatorio." },
    };
  }

  const supabase = await createClient();
  const { data: codigo, error } = await supabase.rpc("cancelar_orden", {
    p_orden_id: ordenId,
    p_motivo: mot,
  });

  // Si falla, la función SQL no guardó nada: la orden conserva su estado anterior
  if (error) {
    return {
      ok: false,
      error: mensajeDeError(error, "No fue posible completar la operación. La orden conserva su estado anterior."),
    };
  }

  revalidatePath("/agente/ordenes");
  return { ok: true, codigo, mensaje: `Orden ${codigo} cancelada correctamente.` };
}
