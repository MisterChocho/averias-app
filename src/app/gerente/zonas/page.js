import { requireRol } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import ZonasClient from "./ZonasClient";

export default async function ZonasPage() {
  const usuario = await requireRol("gerente");

  return (
    <AppShell usuario={usuario}>
      <ZonasClient />
    </AppShell>
  );
}