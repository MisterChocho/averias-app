"use client";

// HU05 · Registrar valoración del cliente (JOJO-72 frontend) — Sneider Araneda
// Puntaje 1 a 5 o «El cliente no desea valorar». Comentario obligatorio si es 1 o 2.
// Una sola valoración por avería: si ya existe, se muestra en solo lectura.
import { useState, useTransition } from "react";
import Link from "next/link";
import { registrarValoracion } from "./actions";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Dato, Insignia, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

export default function FormularioValoracion({ averia, existente }) {
  const [puntaje, setPuntaje] = useState(0);
  const [noDesea, setNoDesea] = useState(false);
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [enviando, startTransition] = useTransition();

  const resumen = (
    <Tarjeta titulo="Avería" descripcion="Atendida por teléfono." icono="averias">
      <dl className="space-y-4">
        <div className="flex items-center justify-between">
          <Dato etiqueta="Código" valor={averia.codigo} />
          <Insignia tono="verde" punto>
            Resuelta
          </Insignia>
        </div>
        <Dato etiqueta="Cliente" valor={averia.cliente} />
        <Dato etiqueta="Tipo" valor={averia.tipo} />
        <Dato etiqueta="Descripción" valor={averia.descripcion} />
      </dl>
    </Tarjeta>
  );

  // Ya valorada: solo lectura (no se edita ni se elimina)
  if (existente || guardada) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Aviso
            tipo="exito"
            titulo={guardada ? "Valoración registrada correctamente" : "Esta avería ya tiene una valoración registrada"}
            acciones={
              <Link href="/agente/averias" className={btn.chicoSecundario}>
                Volver a averías
              </Link>
            }
          >
            {existente
              ? existente.no_desea
                ? "El cliente no desea valorar."
                : `Puntaje: ${existente.puntaje} de 5.${existente.comentario ? ` Comentario: ${existente.comentario}` : ""}`
              : "Ya no se puede editar ni eliminar."}
          </Aviso>
        </div>
        <aside>{resumen}</aside>
      </div>
    );
  }

  function validar() {
    const e = {};
    if (!noDesea && !puntaje) e.puntaje = "Elige un puntaje del 1 al 5 o «El cliente no desea valorar».";
    if (!noDesea && puntaje && puntaje <= 2 && !comentario.trim()) {
      e.comentario = "El comentario es obligatorio cuando el puntaje es 1 o 2.";
    }
    return e;
  }

  function pedirConfirmacion(ev) {
    ev.preventDefault();
    setError(null);
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length === 0) setConfirmando(true);
  }

  function guardar() {
    startTransition(async () => {
      const r = await registrarValoracion({ averiaId: averia.id, puntaje, noDesea, comentario });
      if (!r.ok) {
        setConfirmando(false);
        setErrores(r.errores || {});
        setError(r.error);
        return;
      }
      setGuardada(true);
    });
  }

  const comentarioObligatorio = !noDesea && puntaje > 0 && puntaje <= 2;

  return (
    <form onSubmit={pedirConfirmacion} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta titulo="Valoración" descripcion="Una sola valoración por avería; no se puede editar después." icono="estrella">
          <div className="space-y-5">
            <div>
              <Etiqueta obligatorio>Puntaje</Etiqueta>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={noDesea}
                    aria-pressed={puntaje === n}
                    onClick={() => {
                      setPuntaje(n);
                      setConfirmando(false);
                    }}
                    className={`h-11 w-11 rounded-lg border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      puntaje === n
                        ? "border-marca-600 bg-marca-600 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={noDesea}
                  onChange={(e) => {
                    setNoDesea(e.target.checked);
                    if (e.target.checked) setPuntaje(0);
                    setConfirmando(false);
                  }}
                />
                El cliente no desea valorar
              </label>
              <ErrorCampo>{errores.puntaje}</ErrorCampo>
            </div>

            <div>
              <Etiqueta htmlFor="comentario" obligatorio={comentarioObligatorio} opcional={!comentarioObligatorio}>
                Comentario
              </Etiqueta>
              <textarea
                id="comentario"
                rows={3}
                value={comentario}
                onChange={(e) => {
                  setComentario(e.target.value);
                  setConfirmando(false);
                }}
                className={campo(errores.comentario)}
              />
              <ErrorCampo>{errores.comentario}</ErrorCampo>
            </div>
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {!confirmando ? (
          <div className="flex justify-end">
            <button type="submit" className={btn.primario}>
              Guardar valoración
            </button>
          </div>
        ) : (
          <div className="animar-entrada rounded-2xl border border-marca-200 bg-marca-50/60 p-5">
            <p className="text-sm text-marca-900">
              ¿Guardar la valoración de <strong>{averia.cliente}</strong>? Después no se podrá editar ni eliminar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={guardar} disabled={enviando} className={btn.primario}>
                <Icono nombre="check" className="h-4 w-4" />
                {enviando ? "Guardando..." : "Sí, guardar"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className={btn.secundario}>
                Revisar datos
              </button>
            </div>
          </div>
        )}
      </div>
      <aside>{resumen}</aside>
    </form>
  );
}
