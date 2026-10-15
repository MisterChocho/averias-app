"use client";

// HU03 · Formulario para registrar la avería que reporta el cliente.
// Usa el backend de Jhosep (./actions.js): buscarDuplicada, registrarAveria.
import { useState, useTransition } from "react";
import Link from "next/link";
import { buscarDuplicada, registrarAveria } from "./actions";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Avatar, Dato, Insignia, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

export default function FormularioAveria({ clientes, tipos, clienteInicial }) {
  const [clienteId, setClienteId] = useState(clienteInicial);
  const [tipoId, setTipoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [duplicada, setDuplicada] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [enviando, startTransition] = useTransition();

  const cliente = clientes.find((c) => c.id === clienteId);
  const tipo = tipos.find((t) => String(t.id) === String(tipoId));

  // Alerta si el cliente ya tiene una avería abierta del mismo tipo
  async function revisarDuplicada(cId, tId) {
    setDuplicada(null);
    if (!cId || !tId) return;
    const r = await buscarDuplicada(cId, tId);
    if (r.ok && r.duplicada) setDuplicada(r.averia);
  }

  function validar() {
    const e = {};
    if (!clienteId) e.cliente = "Seleccione un cliente";
    if (!tipoId) e.tipo = "El tipo de avería es obligatorio";
    if (!descripcion.trim()) e.descripcion = "La descripción es obligatoria";
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function pedirConfirmacion(evento) {
    evento.preventDefault();
    setError(null);
    if (validar()) setConfirmando(true);
  }

  function guardar() {
    startTransition(async () => {
      const r = await registrarAveria({ clienteId, tipoId, descripcion });
      setConfirmando(false);
      if (!r.ok) {
        if (r.errores) setErrores(r.errores);
        if (r.error) setError(r.error);
        return;
      }
      setResultado(Array.isArray(r.averia) ? r.averia[0] : r.averia);
    });
  }

  function nuevaAveria() {
    setResultado(null);
    setTipoId("");
    setDescripcion("");
    setErrores({});
    setDuplicada(null);
  }

  // Avería registrada: muestra el código y el siguiente paso
  if (resultado) {
    return (
      <Tarjeta className="animar-entrada">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <Icono nombre="checkCirculo" className="h-7 w-7" />
          </span>
          <p className="mt-5 text-lg font-semibold text-slate-900">
            Avería <span className="tabular-nums">{resultado.codigo}</span> registrada correctamente
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cliente: <strong className="font-medium text-slate-700">{cliente?.nombre_completo}</strong> · Estado:{" "}
            <Insignia tono={resultado.estado === "No resuelta" ? "ambar" : "azul"} punto>
              {resultado.estado}
            </Insignia>
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {resultado.habilita_guia && (
              <Link href={`/agente/averias/guia?averia=${resultado.id}`} className={btn.primario}>
                <Icono nombre="libro" className="h-4 w-4" />
                Iniciar guía de diagnóstico
              </Link>
            )}
            {resultado.habilita_orden && (
              <Link href={`/agente/ordenes/nueva?averia=${resultado.id}`} className={btn.primario}>
                <Icono nombre="herramienta" className="h-4 w-4" />
                Generar orden para técnico
              </Link>
            )}
            <button type="button" onClick={nuevaAveria} className={btn.secundario}>
              <Icono nombre="mas" className="h-4 w-4" />
              Registrar otra avería
            </button>
          </div>
        </div>
      </Tarjeta>
    );
  }

  return (
    <form onSubmit={pedirConfirmacion} className="grid gap-6 lg:grid-cols-3">
      {/* Columna principal */}
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta titulo="Datos de la avería" descripcion="Los campos con * son obligatorios." icono="averias">
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Etiqueta htmlFor="cliente" obligatorio>
                  Cliente
                </Etiqueta>
                <select
                  id="cliente"
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setConfirmando(false);
                    revisarDuplicada(e.target.value, tipoId);
                  }}
                  className={campo(errores.cliente)}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_completo} ({c.codigo})
                    </option>
                  ))}
                </select>
                <ErrorCampo>{errores.cliente}</ErrorCampo>
              </div>

              <div>
                <Etiqueta htmlFor="tipo" obligatorio>
                  Tipo de avería
                </Etiqueta>
                <select
                  id="tipo"
                  value={tipoId}
                  onChange={(e) => {
                    setTipoId(e.target.value);
                    setConfirmando(false);
                    revisarDuplicada(clienteId, e.target.value);
                  }}
                  className={campo(errores.tipo)}
                >
                  <option value="">Selecciona el tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                <ErrorCampo>{errores.tipo}</ErrorCampo>
              </div>
            </div>

            <div>
              <Etiqueta htmlFor="descripcion" obligatorio>
                Descripción
              </Etiqueta>
              <textarea
                id="descripcion"
                rows={5}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla lo que reporta el cliente: qué falla, desde cuándo y qué ya intentó."
                className={campo(errores.descripcion)}
              />
              <ErrorCampo>{errores.descripcion}</ErrorCampo>
            </div>
          </div>
        </Tarjeta>

        {duplicada && (
          <Aviso tipo="alerta" titulo="Posible avería duplicada">
            Este cliente ya tiene una avería abierta de este tipo — <strong className="tabular-nums">{duplicada.codigo}</strong> (
            {duplicada.estado}).
          </Aviso>
        )}

        {error && <Aviso tipo="error">{error}</Aviso>}

        {/* Acciones */}
        {!confirmando ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            {!clienteId && <p className="text-sm text-slate-500">Selecciona un cliente para habilitar el registro.</p>}
            <button type="submit" disabled={!clienteId} className={btn.primario}>
              Registrar avería
            </button>
          </div>
        ) : (
          <div className="animar-entrada rounded-2xl border border-marca-200 bg-marca-50/60 p-5">
            <p className="text-sm text-marca-900">
              ¿Confirmas el registro de la avería <strong>{tipo?.nombre}</strong> para{" "}
              <strong>{cliente?.nombre_completo}</strong>?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={guardar} disabled={enviando} className={btn.primario}>
                <Icono nombre="check" className="h-4 w-4" />
                {enviando ? "Registrando..." : "Sí, registrar"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className={btn.secundario}>
                Revisar datos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Columna lateral: resumen */}
      <aside className="space-y-6">
        <Tarjeta titulo="Cliente" icono="usuario">
          {cliente ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar nombre={cliente.nombre_completo} />
                <div>
                  <p className="font-medium text-slate-900">{cliente.nombre_completo}</p>
                  <p className="tabular-nums text-xs text-slate-500">{cliente.codigo}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Dato etiqueta="DNI/RUC" valor={cliente.documento} />
                <Dato etiqueta="Teléfono" valor={cliente.telefono} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aún no seleccionas un cliente.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Se registra automáticamente" icono="reloj">
          <dl className="space-y-4">
            <Dato etiqueta="Código, fecha y hora" valor="Se generan al guardar" />
            <Dato etiqueta="Agente" valor="Se registra automáticamente" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado inicial</dt>
              <dd className="mt-1">
                <Insignia tono="azul" punto>
                  Reportada
                </Insignia>
              </dd>
            </div>
            {tipo && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {tipo.requiere_tecnico
                  ? "Requiere técnico: se habilitará la generación de la orden."
                  : "Falla simple: se habilitará la guía de diagnóstico."}
              </div>
            )}
          </dl>
        </Tarjeta>
      </aside>
    </form>
  );
}
