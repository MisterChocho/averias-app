// Solo los usuarios con rol "gerente" pueden entrar a /gerente/...
import AppShell from "@/components/AppShell";
import { requireRol } from "@/lib/auth";

export default async function GerenteLayout({ children }) {
  const { perfil } = await requireRol("gerente");
  return <AppShell perfil={perfil}>{children}</AppShell>;
}
