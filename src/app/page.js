// Página de inicio: envía a cada usuario al panel de su rol.
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";

export default async function Inicio() {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect("/login");
  if (!usuario.perfil) redirect("/sin-perfil");

  redirect(`/${usuario.perfil.rol}`);
}
