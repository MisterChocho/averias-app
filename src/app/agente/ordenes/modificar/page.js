// HU07 · Modificar orden (JOJO-79 frontend) — Sneider Araneda
// Se abre con /agente/ordenes/modificar?orden=<id> desde el botón «Modificar» de la lista de órdenes
import { cargarOrdenParaModificar } from "./actions";
import FormularioModificar from "./FormularioModificar";
import { Encabezado, Aviso } from "@/components/ui";

export default async function ModificarOrdenPage({ searchParams }) {
  const { orden } = await searchParams;
  const datos = orden
    ? await cargarOrdenParaModificar(orden)
    : { ok: false, error: "Elige una orden de la lista para modificarla." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Operaciones"
        titulo="Modificar orden"
        descripcion="Corrige la dirección de atención o el teléfono de contacto antes de que inicie la atención."
        volver={{ href: "/agente/ordenes", texto: "Volver a órdenes" }}
      />

      {!datos.ok ? (
        <Aviso tipo="error">{datos.error}</Aviso>
      ) : !datos.modificable ? (
        <Aviso tipo="alerta">Esta orden ya no puede modificarse</Aviso>
      ) : (
        <FormularioModificar orden={datos.orden} />
      )}
    </div>
  );
}
