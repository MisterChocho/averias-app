"use client";

// HU04 · Guía de diagnóstico y solución (JOJO-65 frontend) — Sneider Araneda
// Muestra los pasos numerados, uno por vez, y al final pide el resultado: Resuelta / No resuelta.
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { iniciarGuia, guardarPaso, finalizarGuia, derivarATecnico } from "./actions";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Dato, Insignia, btn } from "@/components/ui";

export default function GuiaDiagnostico({ averia, guia }) {
  const total = guia ? guia.pasos.length : 0;
  // Si la llamada se cortó antes, se retoma desde el último paso registrado
  const pasoInicial = Math.min(Math.max(averia.ultimoPaso || 1, 1), Math.max(total, 1));
  const [indice, setIndice] = useState(pasoInicial);
  const [error, setError] = useState(null);
  const [final, setFinal] = useState(null);
  const [enviando, startTransition] = useTransition();
  const iniciada = useRef(false);

  // Al abrir la guía la avería pasa a «En diagnóstico» (solo si hay guía que seguir)
  useEffect(() => {
    if (iniciada.current || !guia || averia.estado !== "Reportada") return;
    iniciada.current = true;
    iniciarGuia(averia.id).then((r) => {
      if (!r.ok) setError(r.error);
    });
  }, [averia.id, averia.estado, guia]);

  function irAlPaso(nuevo) {
    setIndice(nuevo);
    setError(null);
    guardarPaso(averia.id, nuevo);
  }

  function terminar(resultado) {
    setError(null);
    startTransition(async () => {
      const r = await finalizarGuia(averia.id, resultado);
      if (!r.ok) return setError(r.error);
      setFinal({ resultado });
    });
  }

  function derivar() {
    setError(null);
    startTransition(async () => {
      const r = await derivarATecnico(averia.id);
      if (!r.ok) return setError(r.error);
      setFinal({ resultado: "No resuelta", derivada: true });
    });
  }

  const resumen = (
    <Tarjeta titulo="Avería" descripcion="Datos de la llamada." icono="averias">
      <dl className="space-y-4">
        <div className="flex items-center justify-between">
          <Dato etiqueta="Código" valor={averia.codigo} />
          <Insignia tono="violeta" punto>
            {final ? final.resultado : "En diagnóstico"}
          </Insignia>
        </div>
        <Dato etiqueta="Cliente" valor={averia.cliente} />
        <Dato etiqueta="Tipo" valor={averia.tipo} />
        <Dato etiqueta="Descripción" valor={averia.descripcion} />
      </dl>
    </Tarjeta>
  );

  // Resultado final
  if (final) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {final.resultado === "Resuelta" ? (
            <Aviso
              tipo="exito"
              titulo="Avería resuelta por teléfono"
              acciones={
                <Link href={`/agente/averias/valoracion?averia=${averia.id}`} className={btn.chico}>
                  Registrar valoración del cliente
                </Link>
              }
            >
              La avería <strong>{averia.codigo}</strong> quedó <strong>Resuelta</strong>.
            </Aviso>
          ) : (
            <Aviso
              tipo="alerta"
              titulo="La avería no se resolvió"
              acciones={
                <Link href={`/agente/ordenes/nueva?averia=${averia.id}`} className={btn.chico}>
                  Generar orden para técnico
                </Link>
              }
            >
              La avería <strong>{averia.codigo}</strong> quedó <strong>No resuelta</strong>. Se debe generar una orden
              para que la atienda un técnico.
            </Aviso>
          )}
        </div>
        <aside>{resumen}</aside>
      </div>
    );
  }

  // El tipo de avería no tiene guía
  if (!guia) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Aviso
            tipo="alerta"
            titulo="No hay guía disponible para este tipo de avería"
            acciones={
              <button type="button" onClick={derivar} disabled={enviando} className={btn.chico}>
                {enviando ? "Derivando..." : "Derivar a técnico"}
              </button>
            }
          >
            Deriva la avería a un técnico para continuar con la atención.
          </Aviso>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
        <aside>{resumen}</aside>
      </div>
    );
  }

  const paso = guia.pasos[indice - 1];
  const esUltimo = indice === total;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta
          titulo={guia.titulo}
          descripcion={`Paso ${indice} de ${total}`}
          icono="libro"
          acciones={<Insignia tono="azul">{indice}/{total}</Insignia>}
        >
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-600 text-base font-semibold text-white">
              {paso.orden}
            </span>
            <p className="pt-1.5 text-lg text-slate-900">{paso.instruccion}</p>
          </div>

          {averia.ultimoPaso > 1 && indice === averia.ultimoPaso && (
            <p className="mt-4 text-xs text-slate-500">Retomando desde el último paso registrado.</p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => irAlPaso(indice - 1)}
              disabled={indice === 1 || enviando}
              className={btn.secundario}
            >
              <Icono nombre="atras" className="h-4 w-4" />
              Paso anterior
            </button>
            {!esUltimo && (
              <button type="button" onClick={() => irAlPaso(indice + 1)} disabled={enviando} className={btn.primario}>
                Siguiente paso
                <Icono nombre="flecha" className="h-4 w-4" />
              </button>
            )}
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {/* El resultado se puede indicar en cualquier momento (la falla puede resolverse antes) */}
        <Tarjeta titulo="Resultado de la guía" descripcion="Indica cómo terminó la atención por teléfono." icono="checkCirculo">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => terminar("Resuelta")} disabled={enviando} className={btn.primario}>
              <Icono nombre="check" className="h-4 w-4" />
              Resuelta
            </button>
            <button type="button" onClick={() => terminar("No resuelta")} disabled={enviando} className={btn.peligro}>
              <Icono nombre="x" className="h-4 w-4" />
              No resuelta
            </button>
          </div>
        </Tarjeta>
      </div>
      <aside>{resumen}</aside>
    </div>
  );
}
