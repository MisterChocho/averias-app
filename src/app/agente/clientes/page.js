// HU01 · Listar clientes — punto de inicio de la atención del agente.
import { listarClientes } from "./actions";
import ClientesLista from "./ClientesLista";
import { Encabezado } from "@/components/ui";

export default async function AgenteClientes() {
  const resultado = await listarClientes();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Clientes"
        descripcion="Selecciona al cliente que está llamando para iniciar su atención."
      />
      <ClientesLista resultado={resultado} />
    </div>
  );
}
