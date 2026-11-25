"use client";

// HU09 · Activar / desactivar un técnico, con confirmación (JOJO-98 frontend) — Sneider Araneda
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoTecnico } from "./actions";
import { btn } from "@/components/ui";

export default function BotonEstado({ tecnicoId, nombre, estado, activas }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, startTransition] = useTransition();

  const nuevo = estado === "Activo" ? "Inactivo" : "Activo";

  function aplicar() {
    setError(null);
    startTransition(async () => {
      const r = await cambiarEstadoTecnico({ tecnicoId, estado: nuevo });
      if (!r.ok) {
        setConfirmando(false);
        return setError(r.error);
      }
      setConfirmando(false);
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className={estado === "Activo" ? btn.peligroSuave : btn.chicoSecundario}
        >
          {estado === "Activo" ? "Desactivar" : "Activar"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
      <p className="text-xs text-slate-700">
        {nuevo === "Inactivo" ? (
          <>
            ¿Desactivar a <strong>{nombre}</strong>? Dejará de poder autoasignarse órdenes de inmediato.
            {activas > 0 && ` Tiene ${activas} ${activas === 1 ? "orden activa" : "órdenes activas"} que no se reasignan solas.`}
          </>
        ) : (
          <>
            ¿Activar a <strong>{nombre}</strong>? Podrá volver a autoasignarse órdenes.
          </>
        )}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={aplicar} disabled={enviando} className={nuevo === "Inactivo" ? btn.peligro : btn.chico}>
          {enviando ? "Guardando..." : "Confirmar"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className={btn.chicoSecundario}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
