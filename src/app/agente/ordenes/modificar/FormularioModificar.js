"use client";

// HU07 · Modificar orden (JOJO-79 frontend) — Sneider Araneda
// Solo dirección y teléfono son editables; se necesita al menos un cambio para guardar.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { modificarOrden } from "./actions";
import EstadoOrden from "../EstadoOrden";
import { Tarjeta, Aviso, Dato, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

const TELEFONO_VALIDO = /^9[0-9]{8}$/;

export default function FormularioModificar({ orden }) {
  const router = useRouter();
  const [direccion, setDireccion] = useState(orden.direccion || "");
  const [telefono, setTelefono] = useState(orden.telefono || "");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, startTransition] = useTransition();

  const hayCambios = direccion.trim() !== (orden.direccion || "") || telefono !== (orden.telefono || "");

  function guardar(ev) {
    ev.preventDefault();
    setError(null);

    const e = {};
    if (!direccion.trim()) e.direccion = "La dirección de atención es obligatoria.";
    if (!TELEFONO_VALIDO.test(telefono)) e.telefono = "El teléfono debe tener 9 dígitos y empezar con 9.";
    setErrores(e);
    if (Object.keys(e).length) return;
    if (!hayCambios) return setError("No hay cambios para guardar. Modifica al menos un dato.");

    startTransition(async () => {
      const r = await modificarOrden({ ordenId: orden.id, direccion, telefono });
      if (!r.ok) {
        setErrores(r.errores || {});
        return setError(r.error);
      }
      router.push(`/agente/ordenes?modificada=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta titulo="Datos editables" descripcion="Solo se pueden cambiar la dirección y el teléfono." icono="ubicacion">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Etiqueta htmlFor="direccion" obligatorio>
                Dirección de atención
              </Etiqueta>
              <input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={campo(errores.direccion)}
              />
              <ErrorCampo>{errores.direccion}</ErrorCampo>
            </div>
            <div>
              <Etiqueta htmlFor="telefono" obligatorio>
                Teléfono de contacto
              </Etiqueta>
              <input
                id="telefono"
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ""))}
                className={campo(errores.telefono)}
              />
              <ErrorCampo>{errores.telefono}</ErrorCampo>
            </div>
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="flex justify-end">
          <button type="submit" disabled={enviando || !hayCambios} className={btn.primario}>
            {enviando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <aside className="space-y-6">
        <Tarjeta titulo="Orden" descripcion="El estado y el código no cambian." icono="ordenes">
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <Dato etiqueta="Código" valor={orden.codigo} />
              <EstadoOrden estado={orden.estado} />
            </div>
            <Dato etiqueta="Avería" valor={`${orden.averia} · ${orden.tipo}`} />
            <Dato etiqueta="Cliente" valor={orden.cliente} />
            <Dato etiqueta="Descripción" valor={orden.descripcion} />
          </dl>
          {orden.conTecnico && (
            <p className="mt-4 text-xs text-slate-500">Esta orden tiene técnico asignado: se le notificarán los cambios.</p>
          )}
        </Tarjeta>
      </aside>
    </form>
  );
}
