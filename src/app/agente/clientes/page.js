// HU01 · Listar clientes — punto de inicio de la atención del agente.
import { listarClientes } from "./actions";
import ClientesLista from "./ClientesLista";
import Link from "next/link";
import Icono from "@/components/Icono";
import { Encabezado, btn } from "@/components/ui";

export default async function AgenteClientes() {
  const resultado = await listarClientes();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Clientes"
        descripcion="Selecciona al cliente que está llamando para iniciar su atención."
        acciones={
          <Link href="/agente/clientes/buscar" className={btn.secundario}>
            <Icono nombre="clientes" className="h-4 w-4" />
            Buscar cliente
          </Link>
        }
      />
      <ClientesLista resultado={resultado} />
    </div>
  );
}
