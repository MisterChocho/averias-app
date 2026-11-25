"use client";

// HU10 · Editor de zonas por técnico (JOJO-99 frontend) — Sneider Araneda
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarZonas } from "./actions";
import { Tarjeta, Aviso, Insignia, btn } from "@/components/ui";

function TarjetaTecnico({ tecnico, zonas }) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState(tecnico.zonaIds);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, startTransition] = useTransition();

  const original = [...tecnico.zonaIds].sort((a, b) => a - b).join(",");
  const actual = [...elegidas].sort((a, b) => a - b).join(",");
  const hayCambios = original !== actual;

  function alternar(id) {
    setError(null);
    setExito(null);
    setElegidas((prev) => (prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]));
  }

  function guardar() {
    setError(null);
    setExito(null);
    if (elegidas.length === 0) return setError("Asigna al menos una zona.");
    startTransition(async () => {
      const r = await guardarZonas({ tecnicoId: tecnico.id, zonaIds: elegidas });
      if (!r.ok) return setError(r.error);
      setExito("Zonas actualizadas. El cambio ya rige para sus órdenes disponibles.");
      router.refresh();
    });
  }

  return (
    <Tarjeta
      titulo={tecnico.nombre}
      descripcion={`${elegidas.length} ${elegidas.length === 1 ? "zona asignada" : "zonas asignadas"}`}
      icono="zonas"
      acciones={
        <Insignia tono={tecnico.estado === "Activo" ? "verde" : "gris"} punto>
          {tecnico.estado}
        </Insignia>
      }
    >
      <div className="flex flex-wrap gap-2">
        {zonas.map((z) => {
          const activa = elegidas.includes(z.id);
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => alternar(z.id)}
              aria-pressed={activa}
              disabled={enviando}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activa
                  ? "border-marca-600 bg-marca-600 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {z.nombre}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      {exito && (
        <div className="mt-4">
          <Aviso tipo="exito">{exito}</Aviso>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={guardar} disabled={enviando || !hayCambios} className={btn.chico}>
          {enviando ? "Guardando..." : "Guardar zonas"}
        </button>
      </div>
    </Tarjeta>
  );
}

export default function EditorZonas({ tecnicos, zonas }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tecnicos.map((t) => (
        // La clave incluye las zonas guardadas para reiniciar el editor tras guardar
        <TarjetaTecnico key={`${t.id}-${t.zonaIds.join(",")}`} tecnico={t} zonas={zonas} />
      ))}
    </div>
  );
}
