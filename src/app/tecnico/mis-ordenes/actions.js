"use server";

// HU12 · Consultar mis órdenes (JOJO-94) y HU13 · Registrar atención (JOJO-95, JOJO-128) — Sneider Araneda
//
// Usa las tablas del esquema (ordenes, atenciones, tecnicos). Las políticas RLS ya limitan al técnico
// a sus propias órdenes. Si Luis/Josep tienen sus acciones de HU12/HU13, se pueden reemplazar por estas.

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ESTADOS_VISIBLES = ["Asignada", "En atención"];

// Técnico activo del usuario actual (null si no está dado de alta o está inactivo)
async function tecnicoActual(supabase, userId) {
  const { data } = await supabase
    .from("tecnicos")
    .select("id, nombre_completo, estado")
    .eq("perfil_id", userId)
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------------
// HU12 · Órdenes asignadas al técnico (Asignada o En atención)
// ---------------------------------------------------------------------
export async function listarMisOrdenes() {
  const { user } = await requireRol("tecnico");
  const supabase = await createClient();

  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico) {
    return { ok: false, error: "Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta." };
  }
  if (tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico está inactiva. Pide al gerente que la active." };
  }

  const { data, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, direccion_atencion, telefono_contacto, horario_preferido, fecha_asignacion,
      averia:averias (
        codigo, descripcion,
        tipo:tipos_averia ( nombre ),
        cliente:clientes ( nombre_completo )
      )
    `)
    .eq("tecnico_id", tecnico.id)
    .in("estado", ESTADOS_VISIBLES)
    .order("fecha_asignacion", { ascending: true });

  if (error) {
    console.error("[mis-ordenes] listar", error.code, error.message);
    return { ok: false, error: "No se pudieron cargar tus órdenes. Intenta nuevamente." };
  }
  return { ok: true, tecnico: tecnico.nombre_completo, ordenes: data || [] };
}

// ---------------------------------------------------------------------
// HU13 · Datos de la orden para registrar la atención
// ---------------------------------------------------------------------
export async function cargarOrdenParaAtencion(ordenId) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  const { data: orden, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, tecnico_id, direccion_atencion, telefono_contacto, horario_preferido,
      averia:averias ( codigo, descripcion, tipo:tipos_averia ( nombre ), cliente:clientes ( nombre_completo ) ),
      atenciones ( diagnostico, solucion, fecha )
    `)
    .eq("id", ordenId)
    .maybeSingle();

  if (error) {
    console.error("[atencion] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la orden. Intenta nuevamente." };
  }
  if (!orden) return { ok: false, error: "La orden no existe." };

  // Solo órdenes asignadas a ese técnico
  if (orden.tecnico_id !== tecnico.id) {
    return { ok: false, error: "Solo puedes registrar la atención de órdenes asignadas a ti." };
  }
  if (!ESTADOS_VISIBLES.includes(orden.estado)) {
    return { ok: false, error: `Esta orden está «${orden.estado}» y ya no admite registrar atención.` };
  }

  return {
    ok: true,
    orden: {
      id: orden.id,
      codigo: orden.codigo,
      estado: orden.estado,
      direccion: orden.direccion_atencion,
      telefono: orden.telefono_contacto,
      horario: orden.horario_preferido,
      averia: orden.averia?.codigo,
      tipo: orden.averia?.tipo?.nombre,
      descripcion: orden.averia?.descripcion,
      cliente: orden.averia?.cliente?.nombre_completo,
    },
    atenciones: (orden.atenciones || []).slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
  };
}

// ---------------------------------------------------------------------
// HU13 · Registrar atención: guarda diagnóstico y solución y pasa la orden a «En atención»
// ---------------------------------------------------------------------
const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registrarAtencion({ ordenId, diagnostico, solucion } = {}) {
  await requireRol("tecnico");

  const diag = String(diagnostico || "").trim();
  const sol = String(solucion || "").trim();
  const errores = {};
  if (!ordenId) errores.general = "No se indicó la orden.";
  else if (typeof ordenId !== "string" || !UUID.test(ordenId)) errores.general = "La orden no existe.";
  if (!diag) errores.diagnostico = "El diagnóstico es obligatorio.";
  if (!sol) errores.solucion = "La solución aplicada es obligatoria.";
  if (Object.keys(errores).length) {
    return { ok: false, error: errores.general || "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_atencion", {
    p_orden_id: ordenId,
    p_diagnostico: diag,
    p_solucion: sol,
  });

  if (error) {
    console.error("[atencion] registrar", error.code, error.message);
    // Las reglas de negocio de la base de datos llegan con el código P0001 y ya traen el mensaje
    return { ok: false, error: error.code === "P0001" ? error.message : MENSAJE_ERROR };
  }

  revalidatePath("/tecnico/mis-ordenes");
  return {
    ok: true,
    codigo: data.codigo,
    estado: data.estado,
    mensaje: `Atención de la orden ${data.codigo} registrada correctamente.`,
  };
}
// ---------------------------------------------------------------------
// HU14 · Cerrar orden (JOJO-134)
// ---------------------------------------------------------------------
const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function cargarOrdenParaCierre(ordenId) {
  const { user } = await requireRol("tecnico");
  if (!ordenId) return { ok: false, error: "No se indicó la orden." };
  if (typeof ordenId !== "string" || !UUID.test(ordenId)) {
    return { ok: false, error: "La orden no existe." };
  }

  const supabase = await createClient();
  const tecnico = await tecnicoActual(supabase, user.id);
  if (!tecnico || tecnico.estado !== "Activo") {
    return { ok: false, error: "Tu cuenta de técnico no está activa." };
  }

  const { data: orden, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, tecnico_id, direccion_atencion, telefono_contacto, horario_preferido,
      averia:averias ( codigo, descripcion, tipo:tipos_averia ( nombre ), cliente:clientes ( nombre_completo ) ),
      atenciones ( diagnostico, solucion, fecha )
    `)
    .eq("id", ordenId)
    .maybeSingle();

  if (error) {
    console.error("[cierre] cargar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la orden. Intenta nuevamente." };
  }
  if (!orden) return { ok: false, error: "La orden no existe." };

  if (orden.tecnico_id !== tecnico.id) {
    return { ok: false, error: "Solo puedes cerrar órdenes asignadas a ti." };
  }
  if (orden.estado === "Cerrada" || orden.estado === "Cancelada") {
    return { ok: false, error: `Esta orden ya está «${orden.estado}» y no se puede cerrar.` };
  }

  const atenciones = (orden.atenciones || [])
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (orden.estado !== "En atención" || atenciones.length === 0) {
    return { ok: false, error: "Debes registrar la atención antes de cerrar la orden." };
  }

  return {
    ok: true,
    orden: {
      id: orden.id,
      codigo: orden.codigo,
      estado: orden.estado,
      direccion: orden.direccion_atencion,
      telefono: orden.telefono_contacto,
      horario: orden.horario_preferido,
      averia: orden.averia?.codigo,
      tipo: orden.averia?.tipo?.nombre,
      descripcion: orden.averia?.descripcion,
      cliente: orden.averia?.cliente?.nombre_completo,
    },
    atenciones,
  };
}

// Recibe FormData con:
// - ordenId: string (UUID)
// - evidencias: uno o más archivos File (image/jpeg, image/png, image/webp, máx 5 MB)
export async function cerrarOrden(formData) {
  await requireRol("tecnico");

  const ordenId = String(formData?.get("ordenId") || "").trim();
  const archivos = (formData?.getAll("evidencias") || []).filter(
    (f) => f && typeof f === "object" && f.size > 0
  );

  const errores = {};
  if (!ordenId) errores.general = "No se indicó la orden.";
  else if (!UUID.test(ordenId)) errores.general = "La orden no existe.";

  if (archivos.length === 0) {
    errores.evidencias = "Adjunta al menos una fotografía como evidencia.";
  } else {
    for (const archivo of archivos) {
      if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
        errores.evidencias = "Solo se permiten fotografías en formato JPG, PNG o WEBP.";
        break;
      }
      if (archivo.size > TAMANO_MAX_BYTES) {
        errores.evidencias = "Cada fotografía debe pesar como máximo 5 MB.";
        break;
      }
    }
  }

  if (Object.keys(errores).length) {
    return { ok: false, error: errores.general || errores.evidencias, errores };
  }

  const supabase = await createClient();
  const rutasSubidas = [];

  // 1. Subir evidencias al bucket "evidencias"
  for (const archivo of archivos) {
    const ext = archivo.name?.split(".").pop()?.toLowerCase() || "jpg";
    const ruta = `${ordenId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await archivo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("evidencias")
      .upload(ruta, buffer, { contentType: archivo.type, upsert: false });

    if (uploadError) {
      console.error("[cierre] upload", uploadError.message);
      if (rutasSubidas.length) {
        await supabase.storage.from("evidencias").remove(rutasSubidas);
      }
      return { ok: false, error: "No se pudieron subir las fotografías. Intenta nuevamente." };
    }
    rutasSubidas.push(ruta);
  }

  // 2. Ejecutar RPC transaccional cerrar_orden
  const { data, error } = await supabase.rpc("cerrar_orden", {
    p_orden_id: ordenId,
    p_rutas: rutasSubidas,
  });

  if (error) {
    console.error("[cierre] cerrar_orden", error.code, error.message);
    // Limpiar archivos subidos si falló el cierre en BD
    await supabase.storage.from("evidencias").remove(rutasSubidas);
    return { ok: false, error: error.code === "P0001" ? error.message : MENSAJE_ERROR };
  }

  revalidatePath("/tecnico/mis-ordenes");
  return {
    ok: true,
    codigo: data.codigo,
    estado: data.estado,
    fecha_cierre: data.fecha_cierre,
    mensaje: `Orden ${data.codigo} cerrada correctamente.`,
  };
}