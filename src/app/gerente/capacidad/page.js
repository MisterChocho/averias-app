// HU11 · Capacidad de trabajo por técnico (JOJO-100 frontend) — Sneider Araneda
// El gerente define cuántas órdenes simultáneas (Asignada o En atención) puede tener cada técnico.
import { listarCapacidad } from "./actions";
import FilaCapacidad from "./FilaCapacidad";
import { Encabezado, Tarjeta, Tabla, Aviso, Vacio } from "@/components/ui";

export default async function GerenteCapacidad() {
  const res = await listarCapacidad();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Gestión"
        titulo="Capacidad de trabajo"
        descripcion="Define el máximo de órdenes simultáneas por técnico para evitar la sobrecarga."
      />

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : (
        <>
          <Aviso tipo="info">
            Cuando un técnico llega a su límite, el sistema le bloquea la toma de nuevas órdenes hasta que cierre una.
          </Aviso>
          <Tarjeta titulo="Límite por técnico" icono="grafico" sinRelleno>
            {res.tecnicos.length === 0 ? (
              <Vacio icono="tecnicos" titulo="Aún no hay técnicos">
                Da de alta técnicos en la sección «Técnicos» para configurar su capacidad.
              </Vacio>
            ) : (
              <Tabla columnas={["Técnico", "Estado", "Carga actual", "Límite de órdenes"]}>
                {res.tecnicos.map((t) => (
                  <FilaCapacidad key={`${t.id}-${t.limite}`} tecnico={t} minimo={res.minimo} maximo={res.maximo} />
                ))}
              </Tabla>
            )}
          </Tarjeta>
        </>
      )}
    </div>
  );
}
