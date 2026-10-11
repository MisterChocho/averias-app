import PanelRol from "@/components/PanelRol";
import { requireRol } from "@/lib/auth";

export default async function GerenteInicio() {
  const { perfil } = await requireRol("gerente");
  return <PanelRol perfil={perfil} />;
}
