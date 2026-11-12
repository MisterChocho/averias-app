"use client";

// HU13 · Registrar atención (JOJO-95) — Sneider Araneda
// «Diagnóstico» y «Solución aplicada» son obligatorios. Al guardar, la orden pasa a «En atención».
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarAtencion } from "../actions";
import EstadoOrden from "@/app/agente/ordenes/EstadoOrden";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Dato, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

function fecha(valor) {
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default function FormularioAtencion({ orden, atenciones }) {
  const router = useRouter();
  const [diagnostico, setDiagnostico] = useState("");
  const [solucion, setSolucion] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, startTransition] = useTransition();

  function pedirConfirmacion(ev) {
    ev.preventDefault();
    setError(null);
    const e = {};
    if (!diagnostico.trim()) e.diagnostico = "El diagnóstico es obligatorio.";
    if (!solucion.trim()) e.solucion = "La solución aplicada es obligatoria.";
    setErrores(e);
    if (Object.keys(e).length === 0) setConfirmando(true);
  }

  function guardar() {
    startTransition(async () => {
      const r = await registrarAtencion({ ordenId: orden.id, diagnostico, solucion });
      if (!r.ok) {
        setConfirmando(false);
        setErrores(r.errores || {});
        return setError(r.error);
      }
      router.push(`/tecnico/mis-ordenes?atendida=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={pedirConfirmacion} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta titulo="Atención realizada" descripcion="Se guarda con tu nombre, la fecha y la hora." icono="herramienta">
          <div className="space-y-5">
            <div>
              <Etiqueta htmlFor="diagnostico" obligatorio>
                Diagnóstico
              </Etiqueta>
              <textarea
                id="diagnostico"
                rows={4}
                value={diagnostico}
                onChange={(e) => {
                  setDiagnostico(e.target.value);
                  setConfirmando(false);
                }}
                placeholder="Qué encontraste al revisar el servicio"
                className={campo(errores.diagnostico)}
              />
              <ErrorCampo>{errores.diagnostico}</ErrorCampo>
            </div>
            <div>
              <Etiqueta htmlFor="solucion" obligatorio>
                Solución aplicada
              </Etiqueta>
              <textarea
                id="solucion"
                rows={4}
                value={solucion}
                onChange={(e) => {
                  setSolucion(e.target.value);
                  setConfirmando(false);
                }}
                placeholder="Qué hiciste para resolver la falla"
                className={campo(errores.solucion)}
              />
              <ErrorCampo>{errores.solucion}</ErrorCampo>
            </div>
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {!confirmando ? (
          <div className="flex justify-end">
            <button type="submit" className={btn.primario}>
              Registrar atención
            </button>
          </div>
        ) : (
          <div className="animar-entrada rounded-2xl border border-marca-200 bg-marca-50/60 p-5">
            <p className="text-sm text-marca-900">
              ¿Registrar la atención de la orden <strong>{orden.codigo}</strong>? La orden pasará a «En atención».
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={guardar} disabled={enviando} className={btn.primario}>
                <Icono nombre="check" className="h-4 w-4" />
                {enviando ? "Guardando..." : "Sí, registrar"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className={btn.secundario}>
                Revisar datos
              </button>
            </div>
          </div>
        )}

        {atenciones.length > 0 && (
          <Tarjeta titulo="Atenciones anteriores" descripcion="Ya registradas para esta orden." icono="libro">
            <ul className="space-y-4">
              {atenciones.map((a, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-4 text-sm">
                  <p className="text-xs text-slate-500">{fecha(a.fecha)}</p>
                  <p className="mt-2">
                    <span className="font-medium text-slate-700">Diagnóstico: </span>
                    {a.diagnostico}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-slate-700">Solución: </span>
                    {a.solucion}
                  </p>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </div>

      <aside>
        <Tarjeta titulo="Orden" descripcion="Datos de la visita." icono="ordenes">
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <Dato etiqueta="Código" valor={orden.codigo} />
              <EstadoOrden estado={orden.estado} />
            </div>
            <Dato etiqueta="Cliente" valor={orden.cliente} icono="usuario" />
            <Dato etiqueta="Dirección" valor={orden.direccion} icono="ubicacion" />
            <Dato etiqueta="Avería" valor={`${orden.averia} · ${orden.tipo}`} />
            <Dato etiqueta="Descripción" valor={orden.descripcion} />
          </dl>
        </Tarjeta>
      </aside>
    </form>
  );
}
