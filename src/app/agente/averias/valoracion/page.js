// HU05 · Registrar valoración del cliente (JOJO-72 frontend) — Sneider Araneda
// Se abre desde la guía (HU04) con /agente/averias/valoracion?averia=<id>
import { cargarParaValoracion } from "./actions";
import FormularioValoracion from "./FormularioValoracion";
import { Encabezado, Aviso } from "@/components/ui";

export default async function ValoracionPage({ searchParams }) {
  const { averia } = await searchParams;
  const datos = averia
    ? await cargarParaValoracion(averia)
    : { ok: false, error: "Elige una avería resuelta para registrar la valoración." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención de averías"
        titulo="Valoración del cliente"
        descripcion="Pide al cliente que valore la atención antes de cerrarla."
        volver={{ href: "/agente/averias", texto: "Volver a averías" }}
      />

      {!datos.ok ? (
        <Aviso tipo="alerta">{datos.error}</Aviso>
      ) : (
        <FormularioValoracion averia={datos.averia} existente={datos.existente} />
      )}
    </div>
  );
}
