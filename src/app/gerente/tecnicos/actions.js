"use server";

// HU09 · Administrar estado operativo del técnico (JOJO-98 frontend) — Sneider Araneda
//
// Reglas (criterios de aceptación):
//  - El gerente debe estar autenticado.
//  - Obligatorios: nombre completo, DNI, teléfono de contacto y correo institucional.
//  - No se permiten dos técnicos con el mismo DNI.
//  - Un técnico «Inactivo» queda bloqueado de inmediato para autoasignarse órdenes
//    (las políticas de la base solo reconocen técnicos «Activo»).

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const DNI_VALIDO = /^[0-9]{8}$/;
const TELEFONO_VALIDO = /^9[0-9]{8}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Lista de técnicos con su carga actual
// ---------------------------------------------------------------------
export async function listarTecnicos() {
  await requireRol("gerente");
  const supabase = await createClient();

  const { data: tecnicos, error } = await supabase
    .from("tecnicos")
    .select("id, nombre_completo, dni, telefono, correo, estado, max_ordenes, perfil_id, tecnico_zonas ( zona:zonas ( nombre ) )")
    .order("nombre_completo", { ascending: true });
  if (error) {
    console.error("[tecnicos] listar", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la lista de técnicos. Intenta nuevamente." };
  }

  const { data: activas } = await supabase
    .from("ordenes")
    .select("tecnico_id")
    .not("tecnico_id", "is", null)
    .in("estado", ["Asignada", "En atención"]);
  const carga = {};
  (activas || []).forEach((o) => {
    carga[o.tecnico_id] = (carga[o.tecnico_id] || 0) + 1;
  });

  return {
    ok: true,
    tecnicos: (tecnicos || []).map((t) => ({
      id: t.id,
      nombre: t.nombre_completo,
      dni: t.dni,
      telefono: t.telefono,
      correo: t.correo,
      estado: t.estado,
      maximo: t.max_ordenes,
      conCuenta: Boolean(t.perfil_id),
      zonas: (t.tecnico_zonas || []).map((z) => z.zona?.nombre).filter(Boolean),
      activas: carga[t.id] || 0,
    })),
  };
}

// ---------------------------------------------------------------------
// Alta de técnico
// ---------------------------------------------------------------------
export async function registrarTecnico({ nombre, dni, telefono, correo } = {}) {
  await requireRol("gerente");

  const nom = String(nombre || "").trim().replace(/\s+/g, " ");
  const doc = String(dni || "").trim();
  const tel = String(telefono || "").replace(/\s+/g, "");
  const mail = String(correo || "").trim().toLowerCase();

  const errores = {};
  if (!nom) errores.nombre = "El nombre completo es obligatorio.";
  if (!doc) errores.dni = "El DNI es obligatorio.";
  else if (!DNI_VALIDO.test(doc)) errores.dni = "El DNI debe tener 8 dígitos.";
  if (!tel) errores.telefono = "El teléfono de contacto es obligatorio.";
  else if (!TELEFONO_VALIDO.test(tel)) errores.telefono = "El teléfono debe tener 9 dígitos y empezar con 9.";
  if (!mail) errores.correo = "El correo institucional es obligatorio.";
  else if (!CORREO_VALIDO.test(mail)) errores.correo = "Ingresa un correo válido.";
  if (Object.keys(errores).length) return { ok: false, error: "Revisa los campos marcados.", errores };

  const supabase = await createClient();

  // DNI repetido
  const { data: existente } = await supabase.from("tecnicos").select("id, nombre_completo").eq("dni", doc).maybeSingle();
  if (existente) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      errores: { dni: `Ya existe un técnico con este DNI (${existente.nombre_completo}).` },
    };
  }

  // Si ya existe una cuenta de acceso con ese correo y rol técnico, se vincula
  let perfilId = null;
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, rol")
    .ilike("correo", mail)
    .eq("rol", "tecnico")
    .maybeSingle();
  if (perfil) {
    const { data: yaVinculado } = await supabase.from("tecnicos").select("id").eq("perfil_id", perfil.id).maybeSingle();
    if (!yaVinculado) perfilId = perfil.id;
  }

  const { error } = await supabase.from("tecnicos").insert({
    nombre_completo: nom,
    dni: doc,
    telefono: tel,
    correo: mail,
    estado: "Activo",
    perfil_id: perfilId,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Revisa los campos marcados.", errores: { dni: "Ya existe un técnico con este DNI." } };
    }
    console.error("[tecnicos] insertar", error.code, error.message);
    return { ok: false, error: "No se pudo registrar al técnico. Intenta nuevamente." };
  }

  revalidatePath("/gerente/tecnicos");
  return { ok: true, nombre: nom, conCuenta: Boolean(perfilId) };
}

// ---------------------------------------------------------------------
// Cambiar el estado operativo («Activo» / «Inactivo»)
// ---------------------------------------------------------------------
export async function cambiarEstadoTecnico({ tecnicoId, estado } = {}) {
  await requireRol("gerente");
  if (!tecnicoId) return { ok: false, error: "No se indicó el técnico." };
  if (!["Activo", "Inactivo"].includes(estado)) return { ok: false, error: "Estado no válido." };

  const supabase = await createClient();
  const { data: filas, error } = await supabase
    .from("tecnicos")
    .update({ estado })
    .eq("id", tecnicoId)
    .select("nombre_completo");
  if (error) {
    console.error("[tecnicos] estado", error.code, error.message);
    return { ok: false, error: "No se pudo cambiar el estado. Intenta nuevamente." };
  }
  if (!filas || filas.length === 0) return { ok: false, error: "El técnico no existe." };

  revalidatePath("/gerente/tecnicos");
  revalidatePath("/gerente/zonas");
  revalidatePath("/gerente/capacidad");
  return { ok: true, nombre: filas[0].nombre_completo, estado };
}
