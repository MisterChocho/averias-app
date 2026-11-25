// HU10 · Asignar zonas de cobertura (JOJO-99 frontend) — Sneider Araneda
// El gerente asigna o reasigna zonas a cada técnico y ve el historial de cambios.
import { listarZonasYTecnicos } from "./actions";
import EditorZonas from "./EditorZonas";
import { Encabezado, Tarjeta, Tabla, Aviso, Vacio } from "@/components/ui";

function fecha(valor) {
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default async function GerenteZonas() {
  const res = await listarZonasYTecnicos();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Gestión"
        titulo="Zonas de cobertura"
        descripcion="Elige las zonas que atiende cada técnico. El cambio rige de inmediato para sus órdenes disponibles."
      />

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : res.tecnicos.length === 0 ? (
        <Tarjeta sinRelleno>
          <Vacio icono="tecnicos" titulo="Aún no hay técnicos">
            Da de alta técnicos en la sección «Técnicos» para poder asignarles zonas.
          </Vacio>
        </Tarjeta>
      ) : (
        <>
          <EditorZonas tecnicos={res.tecnicos} zonas={res.zonas} />

          <Tarjeta titulo="Historial de cambios" descripcion="Los últimos 30 cambios de zona." icono="reloj" sinRelleno>
            {res.historial.length === 0 ? (
              <Vacio icono="reloj" titulo="Todavía no hay cambios">
                Cuando asignes o reasignes zonas, quedarán registradas aquí.
              </Vacio>
            ) : (
              <Tabla columnas={["Fecha", "Técnico", "Zona anterior", "Zona nueva", "Autorizó"]}>
                {res.historial.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-700">{fecha(h.fecha)}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{h.tecnico?.nombre_completo || "—"}</td>
                    <td className="px-6 py-3 text-slate-700">{h.zona_anterior || "—"}</td>
                    <td className="px-6 py-3 text-slate-700">{h.zona_nueva || "—"}</td>
                    <td className="px-6 py-3 text-slate-700">{h.autor?.nombre_completo || "—"}</td>
                  </tr>
                ))}
              </Tabla>
            )}
          </Tarjeta>
        </>
      )}
    </div>
  );
}
