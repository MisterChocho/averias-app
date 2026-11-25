// HU24 · Órdenes disponibles / autoasignar (JOJO-96 frontend) — Sneider Araneda
// Muestra las órdenes «Pendiente» de la zona del técnico y le deja tomarlas hasta su límite.
import { listarDisponibles } from "./actions";
import TomarOrden from "./TomarOrden";
import { Encabezado, Tarjeta, Aviso, Vacio, Dato, Insignia } from "@/components/ui";

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default async function TecnicoDisponibles() {
  const res = await listarDisponibles();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Mi trabajo"
        titulo="Órdenes disponibles"
        descripcion="Órdenes pendientes de tus zonas de cobertura. Tómalas para atenderlas."
        acciones={
          res.ok && (
            <Insignia tono={res.lleno ? "rojo" : "azul"}>
              {res.activas} de {res.maximo} órdenes activas
            </Insignia>
          )
        }
      />

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : (
        <>
          {res.lleno && (
            <Aviso tipo="alerta" titulo="Llegaste a tu límite de órdenes">
              Tienes {res.activas} órdenes activas (máximo {res.maximo}). Cierra una para poder tomar otra.
            </Aviso>
          )}

          {res.zonas.length === 0 ? (
            <Aviso tipo="alerta" titulo="Sin zonas asignadas">
              Todavía no tienes zonas de cobertura. Pide al gerente que te asigne una.
            </Aviso>
          ) : (
            <p className="text-sm text-slate-500">
              Tus zonas: <span className="font-medium text-slate-700">{res.zonas.join(", ")}</span>
            </p>
          )}

          {res.ordenes.length === 0 ? (
            <Tarjeta sinRelleno>
              <Vacio icono="ordenes" titulo="No hay órdenes disponibles">
                Cuando se registre una orden pendiente en tus zonas, aparecerá aquí.
              </Vacio>
            </Tarjeta>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {res.ordenes.map((o) => (
                <Tarjeta
                  key={o.id}
                  titulo={o.codigo}
                  descripcion={`Avería ${o.averia?.codigo} · ${o.averia?.tipo?.nombre}`}
                  icono="ordenes"
                  acciones={<Insignia tono="ambar" punto>Pendiente</Insignia>}
                >
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Dato etiqueta="Cliente" valor={o.averia?.cliente?.nombre_completo} icono="usuario" />
                    <Dato etiqueta="Zona" valor={o.averia?.cliente?.zona?.nombre} icono="zonas" />
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Dirección" valor={o.direccion_atencion} icono="ubicacion" />
                    </div>
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Descripción" valor={o.averia?.descripcion} />
                    </div>
                    <Dato etiqueta="Horario preferido" valor={o.horario_preferido} icono="reloj" />
                    <Dato etiqueta="Registrada" valor={fecha(o.fecha_registro)} />
                  </dl>
                  <div className="mt-5">
                    <TomarOrden ordenId={o.id} codigo={o.codigo} deshabilitado={res.lleno} />
                  </div>
                </Tarjeta>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
