// HU04 · Guía de diagnóstico (JOJO-65 frontend) — Sneider Araneda
// Se abre desde HU03 con /agente/averias/guia?averia=<id>. Pendiente: depende del backend de HU04 (Luis).
import { Encabezado, Tarjeta, Vacio, Insignia } from "@/components/ui";

export default async function GuiaDiagnostico() {
  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Guía de diagnóstico"
        descripcion="Pasos para resolver la falla durante la llamada."
        volver={{ href: "/agente/averias", texto: "Volver a averías" }}
      />
      <Tarjeta>
        <Vacio icono="libro" titulo="Módulo en desarrollo">
          La guía paso a paso se entrega con la HU04.
        </Vacio>
        <div className="flex justify-center pb-4">
          <Insignia tono="azul">HU04 · Sprint 1</Insignia>
        </div>
      </Tarjeta>
    </div>
  );
}
