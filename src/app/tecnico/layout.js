// Solo los usuarios con rol "tecnico" pueden entrar a /tecnico/...
import AppShell from "@/components/AppShell";
import { requireRol } from "@/lib/auth";

export default async function TecnicoLayout({ children }) {
  const { perfil } = await requireRol("tecnico");
  return <AppShell perfil={perfil}>{children}</AppShell>;
}
