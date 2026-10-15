// HU02 · Buscar información del cliente (JOJO-37 interfaz, JOJO-40 frontend) — Sneider Araneda
// Ruta: /agente/clientes/buscar. Carga la lista de clientes (HU01) para filtrar mientras se escribe
// y pide el detalle del cliente elegido con buscarCliente (backend JOJO-39, Luis).
import { listarClientes } from "../actions";
import BuscarCliente from "./BuscarCliente";
import { Encabezado } from "@/components/ui";

export default async function Buscar() {
  const resultado = await listarClientes();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Buscar información del cliente"
        descripcion="Busca por DNI/RUC, código de cliente o teléfono. Con un dato basta y con 2 caracteres ya aparecen coincidencias."
        volver={{ href: "/agente/clientes", texto: "Volver a clientes" }}
      />
      <BuscarCliente resultado={resultado} />
    </div>
  );
}
