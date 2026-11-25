"use server";

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_LIMITE = 10; // igual que en supabase/12_funciones_capacidad.sql

// Las reglas de negocio de la base de datos llegan con el código P0001 y ya traen el mensaje
function mensajeDe(error) {
  return error.code === "P0001" ? error.message : MENSAJE_ERROR;
}

// Asocia un mensaje de la base de datos con el campo que corresponde
function campoDe(mensaje) {
  if (/DNI/.test(mensaje)) return "dni";
  if (/correo/i.test(mensaje)) return "correo";
  if (/tel[eé]fono/i.test(mensaje)) return "telefono";
  if (/nombre/i.test(mensaje)) return "nombre";
  return null;
}

// Lista de técnicos con su estado, si tienen cuenta de acceso y cuántas órdenes en curso tienen
export async function listarTecnicos() {
  await requireRol("gerente");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select(
      "id, nombre_completo, dni, telefono, correo, estado, max_ordenes, perfil_id, ordenes ( estado ), tecnico_zonas ( zona:zonas ( nombre ) )"
    )
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("[tecnicos] listar", error.code, error.message);
    return {
      ok: false,
      error: "No se pudo cargar la lista de técnicos. Intenta nuevamente.",
      reintentar: true,
    };
  }

  const tecnicos = (data || []).map(({ perfil_id, ordenes, max_ordenes, tecnico_zonas, ...t }) => {
    const ordenesActivas = (ordenes || []).filter((o) => o.estado === "Asignada" || o.estado === "En atención").length;
    return {
      ...t,
      cuentaVinculada: Boolean(perfil_id),
      zonas: (tecnico_zonas || []).map((z) => z.zona?.nombre).filter(Boolean),
      ordenesActivas,
      maxOrdenes: max_ordenes,
      cupo: Math.max(max_ordenes - ordenesActivas, 0),
      alLimite: ordenesActivas >= max_ordenes,
    };
  });

  const activos = tecnicos.filter((t) => t.estado === "Activo").length;

  return {
    ok: true,
    tecnicos,
    resumen: { total: tecnicos.length, activos, inactivos: tecnicos.length - activos },
  };
}

// Alta de un técnico: nombre completo, DNI, teléfono de contacto y correo institucional
export async function registrarTecnico({ nombre, dni, telefono, correo } = {}) {
  await requireRol("gerente");

  const datos = {
    nombre: String(nombre || "").trim(),
    dni: String(dni || "").trim(),
    telefono: String(telefono || "").trim(),
    correo: String(correo || "").trim().toLowerCase(),
  };

  const errores = {};
  if (!datos.nombre) errores.nombre = "El nombre completo es obligatorio.";

  if (!datos.dni) errores.dni = "El DNI es obligatorio.";
  else if (!/^[0-9]{8}$/.test(datos.dni)) errores.dni = "El DNI debe tener 8 dígitos.";

  if (!datos.telefono) errores.telefono = "El teléfono de contacto es obligatorio.";
  else if (!/^9[0-9]{8}$/.test(datos.telefono)) {
    errores.telefono = "El teléfono de contacto debe tener 9 dígitos y empezar con 9.";
  }

  if (!datos.correo) errores.correo = "El correo institucional es obligatorio.";
  else if (!EMAIL.test(datos.correo)) errores.correo = "El correo institucional no tiene un formato válido.";

  if (Object.keys(errores).length) {
    return { ok: false, error: "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_tecnico", {
    p_nombre: datos.nombre,
    p_dni: datos.dni,
    p_telefono: datos.telefono,
    p_correo: datos.correo,
  });

  if (error) {
    console.error("[tecnicos] registrar", error.code, error.message);
    const mensaje = mensajeDe(error);
    const campo = error.code === "P0001" ? campoDe(mensaje) : null;
    // DNI o correo repetidos: se marca el campo y también se muestra el mensaje
    return campo
      ? { ok: false, error: mensaje, errores: { [campo]: mensaje } }
      : { ok: false, error: mensaje };
  }

  return { ok: true, tecnico: data };
}

// Activar o desactivar a un técnico. «Inactivo» bloquea de inmediato la autoasignación de órdenes.
export async function cambiarEstadoTecnico(tecnicoId, estado) {
  await requireRol("gerente");

  if (typeof tecnicoId !== "string" || !UUID.test(tecnicoId)) {
    return { ok: false, error: "El técnico no existe." };
  }
  if (!["Activo", "Inactivo"].includes(estado)) {
    return { ok: false, error: "El estado debe ser «Activo» o «Inactivo»." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cambiar_estado_tecnico", {
    p_tecnico_id: tecnicoId,
    p_estado: estado,
  });

  if (error) {
    console.error("[tecnicos] estado", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }

  return {
    ok: true,
    tecnico: { id: data.id, nombre_completo: data.nombre_completo, estado: data.estado },
    cambio: data.cambio,
    ordenesActivas: data.ordenes_activas,
  };
}

// HU11 · Define cuántas órdenes «Asignada» o «En atención» puede tener a la vez un técnico (1 a 10)
export async function actualizarLimiteTecnico(tecnicoId, maxOrdenes) {
  await requireRol("gerente");

  if (typeof tecnicoId !== "string" || !UUID.test(tecnicoId)) {
    return { ok: false, error: "El técnico no existe." };
  }

  const limite = typeof maxOrdenes === "string" ? Number(maxOrdenes.trim() || NaN) : maxOrdenes;
  if (!Number.isInteger(limite) || limite < 1 || limite > MAX_LIMITE) {
    const mensaje = `El límite debe ser un número entero entre 1 y ${MAX_LIMITE}.`;
    return { ok: false, error: mensaje, errores: { maxOrdenes: mensaje } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("actualizar_limite_tecnico", {
    p_tecnico_id: tecnicoId,
    p_max: limite,
  });

  if (error) {
    console.error("[tecnicos] limite", error.code, error.message);
    const mensaje = mensajeDe(error);
    return error.code === "P0001" && /l[ií]mite debe ser/.test(mensaje)
      ? { ok: false, error: mensaje, errores: { maxOrdenes: mensaje } }
      : { ok: false, error: mensaje };
  }

  return {
    ok: true,
    tecnico: { id: data.id, nombre_completo: data.nombre_completo, maxOrdenes: data.max_ordenes },
    anterior: data.anterior,
    cambio: data.cambio,
    ordenesActivas: data.ordenes_activas,
    cupo: data.cupo,
    superaLimite: data.supera_limite,
  };
}
