// HU12 · Consultar mis órdenes (JOJO-94) — Sneider Araneda
// El técnico ve solo sus órdenes Asignada o En atención, de la más antigua a la más reciente.
import Link from "next/link";
import { listarMisOrdenes } from "./actions";
import EstadoOrden from "@/app/agente/ordenes/EstadoOrden";
import Icono from "@/components/Icono";
import { Encabezado, Tarjeta, Aviso, Vacio, Dato, Insignia, btn } from "@/components/ui";

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default async function TecnicoMisOrdenes({ searchParams }) {
  const { atendida } = await searchParams;
  const res = await listarMisOrdenes();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Mi trabajo"
        titulo="Mis órdenes"
        descripcion="Órdenes que tienes asignadas, de la más antigua a la más reciente."
        acciones={
          res.ok && <Insignia tono="azul">{res.ordenes.length} {res.ordenes.length === 1 ? "orden" : "órdenes"}</Insignia>
        }
      />

      {atendida && (
        <Aviso tipo="exito">
          Atención de la orden <strong>{atendida}</strong> registrada correctamente.
        </Aviso>
      )}

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : res.ordenes.length === 0 ? (
        <Tarjeta sinRelleno>
          <Vacio icono="ordenes" titulo="No tienes órdenes asignadas">
            Cuando te autoasignes una orden, aparecerá aquí.
          </Vacio>
        </Tarjeta>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {res.ordenes.map((o) => (
            <Tarjeta
              key={o.id}
              titulo={o.codigo}
              descripcion={`Avería ${o.averia?.codigo} · ${o.averia?.tipo?.nombre}`}
              icono="herramienta"
              acciones={<EstadoOrden estado={o.estado} />}
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <Dato etiqueta="Cliente" valor={o.averia?.cliente?.nombre_completo} icono="usuario" />
                <Dato etiqueta="Teléfono" valor={o.telefono_contacto} icono="telefono" />
                <div className="sm:col-span-2">
                  <Dato etiqueta="Dirección" valor={o.direccion_atencion} icono="ubicacion" />
                </div>
                <div className="sm:col-span-2">
                  <Dato etiqueta="Descripción" valor={o.averia?.descripcion} />
                </div>
                <Dato etiqueta="Horario preferido" valor={o.horario_preferido} icono="reloj" />
                <Dato etiqueta="Asignada" valor={fecha(o.fecha_asignacion)} />
              </dl>
              <div className="mt-5 flex justify-end">
                <Link href={`/tecnico/mis-ordenes/atencion?orden=${o.id}`} className={btn.chico}>
                  <Icono nombre="mas" className="h-4 w-4" />
                  {o.estado === "En atención" ? "Agregar atención" : "Registrar atención"}
                </Link>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}
