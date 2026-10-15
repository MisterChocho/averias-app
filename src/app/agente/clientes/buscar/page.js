// HU02 · Buscar información del cliente (JOJO-37 interfaz, JOJO-40 frontend) — Sneider Araneda
// Ruta: /agente/clientes/buscar. El backend (JOJO-39, Luis) vive en ./actions.js.
import BuscarCliente from "./BuscarCliente";
import { Encabezado } from "@/components/ui";

export default function Buscar() {
  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Buscar cliente"
        descripcion="Busca al cliente que está llamando por su DNI/RUC, código o teléfono. Con un dato basta."
        volver={{ href: "/agente/clientes", texto: "Volver a clientes" }}
      />
      <BuscarCliente />
    </div>
  );
}
