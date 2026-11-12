// HU13 · Registrar atención (JOJO-95) — Sneider Araneda
// Se abre con /tecnico/mis-ordenes/atencion?orden=<id> desde «Mis órdenes»
import { cargarOrdenParaAtencion } from "../actions";
import FormularioAtencion from "./FormularioAtencion";
import { Encabezado, Aviso } from "@/components/ui";

export default async function AtencionPage({ searchParams }) {
  const { orden } = await searchParams;
  const datos = orden
    ? await cargarOrdenParaAtencion(orden)
    : { ok: false, error: "Elige una de tus órdenes para registrar la atención." };

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Mi trabajo"
        titulo="Registrar atención"
        descripcion="Deja constancia del diagnóstico y de la solución que aplicaste."
        volver={{ href: "/tecnico/mis-ordenes", texto: "Volver a mis órdenes" }}
      />

      {!datos.ok ? (
        <Aviso tipo="error">{datos.error}</Aviso>
      ) : (
        <FormularioAtencion orden={datos.orden} atenciones={datos.atenciones} />
      )}
    </div>
  );
}
