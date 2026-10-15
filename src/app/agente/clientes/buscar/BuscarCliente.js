"use client";

// HU02 · Buscar cliente. Una sola caja: el agente escribe DNI/RUC, código o teléfono (con uno basta).
// Valida el formato antes de consultar, muestra los datos del cliente (solo lectura) con sus últimas
// 5 averías y permite continuar la atención registrando una avería (HU03).
// Backend (JOJO-39): buscarCliente(termino) en ../actions.js
import { useState, useTransition } from "react";
import Link from "next/link";
import { buscarCliente } from "../actions";
import Icono from "@/components/Icono";
import { Tarjeta, Tabla, Aviso, Vacio, Avatar, Dato, Insignia, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

const DOCUMENTO = /^([0-9]{8}|[0-9]{11})$/;
const TELEFONO = /^[0-9]{9}$/;
const CODIGO = /^CLI-[0-9]{5}$/;

const TONO_AVERIA = { Reportada: "azul", "En diagnóstico": "violeta", Resuelta: "verde", "No resuelta": "ambar" };

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default function BuscarCliente() {
  const [termino, setTermino] = useState("");
  const [errorCampo, setErrorCampo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [ultimoTermino, setUltimoTermino] = useState("");
  const [cargando, startTransition] = useTransition();

  function validar(valor) {
    if (!valor) return "Ingresa al menos un dato: DNI/RUC, código o teléfono.";
    if (DOCUMENTO.test(valor) || TELEFONO.test(valor) || CODIGO.test(valor)) return null;
    if (/^[0-9]+$/.test(valor)) return "Un DNI tiene 8 dígitos, un RUC 11 y un teléfono 9.";
    return "Usa el formato CLI-00001 para el código.";
  }

  function consultar(valor) {
    setUltimoTermino(valor);
    startTransition(async () => {
      const r = await buscarCliente(valor);
      if (!r.ok) return setResultado({ tipo: "error", error: r.error });
      if (r.vacio || !r.cliente) return setResultado({ tipo: "noEncontrado", mensaje: r.mensaje || "Cliente no encontrado" });
      setResultado({ tipo: "cliente", cliente: r.cliente });
    });
  }

  function buscar(evento) {
    evento.preventDefault();
    const valor = termino.trim().toUpperCase();
    setResultado(null);
    const e = validar(valor);
    setErrorCampo(e);
    if (!e) consultar(valor);
  }

  function limpiar() {
    setTermino("");
    setErrorCampo(null);
    setResultado(null);
  }

  const cliente = resultado?.tipo === "cliente" ? resultado.cliente : null;
  const averias = cliente?.averias || [];

  return (
    <div className="space-y-6">
      <Tarjeta titulo="Datos de búsqueda" descripcion="Escribe el dato completo del cliente: DNI (8 dígitos), RUC (11), código (CLI-00001) o teléfono (9)." icono="clientes">
        <form onSubmit={buscar} noValidate>
          <Etiqueta htmlFor="termino">DNI/RUC, código o teléfono</Etiqueta>
          <input
            id="termino"
            value={termino}
            maxLength={11}
            onChange={(e) => {
              setTermino(e.target.value);
              if (errorCampo) setErrorCampo(null);
            }}
            placeholder="Ej.: 70123456, CLI-00001 o 949111222"
            className={campo(errorCampo)}
          />
          <ErrorCampo>{errorCampo}</ErrorCampo>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={limpiar} disabled={cargando} className={btn.secundario}>
              Limpiar
            </button>
            <button type="submit" disabled={cargando} className={btn.primario}>
              <Icono nombre="clientes" className="h-4 w-4" />
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>
      </Tarjeta>

      {/* Error: mensaje informativo + Reintentar */}
      {resultado?.tipo === "error" && (
        <Aviso
          tipo="error"
          titulo="No se pudo completar la búsqueda"
          acciones={
            <button type="button" disabled={cargando} onClick={() => consultar(ultimoTermino)} className={btn.chicoSecundario}>
              <Icono nombre="reintentar" className="h-4 w-4" />
              {cargando ? "Cargando..." : "Reintentar"}
            </button>
          }
        >
          {resultado.error}
        </Aviso>
      )}

      {/* Sin resultados */}
      {resultado?.tipo === "noEncontrado" && (
        <Tarjeta>
          <Vacio icono="clientes" titulo={resultado.mensaje}>
            Revisa el dato ingresado o busca de nuevo con otro.
          </Vacio>
        </Tarjeta>
      )}

      {/* Cliente encontrado: datos (solo lectura) + últimas averías */}
      {cliente && (
        <div className="animar-entrada space-y-6">
          <section className="overflow-hidden rounded-2xl border border-marca-200 bg-white shadow-sm">
            <div className="flex flex-col gap-6 bg-gradient-to-r from-marca-50 to-white p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Avatar nombre={cliente.nombre_completo} tamano="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-marca-600">Cliente encontrado</p>
                  <p className="text-lg font-semibold text-slate-900">{cliente.nombre_completo}</p>
                  <p className="tabular-nums text-xs text-slate-500">{cliente.codigo}</p>
                </div>
              </div>
              <Link href={`/agente/averias?cliente=${cliente.id}`} className={btn.primario}>
                Continuar atención: registrar avería
                <Icono nombre="flecha" className="h-4 w-4" />
              </Link>
            </div>
            <dl className="grid gap-5 border-t border-marca-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Dato etiqueta="DNI/RUC" valor={cliente.documento} icono="documento" />
              <Dato etiqueta="Teléfono" valor={cliente.telefono} icono="telefono" />
              <Dato etiqueta="Correo" valor={cliente.correo} icono="correo" />
              <Dato etiqueta="Dirección" valor={cliente.direccion} icono="ubicacion" />
            </dl>
          </section>

          <Tarjeta
            titulo="Historial de averías"
            descripcion="Las últimas 5 averías del cliente, de la más reciente a la más antigua."
            icono="averias"
            sinRelleno
          >
            {averias.length === 0 ? (
              <Vacio icono="averias" titulo="Este cliente no tiene averías registradas" />
            ) : (
              <Tabla columnas={["Avería", "Fecha", "Tipo", "Estado"]}>
                {averias.map((a) => (
                  <tr key={a.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-sm font-medium text-slate-900">{a.codigo}</td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">{fecha(a.fecha ?? a.fecha_registro)}</td>
                    <td className="px-6 py-3.5 text-slate-600">{typeof a.tipo === "string" ? a.tipo : a.tipo?.nombre}</td>
                    <td className="px-6 py-3.5">
                      <Insignia tono={TONO_AVERIA[a.estado] || "gris"} punto>
                        {a.estado}
                      </Insignia>
                    </td>
                  </tr>
                ))}
              </Tabla>
            )}
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
