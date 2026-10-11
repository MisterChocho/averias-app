import { listarClientes } from "./actions";
import ClientesLista from "./ClientesLista";

export default async function AgenteClientes() {
  const resultado = await listarClientes();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-slate-600">
          Listar y buscar clientes para iniciar la atención.
        </p>
      </div>

      <ClientesLista resultado={resultado} />
    </section>
  );
}