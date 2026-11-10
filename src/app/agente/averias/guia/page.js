// HU04 · Guía de diagnóstico (JOJO-65 frontend) — Sneider Araneda
// Se abre desde HU03 con /agente/averias/guia?averia=<id>
import { cargarGuia } from "./actions";
import GuiaDiagnostico from "./GuiaDiagnostico";
import { Encabezado, Aviso } from "@/components/ui";

export default async function GuiaDiagnosticoPage({ searchParams }) {
  const { averia } = await searchParams;
  const datos = averia
    ? await cargarGuia(averia)
    : { ok: false, error: "Elige una avería para abrir su guía de diagnóstico." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención de averías"
        titulo="Guía de diagnóstico"
        descripcion="Sigue los pasos con el cliente para resolver la falla por teléfono."
        volver={{ href: "/agente/averias", texto: "Volver a averías" }}
      />

      {!datos.ok ? (
        <Aviso tipo="alerta">{datos.error}</Aviso>
      ) : (
        <GuiaDiagnostico averia={datos.averia} guia={datos.guia} />
      )}
    </div>
  );
}
