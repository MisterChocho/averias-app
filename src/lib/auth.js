// Funciones para saber quién está conectado y qué rol tiene.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ROLES = {
  agente: "Agente de Call Center",
  gerente: "Gerente de Operaciones",
  tecnico: "Técnico",
  cliente: "Cliente",
};

// Devuelve { user, perfil } o null si no hay sesión.
export async function getUsuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, correo")
    .eq("id", user.id)
    .single();

  return { user, perfil };
}

// Úsalo al inicio de un layout o página: si el usuario no tiene el rol, lo saca.
export async function requireRol(rol) {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect("/login");
  if (!usuario.perfil) redirect("/sin-perfil");
  if (usuario.perfil.rol !== rol) redirect(`/${usuario.perfil.rol}`);

  return usuario;
}
