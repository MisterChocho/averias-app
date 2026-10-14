"use client";

// HU08 · Cancelar orden (JOJO-83 interfaz, JOJO-86 frontend) — Sneider Araneda
// Botón + ventana que pide el motivo (obligatorio) y la confirmación antes de cancelar.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarOrden } from "./actions";

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
      <button
        type="button"
        onClick={abrir}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
      >
        Cancelar
      </button>

      {aviso && <p className="mt-1 text-xs text-red-700">{aviso}</p>}

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-cancelar-${orden.id}`}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 id={`titulo-cancelar-${orden.id}`} className="text-lg font-semibold text-slate-900">
              Cancelar la orden {orden.codigo}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cliente: {orden.averia?.cliente?.nombre_completo} · Estado actual: {orden.estado}
            </p>
            {orden.estado === "Asignada" && orden.tecnico && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Se notificará la cancelación al técnico {orden.tecnico.nombre_completo}.
              </p>
            )}

            <label htmlFor={`motivo-${orden.id}`} className="mt-4 block text-sm font-medium text-slate-700">
              Motivo de la cancelación <span className="text-red-600">*</span>
            </label>
            <textarea
              id={`motivo-${orden.id}`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="Ej.: El cliente informa que el servicio volvió a funcionar."
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                error ? "border-red-500" : "border-slate-300 focus:border-blue-600"
              }`}
            />
            {error && <p className="mt-1 text-sm text-red-700">{error}</p>}

            <p className="mt-4 text-sm text-slate-700">¿Seguro que deseas cancelar esta orden?</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={enviando}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {enviando ? "Cancelando..." : "Sí, cancelar orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
