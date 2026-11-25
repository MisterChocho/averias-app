// HU09 · Administrar técnicos (JOJO-98 frontend) — Sneider Araneda
// El gerente da de alta técnicos y gestiona su estado operativo (Activo / Inactivo).
import { listarTecnicos } from "./actions";
import FormularioTecnico from "./FormularioTecnico";
import BotonEstado from "./BotonEstado";
import { Encabezado, Tarjeta, Tabla, Insignia, Aviso, Vacio, Avatar } from "@/components/ui";

export default async function GerenteTecnicos() {
  const res = await listarTecnicos();

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Gestión"
        titulo="Técnicos"
        descripcion="Da de alta al personal técnico y controla quién puede autoasignarse órdenes."
        acciones={res.ok && <Insignia tono="azul">{res.tecnicos.length} técnicos</Insignia>}
      />

      <FormularioTecnico />

      {!res.ok ? (
        <Aviso tipo="error">{res.error}</Aviso>
      ) : (
        <Tarjeta titulo="Técnicos registrados" icono="tecnicos" sinRelleno>
          {res.tecnicos.length === 0 ? (
            <Vacio icono="tecnicos" titulo="Aún no hay técnicos">
              Registra al primero con el formulario de arriba.
            </Vacio>
          ) : (
            <Tabla columnas={["Técnico", "DNI", "Contacto", "Zonas", "Órdenes activas", "Estado", { texto: "Acción", derecha: true }]}>
              {res.tecnicos.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={t.nombre} tamano="sm" />
                      <div>
                        <p className="font-medium text-slate-900">{t.nombre}</p>
                        {!t.conCuenta && <p className="text-xs text-amber-700">Sin cuenta de acceso</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{t.dni}</td>
                  <td className="px-6 py-4 text-slate-700">
                    <p>{t.telefono}</p>
                    <p className="text-xs text-slate-500">{t.correo}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{t.zonas.length ? t.zonas.join(", ") : "—"}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {t.activas} de {t.maximo}
                  </td>
                  <td className="px-6 py-4">
                    <Insignia tono={t.estado === "Activo" ? "verde" : "gris"} punto>
                      {t.estado}
                    </Insignia>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <BotonEstado tecnicoId={t.id} nombre={t.nombre} estado={t.estado} activas={t.activas} />
                    </div>
                  </td>
                </tr>
              ))}
            </Tabla>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
