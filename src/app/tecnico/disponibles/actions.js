"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Las reglas de negocio de la base de datos llegan con el código P0001 y ya traen el mensaje
function mensajeDe(error) {
  return error.code === "P0001" ? error.message : MENSAJE_ERROR;
}

// Órdenes «Pendiente» de la zona del técnico y su cupo de órdenes activas
export async function listarOrdenesDisponibles() {
  await requireRol("tecnico");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_ordenes_disponibles");

  if (error) {
    console.error("[disponibles] listar", error.code, error.message);
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "No se pudieron cargar las órdenes disponibles. Intenta nuevamente.",
      reintentar: error.code !== "P0001",
    };
  }

  const t = data.tecnico;
  return {
    ok: true,
    tecnico: {
      nombre: t.nombre_completo,
      maxOrdenes: t.max_ordenes,
      ordenesActivas: t.ordenes_activas,
      puedeAutoasignarse: t.puede_autoasignarse,
    },
    ordenes: (data.ordenes || []).map((o) => ({
      id: o.id,
      codigo: o.codigo,
      direccion: o.direccion_atencion,
      telefono: o.telefono_contacto,
      horario: o.horario_preferido,
      fechaRegistro: o.fecha_registro,
      averia: o.averia_codigo,
      tipo: o.tipo,
      descripcion: o.descripcion,
      zona: o.zona,
      cliente: o.cliente,
    })),
  };
}

// El técnico se asigna una orden «Pendiente» de su zona
export async function autoasignarOrden(ordenId) {
  await requireRol("tecnico");

  if (typeof ordenId !== "string" || !UUID.test(ordenId)) {
    return { ok: false, error: "La orden no existe." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("autoasignar_orden", { p_orden_id: ordenId });

  if (error) {
    console.error("[disponibles] autoasignar", error.code, error.message);
    const mensaje = mensajeDe(error);
    return {
      ok: false,
      error: mensaje,
      // Otro técnico la tomó o ya no está pendiente: la lista en pantalla quedó desactualizada
      recargar: /ya no está disponible/.test(mensaje),
    };
  }

  revalidatePath("/tecnico/disponibles");
  revalidatePath("/tecnico/mis-ordenes");

  return {
    ok: true,
    codigo: data.codigo,
    ordenesActivas: data.ordenes_activas,
    maximo: data.max_ordenes,
    mensaje: `Orden ${data.codigo} asignada. La encuentras en «Mis órdenes».`,
  };
}
