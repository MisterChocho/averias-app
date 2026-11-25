// HU24 · Órdenes disponibles / autoasignar (JOJO-96 frontend) — Sneider Araneda
// Muestra las órdenes «Pendiente» de la zona del técnico y le deja tomarlas hasta su límite.
// Usa el backend de Luis y Jhosep (supabase/10_funciones_autoasignacion.sql).
import { listarOrdenesDisponibles } from "./actions";
import TomarOrden from "./TomarOrden";
import { Encabezado, Tarjeta, Aviso, Vacio, Dato, Insignia } from "@/components/ui";

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default async function TecnicoDisponibles() {
  const res = await listarOrdenesDisponibles();
  const lleno = res.ok && !res.tecnico.puedeAutoasignarse;

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Mi trabajo"
        titulo="Órdenes disponibles"
        descripcion="Órdenes pendientes de tus zonas de cobertura. Tómalas para atenderlas."
        acciones={
          res.ok && (
            <Insignia tono={lleno ? "rojo" : "azul"}>
              {res.tecnico.ordenesActivas} de {res.tecnico.maxOrdenes} órdenes activas
            </Insignia>
          )
        }
      />

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : (
        <>
          {lleno && (
            <Aviso tipo="alerta" titulo="Llegaste a tu límite de órdenes">
              Tienes {res.tecnico.ordenesActivas} órdenes activas (máximo {res.tecnico.maxOrdenes}). Cierra una para poder
              tomar otra.
            </Aviso>
          )}

          {res.ordenes.length === 0 ? (
            <Tarjeta sinRelleno>
              <Vacio icono="ordenes" titulo="No hay órdenes disponibles">
                Cuando se registre una orden pendiente en tus zonas, aparecerá aquí. Si no ves ninguna, confirma con el
                gerente que tengas zonas asignadas.
              </Vacio>
            </Tarjeta>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {res.ordenes.map((o) => (
                <Tarjeta
                  key={o.id}
                  titulo={o.codigo}
                  descripcion={`Avería ${o.averia} · ${o.tipo}`}
                  icono="ordenes"
                  acciones={<Insignia tono="ambar" punto>Pendiente</Insignia>}
                >
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Dato etiqueta="Cliente" valor={o.cliente} icono="usuario" />
                    <Dato etiqueta="Zona" valor={o.zona} icono="zonas" />
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Dirección" valor={o.direccion} icono="ubicacion" />
                    </div>
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Descripción" valor={o.descripcion} />
                    </div>
                    <Dato etiqueta="Horario preferido" valor={o.horario} icono="reloj" />
                    <Dato etiqueta="Registrada" valor={fecha(o.fechaRegistro)} />
                  </dl>
                  <div className="mt-5">
                    <TomarOrden ordenId={o.id} codigo={o.codigo} deshabilitado={lleno} />
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
