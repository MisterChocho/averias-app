"use server";

// Backend de técnicos
//   JOJO-104. HU09 - Administrar estado operativo del técnico
//
// Cómo usarlo desde el frontend:
//
//   import { listarTecnicos, registrarTecnico, cambiarEstadoTecnico } from "./actions";
//
//   1) Al cargar la pantalla: const l = await listarTecnicos();
//        !l.ok -> mostrar l.error (y el botón Reintentar si l.reintentar)
//        l.ok  -> l.tecnicos = [{ id, nombre_completo, dni, telefono, correo, estado,
//                                 cuentaVinculada, ordenesActivas }]
//                 l.resumen  = { total, activos, inactivos }
//   2) Al guardar el alta: const r = await registrarTecnico({ nombre, dni, telefono, correo });
//        !r.ok y r.errores -> resaltar campos: r.errores.nombre / .dni / .telefono / .correo
//        !r.ok y r.error   -> mostrar el mensaje
//        r.ok -> r.tecnico = { id, nombre_completo, dni, telefono, correo, estado, cuenta_vinculada }
//                el técnico siempre queda «Activo»
//                cuenta_vinculada = false -> aún no tiene cuenta de acceso con ese correo (ver nota)
//   3) Al activar o desactivar: const r = await cambiarEstadoTecnico(tecnicoId, "Inactivo" | "Activo");
//        !r.ok -> mostrar r.error
//        r.ok  -> r.tecnico = { id, nombre_completo, estado }, r.cambio (false si ya tenía ese estado)
//                 r.ordenesActivas = órdenes «Asignada» o «En atención» que conserva: si es mayor que 0
//                 al desactivar, avisar al gerente que debe revisarlas.
//                 Pedir confirmación en pantalla ANTES de desactivar.
//
//   Un técnico no se elimina: se desactiva. Con «Inactivo» pierde de inmediato la autoasignación
//   de órdenes y nadie puede asignarle órdenes nuevas (lo garantiza la base de datos).
//
// Nota sobre la cuenta de acceso: el técnico entra con una cuenta de Supabase Authentication cuyo
// correo es el mismo que se registró aquí. Esa cuenta se crea en Authentication > Users y se le da
// el rol «tecnico» (como se hace con los usuarios de prueba de 03_datos_prueba.sql). En cuanto la
// cuenta y el técnico coinciden por correo, la base de datos los vincula sola, en cualquier orden.
// Este backend no crea cuentas porque eso exigiría la clave de servicio de Supabase en el servidor.

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
    .select("id, nombre_completo, dni, telefono, correo, estado, perfil_id, ordenes ( estado )")
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("[tecnicos] listar", error.code, error.message);
    return {
      ok: false,
      error: "No se pudo cargar la lista de técnicos. Intenta nuevamente.",
      reintentar: true,
    };
  }

  const tecnicos = (data || []).map(({ perfil_id, ordenes, ...t }) => ({
    ...t,
    cuentaVinculada: Boolean(perfil_id),
    ordenesActivas: (ordenes || []).filter((o) => o.estado === "Asignada" || o.estado === "En atención").length,
  }));

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