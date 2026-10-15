"use client";

// HU02 · Buscar cliente con coincidencia parcial. Desde 2 caracteres en cualquiera de los tres campos
// (DNI/RUC, código o teléfono) se filtran los clientes; si los campos se llenan varios, deben coincidir todos.
// Al elegir un cliente (o quedar uno solo) se muestran sus datos y sus últimas 5 averías, en solo lectura.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscarCliente } from "../actions";
import Icono from "@/components/Icono";
import { Tarjeta, Tabla, Aviso, Vacio, Avatar, Dato, Insignia, Etiqueta, btn, campo } from "@/components/ui";

const MINIMO = 2;
const TONO_AVERIA = { Reportada: "azul", "En diagnóstico": "violeta", Resuelta: "verde", "No resuelta": "ambar" };
const VACIO = { documento: "", codigo: "", telefono: "" };

function fecha(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

// Clientes que cumplen todos los campos que tienen 2 o más caracteres
function filtrar(clientes, f) {
  const doc = f.documento.trim();
  const cod = f.codigo.trim().toUpperCase();
  const tel = f.telefono.trim();
  const activos = [doc, cod, tel].filter((v) => v.length >= MINIMO).length;
  if (activos === 0) return { activos, coincidencias: [] };
  const coincidencias = clientes.filter(
    (c) =>
      (doc.length < MINIMO || (c.documento || "").includes(doc)) &&
      (cod.length < MINIMO || (c.codigo || "").toUpperCase().includes(cod)) &&
      (tel.length < MINIMO || (c.telefono || "").includes(tel)),
  );
  return { activos, coincidencias };
}

export default function BuscarCliente({ resultado }) {
  const router = useRouter();
  const [form, setForm] = useState(VACIO);
  const [aviso, setAviso] = useState(null);
  const [elegido, setElegido] = useState(null); // cliente de la lista
  const [detalle, setDetalle] = useState(null); // cliente con averías (buscarCliente)
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [cargando, startTransition] = useTransition();
  const [recargando, startRecarga] = useTransition();

  // Error al cargar la lista de clientes: mensaje + Reintentar
  if (!resultado.ok) {
    return (
      <Aviso
        tipo="error"
        titulo="No se pudo cargar la información"
        acciones={
          <button
            type="button"
            disabled={recargando}
            onClick={() => startRecarga(() => router.refresh())}
            className={btn.chicoSecundario}
          >
            <Icono nombre="reintentar" className="h-4 w-4" />
            {recargando ? "Cargando..." : "Reintentar"}
          </button>
        }
      >
        {resultado.error}
      </Aviso>
    );
  }

  const clientes = resultado.clientes || [];
  const { activos, coincidencias } = filtrar(clientes, form);
  const escribioAlgo = form.documento || form.codigo || form.telefono;

  function cargarDetalle(cliente) {
    setElegido(cliente);
    setDetalle(null);
    setErrorDetalle(null);
    startTransition(async () => {
      // El código es único, así que trae exactamente a este cliente
      const r = await buscarCliente(cliente.codigo);
      if (!r.ok) return setErrorDetalle(r.error);
      if (r.vacio || !r.cliente) return setErrorDetalle("Cliente no encontrado");
      setDetalle(r.cliente);
    });
  }

  function cambiar(nombre, valor) {
    const nuevo = { ...form, [nombre]: valor };
    setForm(nuevo);
    setAviso(null);
    const { coincidencias: nuevas } = filtrar(clientes, nuevo);
    if (nuevas.length === 1) {
      if (elegido?.id !== nuevas[0].id) cargarDetalle(nuevas[0]);
    } else {
      setElegido(null);
      setDetalle(null);
      setErrorDetalle(null);
    }
  }

  function buscar(evento) {
    evento.preventDefault();
    if (!escribioAlgo) setAviso("Ingresa al menos un dato: DNI/RUC, código o teléfono.");
    else if (activos === 0) setAviso(`Escribe al menos ${MINIMO} caracteres para buscar.`);
    else setAviso(null);
  }

  function limpiar() {
    setForm(VACIO);
    setAviso(null);
    setElegido(null);
    setDetalle(null);
    setErrorDetalle(null);
  }

  const averias = detalle?.averias || [];
  const sinCoincidencias = activos > 0 && coincidencias.length === 0;
  const listaVisible = coincidencias.length > 1;

  return (
    <div className="space-y-6">
      <Tarjeta titulo="Datos de búsqueda" descripcion="Con 2 caracteres ya se muestran las coincidencias." icono="clientes">
        <form onSubmit={buscar} noValidate>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <Etiqueta htmlFor="documento">DNI/RUC</Etiqueta>
              <input
                id="documento"
                inputMode="numeric"
                maxLength={11}
                value={form.documento}
                onChange={(e) => cambiar("documento", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="8 u 11 dígitos"
                autoComplete="off"
                className={campo(false)}
              />
            </div>
            <div>
              <Etiqueta htmlFor="codigo">Código de cliente</Etiqueta>
              <input
                id="codigo"
                maxLength={9}
                value={form.codigo}
                onChange={(e) => cambiar("codigo", e.target.value.toUpperCase())}
                placeholder="CLI-00001"
                autoComplete="off"
                className={campo(false)}
              />
            </div>
            <div>
              <Etiqueta htmlFor="telefono">Teléfono</Etiqueta>
              <input
                id="telefono"
                inputMode="numeric"
                maxLength={9}
                value={form.telefono}
                onChange={(e) => cambiar("telefono", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="9 dígitos"
                autoComplete="off"
                className={campo(false)}
              />
            </div>
          </div>

          {aviso && (
            <div className="mt-5">
              <Aviso tipo="alerta">{aviso}</Aviso>
            </div>
          )}
          {!aviso && escribioAlgo && activos === 0 && (
            <p className="mt-4 text-sm text-slate-500">Escribe al menos {MINIMO} caracteres para ver coincidencias.</p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={limpiar} className={btn.secundario}>
              Limpiar
            </button>
            <button type="submit" className={btn.primario}>
              <Icono nombre="clientes" className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </form>
      </Tarjeta>

      {/* Sin resultados */}
      {sinCoincidencias && (
        <Tarjeta>
          <Vacio icono="clientes" titulo="Cliente no encontrado">
            Revisa los datos ingresados o prueba con otro dato.
          </Vacio>
        </Tarjeta>
      )}

      {/* Varias coincidencias: lista para elegir */}
      {listaVisible && (
        <Tarjeta
          titulo="Coincidencias"
          descripcion="Elige al cliente para ver su información."
          acciones={<Insignia tono="azul">{coincidencias.length} clientes</Insignia>}
          sinRelleno
        >
          <Tabla columnas={["Nombre completo", "Código", "DNI/RUC", "Teléfono", { texto: "", derecha: true }]}>
            {coincidencias.map((c) => {
              const activo = elegido?.id === c.id;
              return (
                <tr key={c.id} className={activo ? "bg-marca-50/60" : "transition hover:bg-slate-50"}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={c.nombre_completo} tamano="sm" />
                      <span className="whitespace-nowrap font-medium text-slate-900">{c.nombre_completo}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-xs text-slate-500">{c.codigo}</td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">{c.documento}</td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">{c.telefono}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => cargarDetalle(c)}
                      className={activo ? btn.chico : btn.chicoSecundario}
                    >
                      {activo && <Icono nombre="check" className="h-4 w-4" />}
                      {activo ? "Seleccionado" : "Ver información"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        </Tarjeta>
      )}

      {/* Cargando detalle */}
      {elegido && cargando && (
        <Tarjeta>
          <p className="text-sm text-slate-500">Cargando información de {elegido.nombre_completo}...</p>
        </Tarjeta>
      )}

      {/* Error al traer el detalle: mensaje + Reintentar */}
      {elegido && errorDetalle && !cargando && (
        <Aviso
          tipo="error"
          titulo="No se pudo completar la búsqueda"
          acciones={
            <button type="button" onClick={() => cargarDetalle(elegido)} className={btn.chicoSecundario}>
              <Icono nombre="reintentar" className="h-4 w-4" />
              Reintentar
            </button>
          }
        >
          {errorDetalle}
        </Aviso>
      )}

      {/* Cliente: datos (solo lectura) + últimas 5 averías */}
      {detalle && !cargando && (
        <div className="animar-entrada space-y-6">
          <section className="overflow-hidden rounded-2xl border border-marca-200 bg-white shadow-sm">
            <div className="flex flex-col gap-6 bg-gradient-to-r from-marca-50 to-white p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Avatar nombre={detalle.nombre_completo} tamano="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-marca-600">Cliente encontrado</p>
                  <p className="text-lg font-semibold text-slate-900">{detalle.nombre_completo}</p>
                  <p className="tabular-nums text-xs text-slate-500">{detalle.codigo}</p>
                </div>
              </div>
              <Link href={`/agente/averias?cliente=${detalle.id}`} className={btn.primario}>
                Continuar atención: registrar avería
                <Icono nombre="flecha" className="h-4 w-4" />
              </Link>
            </div>
            <dl className="grid gap-5 border-t border-marca-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Dato etiqueta="Documento" valor={detalle.documento} icono="documento" />
              <Dato etiqueta="Teléfono" valor={detalle.telefono} icono="telefono" />
              <Dato etiqueta="Correo" valor={detalle.correo} icono="correo" />
              <Dato etiqueta="Dirección" valor={detalle.direccion} icono="ubicacion" />
            </dl>
          </section>

          <Tarjeta
            titulo="Últimas 5 averías"
            descripcion="De la más reciente a la más antigua."
            icono="averias"
            sinRelleno
          >
            {averias.length === 0 ? (
              <Vacio icono="averias" titulo="Este cliente no tiene averías registradas" />
            ) : (
              <Tabla columnas={["Código", "Fecha", "Tipo", "Estado"]}>
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
          <p className="px-1 text-xs text-slate-500">Solo lectura: no hay botones para editar ni borrar al cliente.</p>
        </div>
      )}
    </div>
  );
}
