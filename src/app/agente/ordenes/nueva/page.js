// HU06 · Registrar orden de avería (JOJO-47 interfaz, JOJO-50 frontend) — Sneider Araneda
// Se abre con /agente/ordenes/nueva?averia=<id de la avería>. HU03 enlaza aquí cuando la avería requiere técnico.
import { obtenerDatosParaOrden } from "../actions";
import FormularioOrden from "./FormularioOrden";
import { Encabezado, Aviso } from "@/components/ui";

export default async function NuevaOrden({ searchParams }) {
  const { averia } = await searchParams;
  const datos = averia
    ? await obtenerDatosParaOrden(averia)
    : { ok: false, error: "Elige una avería de la lista para generar su orden." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Operaciones"
        titulo="Registrar orden de avería"
        descripcion="La falla no se resolvió por teléfono: se generará una orden para que un técnico la atienda."
        volver={{ href: "/agente/ordenes", texto: "Volver a órdenes" }}
      />

      {!datos.ok ? (
        <Aviso tipo="error">{datos.error}</Aviso>
      ) : !datos.puedeGenerar ? (
        <Aviso tipo="alerta">{datos.motivoBloqueo}</Aviso>
      ) : (
        <FormularioOrden datos={datos} />
      )}
    </div>
  );
}
