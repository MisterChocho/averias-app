"use server";

// JOJO-71. HU05 - Registrar valoración del cliente

import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENSAJE_ERROR = "No se pudo completar la operación. Intenta nuevamente.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMENTARIO = 500;
const MAX_VALORADAS = 20;
const MAX_PENDIENTES = 200;

const CLIENTE = "cliente:clientes ( codigo, nombre_completo, documento, telefono )";

// Las reglas de negocio de la base de datos llegan con el código P0001 y ya traen el mensaje
function mensajeDe(error) {
  return error.code === "P0001" ? error.message : MENSAJE_ERROR;
}

function unico(relacion) {
  return Array.isArray(relacion) ? relacion[0] : relacion;
}

function tiene(relacion) {
  return Array.isArray(relacion) ? relacion.length > 0 : Boolean(relacion);
}

// Listas de la pantalla: pendientes de valorar y ya valoradas
export async function listarAveriasResueltas() {
  await requireRol("agente");
  const supabase = await createClient();

  // Pendientes: «Resuelta», sin orden de técnico y sin valoración
  const pendientesQ = supabase
    .from("averias")
    .select(`
      id, codigo, descripcion, fecha_resolucion,
      tipo:tipos_averia ( nombre ),
      ${CLIENTE},
      valoraciones ( id ),
      ordenes ( id )
    `)
    .eq("estado", "Resuelta")
    .order("fecha_resolucion", { ascending: false, nullsFirst: false })
    .limit(MAX_PENDIENTES);

  // Ya valoradas: las últimas, solo lectura
  const valoradasQ = supabase
    .from("valoraciones")
    .select(`
      puntaje, no_desea, comentario, fecha,
      averia:averias (
        id, codigo, descripcion, fecha_resolucion,
        tipo:tipos_averia ( nombre ),
        ${CLIENTE}
      )
    `)
    .order("fecha", { ascending: false })
    .limit(MAX_VALORADAS);

  const [p, v] = await Promise.all([pendientesQ, valoradasQ]);

  if (p.error || v.error) {
    const e = p.error || v.error;
    console.error("[valoracion] listar", e.code, e.message);
    return {
      ok: false,
      error: "No se pudo cargar las averías resueltas. Intenta nuevamente.",
      reintentar: true,
    };
  }

  const pendientes = (p.data || [])
    .filter((a) => !tiene(a.valoraciones) && !tiene(a.ordenes))
    .map(({ valoraciones, ordenes, ...averia }) => averia);

  const valoradas = (v.data || [])
    .filter((x) => x.averia)
    .map(({ averia, ...valoracion }) => ({ ...averia, valoracion }));

  return { ok: true, pendientes, valoradas };
}

// Datos de una avería para valorarla. Si ya tiene valoración se devuelve para mostrarla en solo lectura.
export async function cargarParaValoracion(averiaId) {
  await requireRol("agente");
  if (!averiaId) return { ok: false, error: "No se indicó la avería." };
  if (typeof averiaId !== "string" || !UUID.test(averiaId)) {
    return { ok: false, error: "La avería no existe." };
  }

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

  const existente = unico(averia.valoraciones) || null;

  if (!existente) {
    if (averia.estado !== "Resuelta") {
      return {
        ok: false,
        error: `La valoración solo se habilita para averías resueltas en primer contacto. Esta avería está «${averia.estado}».`,
      };
    }

    // Una avería «Resuelta» por un técnico (tiene orden) no es de primer contacto
    const { data: primerContacto, error: errPC } = await supabase.rpc("es_primer_contacto", {
      p_averia_id: averiaId,
    });
    if (errPC) {
      console.error("[valoracion] primer contacto", errPC.code, errPC.message);
      return { ok: false, error: "No se pudo cargar la avería. Intenta nuevamente." };
    }
    if (!primerContacto) {
      return {
        ok: false,
        error: "Esta avería no se resolvió en primer contacto: tuvo una orden de técnico.",
      };
    }
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
    existente, // si ya tiene valoración se muestra en solo lectura
  };
}

// Guarda la valoración. El frontend pide la confirmación antes de llamar a esta función.
export async function registrarValoracion({ averiaId, puntaje, noDesea, comentario } = {}) {
  await requireRol("agente");

  const errores = {};
  const coment = String(comentario || "").trim();
  const pje = noDesea ? null : Number(puntaje);

  if (!averiaId) errores.general = "No se indicó la avería.";
  else if (typeof averiaId !== "string" || !UUID.test(averiaId)) errores.general = "La avería no existe.";

  if (!noDesea && !(Number.isInteger(pje) && pje >= 1 && pje <= 5)) {
    errores.puntaje = "Elige un puntaje del 1 al 5 o «El cliente no desea valorar».";
  }
  if (!noDesea && pje && pje <= 2 && !coment) {
    errores.comentario = "El comentario es obligatorio cuando el puntaje es 1 o 2.";
  }
  if (coment.length > MAX_COMENTARIO) {
    errores.comentario = `El comentario no puede superar los ${MAX_COMENTARIO} caracteres.`;
  }
  if (Object.keys(errores).length) {
    return { ok: false, error: errores.general || "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_valoracion", {
    p_averia_id: averiaId,
    p_puntaje: pje,
    p_no_desea: Boolean(noDesea),
    p_comentario: coment || null,
  });

  if (error) {
    console.error("[valoracion] registrar", error.code, error.message);
    return { ok: false, error: mensajeDe(error) };
  }

  return {
    ok: true,
    codigo: data.codigo,
    valoracion: {
      puntaje: data.puntaje,
      no_desea: data.no_desea,
      comentario: data.comentario,
      fecha: data.fecha,
    },
  };
}