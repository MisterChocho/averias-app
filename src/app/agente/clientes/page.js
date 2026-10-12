import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage() {
  const supabase = await createClient();

  // Consultar la lista de clientes desde Supabase
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("codigo, nombre_completo, documento, telefono, correo")
    .order("nombre_completo");

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h1>
          <p className="text-sm text-gray-500">
            HU01: Lista completa de clientes registrados en el sistema
          </p>
        </div>
      </div>

      {/* Si ocurre un error en la consulta */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          Error al cargar los clientes: {error.message}
        </div>
      )}

      {/* Tabla de Clientes */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-700 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre Completo</th>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Correo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {clientes && clientes.length > 0 ? (
              clientes.map((cliente) => (
                <tr key={cliente.codigo} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-blue-600">{cliente.codigo}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{cliente.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.documento}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.telefono || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.correo || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay clientes registrados en la base de datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
