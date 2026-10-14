// Etiqueta de color para el estado de una orden
import { Insignia } from "@/components/ui";

export const TONO_ESTADO = {
  Pendiente: "ambar",
  Asignada: "azul",
  "En atención": "violeta",
  Cerrada: "verde",
  Cancelada: "gris",
};

export default function EstadoOrden({ estado }) {
  return (
    <Insignia tono={TONO_ESTADO[estado] || "gris"} punto>
      {estado}
    </Insignia>
  );
}
