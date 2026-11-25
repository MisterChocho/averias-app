"use client";

// HU24 · Botón «Tomar orden» con confirmación (JOJO-96 frontend) — Sneider Araneda
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoasignarse } from "./actions";
import Icono from "@/components/Icono";
import { btn } from "@/components/ui";

export default function TomarOrden({ ordenId, codigo, deshabilitado }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, startTransition] = useTransition();

  function tomar() {
    setError(null);
    startTransition(async () => {
      const r = await autoasignarse(ordenId);
      if (!r.ok) {
        setConfirmando(false);
        setError(r.error);
        router.refresh();
        return;
      }
      router.push(`/tecnico/mis-ordenes?asignada=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <button type="button" disabled={deshabilitado} onClick={() => setConfirmando(true)} className={btn.chico}>
            <Icono nombre="mas" className="h-4 w-4" />
            Tomar orden
          </button>
        </div>
        {error && <p className="text-right text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="animar-entrada rounded-xl border border-marca-200 bg-marca-50/60 p-4">
      <p className="text-sm text-marca-900">
        ¿Tomar la orden <strong>{codigo}</strong>? Pasará a «Asignada» y ningún otro técnico podrá tomarla.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={tomar} disabled={enviando} className={btn.chico}>
          <Icono nombre="check" className="h-4 w-4" />
          {enviando ? "Asignando..." : "Sí, tomar"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className={btn.chicoSecundario}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
