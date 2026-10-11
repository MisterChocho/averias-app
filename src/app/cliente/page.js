import PanelRol from "@/components/PanelRol";
import { requireRol } from "@/lib/auth";

export default async function ClienteInicio() {
  const { perfil } = await requireRol("cliente");
  return <PanelRol perfil={perfil} />;
}
