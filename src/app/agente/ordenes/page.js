// Órdenes de avería — HU06 (registrar) y HU08 (cancelar) · Sneider Araneda
// HU07 (modificar) agregará su propia carpeta: /agente/ordenes/modificar
import Link from "next/link";
import { listarOrdenes, listarAveriasSinOrden } from "./datos";
import EstadoOrden from "./EstadoOrden";
import CancelarOrden from "./CancelarOrden";
import Icono from "@/components/Icono";
import { Encabezado, Tarjeta, Tabla, Aviso, Vacio, Metrica, Insignia, btn } from "@/components/ui";

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
}

const METRICAS = [
  { estado: "Pendiente", tono: "ambar", icono: "reloj" },
  { estado: "Asignada", tono: "azul", icono: "usuario" },
  { estado: "En atención", tono: "violeta", icono: "herramienta" },
  { estado: "Cerrada", tono: "verde", icono: "checkCirculo" },
  { estado: "Cancelada", tono: "gris", icono: "x" },
];

export default async function AgenteOrdenes({ searchParams }) {
  const { registrada, cancelada } = await searchParams;
  const [resOrdenes, resAverias] = await Promise.all([listarOrdenes(), listarAveriasSinOrden()]);
  const ordenes = resOrdenes.ok ? resOrdenes.ordenes : [];

  return (
    <div className="space-y-8">
      <Encabezado
        etiqueta="Operaciones"
        titulo="Órdenes de avería"
        descripcion="Genera órdenes para las averías que no se resolvieron por teléfono y cancela las que ya no se necesitan."
      />

      {registrada && (
        <Aviso tipo="exito">
          Orden <strong>{registrada}</strong> registrada correctamente.
        </Aviso>
      )}
      {cancelada && (
        <Aviso tipo="exito">
          Orden <strong>{cancelada}</strong> cancelada correctamente.
        </Aviso>
      )}

      {resOrdenes.ok && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {METRICAS.map((m) => (
            <Metrica
              key={m.estado}
              etiqueta={m.estado}
              tono={m.tono}
              icono={m.icono}
              valor={ordenes.filter((o) => o.estado === m.estado).length}
            />
          ))}
        </div>
      )}

      {/* HU06: averías que necesitan técnico y aún no tienen orden */}
      <Tarjeta
        titulo="Averías sin orden"
        descripcion="Averías en estado «No resuelta» que necesitan la visita de un técnico."
        icono="averias"
        acciones={resAverias.ok && <Insignia tono="ambar">{resAverias.averias.length} pendientes</Insignia>}
        sinRelleno
      >
        {!resAverias.ok ? (
          <div className="p-6">
            <Aviso tipo="error">{resAverias.error}</Aviso>
          </div>
        ) : resAverias.averias.length === 0 ? (
          <Vacio icono="checkCirculo" titulo="No hay averías pendientes de orden">
            Todas las averías no resueltas ya tienen una orden activa.
          </Vacio>
        ) : (
          <Tabla columnas={["Avería", "Cliente", "Tipo", "Descripción", "Reportada", { texto: "", derecha: true }]}>
            {resAverias.averias.map((a) => (
              <tr key={a.id} className="transition hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-xs text-slate-500">{a.codigo}</td>
                <td className="px-6 py-3.5 font-medium text-slate-900">{a.cliente?.nombre_completo}</td>
                <td className="px-6 py-3.5 text-slate-600">{a.tipo?.nombre}</td>
                <td className="max-w-xs truncate px-6 py-3.5 text-slate-500" title={a.descripcion}>
                  {a.descripcion}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">{fecha(a.fecha_registro)}</td>
                <td className="px-6 py-3.5 text-right">
                  <Link href={`/agente/ordenes/nueva?averia=${a.id}`} className={btn.chico}>
                    <Icono nombre="mas" className="h-4 w-4" />
                    Generar orden
                  </Link>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Tarjeta>

      {/* Todas las órdenes + HU08 cancelar */}
      <Tarjeta
        titulo="Órdenes registradas"
        descripcion="Solo se pueden cancelar las órdenes Pendientes o Asignadas."
        icono="ordenes"
        acciones={resOrdenes.ok && <Insignia tono="azul">{ordenes.length} órdenes</Insignia>}
        sinRelleno
      >
        {!resOrdenes.ok ? (
          <div className="p-6">
            <Aviso tipo="error">{resOrdenes.error}</Aviso>
          </div>
        ) : ordenes.length === 0 ? (
          <Vacio icono="ordenes" titulo="Todavía no hay órdenes registradas" />
        ) : (
          <Tabla columnas={["Orden", "Cliente", "Tipo", "Estado", "Técnico", "Registro", { texto: "", derecha: true }]}>
            {ordenes.map((o) => (
              <tr key={o.id} className="align-top transition hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-3.5">
                  <span className="tabular-nums text-sm font-medium text-slate-900">{o.codigo}</span>
                  <span className="block tabular-nums text-xs text-slate-400">{o.averia?.codigo}</span>
                </td>
                <td className="px-6 py-3.5 text-slate-700">{o.averia?.cliente?.nombre_completo}</td>
                <td className="px-6 py-3.5 text-slate-600">{o.averia?.tipo?.nombre}</td>
                <td className="px-6 py-3.5">
                  <EstadoOrden estado={o.estado} />
                  {o.estado === "Cancelada" && o.motivo_cancelacion && (
                    <span className="mt-1.5 block max-w-[14rem] text-xs text-slate-500">
                      Motivo: {o.motivo_cancelacion}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-slate-600">
                  {o.tecnico?.nombre_completo || <span className="text-slate-400">Sin asignar</span>}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">{fecha(o.fecha_registro)}</td>
                <td className="px-6 py-3.5">
                  <CancelarOrden orden={o} />
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Tarjeta>
    </div>
  );
}
