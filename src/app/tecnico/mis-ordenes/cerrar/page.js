// HU14 · Cerrar orden (JOJO-97 frontend) — Sneider Araneda
// Se abre con /tecnico/mis-ordenes/cerrar?orden=<id> desde «Mis órdenes»
import { cargarOrdenParaCierre } from "./actions";
import FormularioCierre from "./FormularioCierre";
import { Encabezado, Aviso } from "@/components/ui";

export default async function CerrarOrdenPage({ searchParams }) {
  const { orden } = await searchParams;
  const datos = orden
    ? await cargarOrdenParaCierre(orden)
    : { ok: false, error: "Elige una de tus órdenes para cerrarla." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Mi trabajo"
        titulo="Cerrar orden"
        descripcion="Adjunta la evidencia fotográfica para confirmar que la avería fue solucionada."
        volver={{ href: "/tecnico/mis-ordenes", texto: "Volver a mis órdenes" }}
      />

      {!datos.ok ? (
        <Aviso tipo="error">{datos.error}</Aviso>
      ) : (
        <FormularioCierre orden={datos.orden} atenciones={datos.atenciones} />
      )}
    </div>
  );
}
