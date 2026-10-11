// Solo los usuarios con rol "agente" pueden entrar a /agente/...
import AppShell from "@/components/AppShell";
import { requireRol } from "@/lib/auth";

export default async function AgenteLayout({ children }) {
  const { perfil } = await requireRol("agente");
  return <AppShell perfil={perfil}>{children}</AppShell>;
}
