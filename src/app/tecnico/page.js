import PanelRol from "@/components/PanelRol";
import { requireRol } from "@/lib/auth";

export default async function TecnicoInicio() {
  const { perfil } = await requireRol("tecnico");
  return <PanelRol perfil={perfil} />;
}
