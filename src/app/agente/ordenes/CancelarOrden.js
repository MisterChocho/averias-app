"use client";

// HU08 · Cancelar orden (JOJO-83 interfaz, JOJO-86 frontend) — Sneider Araneda
// Botón + ventana que pide el motivo (obligatorio) y la confirmación antes de cancelar.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarOrden } from "./actions";
import Icono from "@/components/Icono";
import { Aviso, ErrorCampo, Etiqueta, btn, campo } from "@/components/ui";
import EstadoOrden from "./EstadoOrden";

const CANCELABLES = ["Pendiente", "Asignada"];

export default function CancelarOrden({ orden }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, startTransition] = useTransition();

  if (orden.estado === "Cancelada") return null;

  function abrir() {
    setAviso(null);
    // Criterio HU08: si está En atención o Cerrada se impide y se muestra el mensaje
    if (!CANCELABLES.includes(orden.estado)) {
      setAviso("Esta orden no puede cancelarse en su estado actual.");
      return;
    }
    setMotivo("");
    setError(null);
    setAbierto(true);
  }

  function confirmar() {
    if (!motivo.trim()) {
      setError("El motivo de la cancelación es obligatorio.");
      return;
    }
    startTransition(async () => {
      const r = await cancelarOrden({ ordenId: orden.id, motivo });
      if (!r.ok) {
        // La orden conserva su estado anterior; se muestra el error
        setError(r.error);
        return;
      }
      setAbierto(false);
      router.push(`/agente/ordenes?cancelada=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <button type="button" onClick={abrir} className={btn.peligroSuave}>
        Cancelar
      </button>

      {aviso && (
        <p className="animar-entrada ml-auto mt-2 flex max-w-[13rem] items-start gap-1 text-left text-xs text-red-600">
          <Icono nombre="alerta" className="h-3.5 w-3.5 shrink-0" />
          {aviso}
        </p>
      )}

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 text-left backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-cancelar-${orden.id}`}
        >
          <div className="animar-entrada w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex gap-4 p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icono nombre="alerta" className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h2 id={`titulo-cancelar-${orden.id}`} className="text-lg font-semibold text-slate-900">
                  Cancelar la orden <span className="tabular-nums">{orden.codigo}</span>
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  {orden.averia?.cliente?.nombre_completo} · Estado actual: <EstadoOrden estado={orden.estado} />
                </p>

                {orden.estado === "Asignada" && orden.tecnico && (
                  <div className="mt-4">
                    <Aviso tipo="alerta">
                      Se notificará la cancelación al técnico {orden.tecnico.nombre_completo}.
                    </Aviso>
                  </div>
                )}

                <div className="mt-4">
                  <Etiqueta htmlFor={`motivo-${orden.id}`} obligatorio>
                    Motivo de la cancelación
                  </Etiqueta>
                  <textarea
                    id={`motivo-${orden.id}`}
                    value={motivo}
                    onChange={(e) => {
                      setMotivo(e.target.value);
                      if (error) setError(null);
                    }}
                    rows={3}
                    placeholder="Ej.: El cliente informa que el servicio volvió a funcionar."
                    className={campo(error)}
                  />
                  <ErrorCampo>{error}</ErrorCampo>
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700">¿Seguro que deseas cancelar esta orden?</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setAbierto(false)} disabled={enviando} className={btn.secundario}>
                Volver
              </button>
              <button type="button" onClick={confirmar} disabled={enviando} className={btn.peligro}>
                {enviando ? "Cancelando..." : "Sí, cancelar orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
