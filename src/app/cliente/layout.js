// Solo los usuarios con rol "cliente" pueden entrar a /cliente/...
import AppShell from "@/components/AppShell";
import { requireRol } from "@/lib/auth";

export default async function ClienteLayout({ children }) {
  const { perfil } = await requireRol("cliente");
  return <AppShell perfil={perfil}>{children}</AppShell>;
}
