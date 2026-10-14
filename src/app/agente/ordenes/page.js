// Órdenes de avería — HU06 (registrar) y HU08 (cancelar) · Sneider Araneda
// HU07 (modificar, Javier) agregará su propia carpeta: /agente/ordenes/modificar
import Link from "next/link";
import { listarOrdenes, listarAveriasSinOrden } from "./datos";
import EstadoOrden from "./EstadoOrden";
import CancelarOrden from "./CancelarOrden";

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
}

export default async function AgenteOrdenes({ searchParams }) {
  const { registrada, cancelada } = await searchParams;
  const [resOrdenes, resAverias] = await Promise.all([listarOrdenes(), listarAveriasSinOrden()]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Órdenes de avería</h1>
        <p className="text-slate-600">Generar órdenes para averías no resueltas y cancelar órdenes.</p>
      </div>

      {registrada && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Orden <strong>{registrada}</strong> registrada correctamente.
        </p>
      )}
      {cancelada && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Orden <strong>{cancelada}</strong> cancelada correctamente.
        </p>
      )}

      {/* HU06: averías que necesitan técnico y aún no tienen orden */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Averías sin orden</h2>
        <p className="text-sm text-slate-600">
          Averías en estado &quot;No resuelta&quot; que necesitan la visita de un técnico.
        </p>

        {!resAverias.ok ? (
          <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{resAverias.error}</p>
        ) : resAverias.averias.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No hay averías pendientes de orden.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Avería</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Reportada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resAverias.averias.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{a.codigo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{a.cliente?.nombre_completo}</td>
                    <td className="px-4 py-3 text-slate-600">{a.tipo?.nombre}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={a.descripcion}>
                      {a.descripcion}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fecha(a.fecha_registro)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/agente/ordenes/nueva?averia=${a.id}`}
                        className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Generar orden
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Todas las órdenes + HU08 cancelar */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Órdenes registradas</h2>

        {!resOrdenes.ok ? (
          <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{resOrdenes.error}</p>
        ) : resOrdenes.ordenes.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Todavía no hay órdenes registradas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Técnico</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resOrdenes.ordenes.map((o) => (
                  <tr key={o.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium text-slate-900">{o.codigo}</span>
                      <span className="block text-xs text-slate-500">{o.averia?.codigo}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.averia?.cliente?.nombre_completo}</td>
                    <td className="px-4 py-3 text-slate-600">{o.averia?.tipo?.nombre}</td>
                    <td className="px-4 py-3">
                      <EstadoOrden estado={o.estado} />
                      {o.estado === "Cancelada" && o.motivo_cancelacion && (
                        <span className="mt-1 block max-w-[14rem] text-xs text-slate-500">
                          Motivo: {o.motivo_cancelacion}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.tecnico?.nombre_completo || "Sin asignar"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fecha(o.fecha_registro)}</td>
                    <td className="px-4 py-3">
                      <CancelarOrden orden={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
