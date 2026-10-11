import PanelRol from "@/components/PanelRol";
import { requireRol } from "@/lib/auth";

export default async function AgenteInicio() {
  const { perfil } = await requireRol("agente");
  return <PanelRol perfil={perfil} />;
}
