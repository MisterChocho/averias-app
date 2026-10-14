// HU04 · Guía de diagnóstico (JOJO-65 frontend) — Sneider Araneda
// Se abre desde HU03 con /agente/averias/guia?averia=<id>. Pendiente: depende del backend de HU04 (Luis).
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";

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
        <Vacio icono="libro" titulo="Próximamente">
          La guía paso a paso para resolver la falla estará disponible muy pronto.
        </Vacio>
      </Tarjeta>
    </div>
  );
}
