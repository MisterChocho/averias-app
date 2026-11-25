"use client";

// HU11 · Fila editable de capacidad (JOJO-100 frontend) — Sneider Araneda
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarCapacidad } from "./actions";
import { Insignia, Avatar, btn, campo } from "@/components/ui";

export default function FilaCapacidad({ tecnico, minimo, maximo }) {
  const router = useRouter();
  const [valor, setValor] = useState(String(tecnico.limite));
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, startTransition] = useTransition();

  const n = Number(valor);
  const valido = valor !== "" && Number.isInteger(n) && n >= minimo && n <= maximo;
  const hayCambios = valido && n !== tecnico.limite;
  const lleno = tecnico.activas >= tecnico.limite;

  function guardar() {
    setError(null);
    setExito(null);
    if (!valido) return setError(`Ingresa un número entre ${minimo} y ${maximo}.`);
    startTransition(async () => {
      const r = await guardarCapacidad({ tecnicoId: tecnico.id, limite: n });
      if (!r.ok) return setError(r.error);
      setExito(
        r.superaLimite
          ? "Límite guardado. Conserva las órdenes que tiene, pero no podrá tomar nuevas hasta quedar por debajo."
          : "Límite guardado."
      );
      router.refresh();
    });
  }

  return (
    <tr className="align-top">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar nombre={tecnico.nombre} tamano="sm" />
          <p className="font-medium text-slate-900">{tecnico.nombre}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <Insignia tono={tecnico.estado === "Activo" ? "verde" : "gris"} punto>
          {tecnico.estado}
        </Insignia>
      </td>
      <td className="px-6 py-4">
        <Insignia tono={lleno ? "rojo" : "azul"}>
          {tecnico.activas} {tecnico.activas === 1 ? "activa" : "activas"}
        </Insignia>
        {lleno && <p className="mt-1 text-xs text-red-600">En su límite: no puede tomar más órdenes.</p>}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-start gap-2">
          <div>
            <input
              type="number"
              inputMode="numeric"
              min={minimo}
              max={maximo}
              value={valor}
              aria-label={`Límite de órdenes de ${tecnico.nombre}`}
              onChange={(e) => {
                setValor(e.target.value);
                setError(null);
                setExito(null);
              }}
              className={`${campo(Boolean(error))} !mt-0 w-24`}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            {exito && !error && <p className="mt-1 max-w-xs text-xs text-emerald-700">{exito}</p>}
          </div>
          <button type="button" onClick={guardar} disabled={enviando || !hayCambios} className={btn.chico}>
            {enviando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
