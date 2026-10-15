"use client";

// HU01 · Lista de clientes (solo lectura). Al seleccionar uno se ve su información
// y se continúa con la atención registrando la avería (HU03).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icono from "@/components/Icono";
import { Tarjeta, Tabla, Aviso, Vacio, Avatar, Dato, Insignia, btn } from "@/components/ui";

export default function ClientesLista({ resultado }) {
  const router = useRouter();
  const [cargando, startTransition] = useTransition();
  const [seleccionadoId, setSeleccionadoId] = useState(null);

  // Caso error: mensaje + Reintentar
  if (!resultado.ok) {
    return (
      <Aviso
        tipo="error"
        titulo="No se pudo cargar la información"
        acciones={
          <button
            type="button"
            disabled={cargando}
            onClick={() => startTransition(() => router.refresh())}
            className={btn.chicoSecundario}
          >
            <Icono nombre="reintentar" className="h-4 w-4" />
            {cargando ? "Cargando..." : "Reintentar"}
          </button>
        }
      >
        {resultado.error}
      </Aviso>
    );
  }

  // Caso vacío
  if (resultado.vacio) {
    return (
      <Tarjeta>
        <Vacio icono="clientes" titulo={resultado.mensaje}>
          Cuando se registren clientes aparecerán aquí.
        </Vacio>
      </Tarjeta>
    );
  }

  const seleccionado = resultado.clientes.find((c) => c.id === seleccionadoId);

  return (
    <div className="space-y-6">
      {seleccionado && (
        <section className="animar-entrada overflow-hidden rounded-2xl border border-marca-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 bg-gradient-to-r from-marca-50 to-white p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Avatar nombre={seleccionado.nombre_completo} tamano="lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-marca-600">Cliente seleccionado</p>
                <p className="text-lg font-semibold text-slate-900">{seleccionado.nombre_completo}</p>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-lg">
              <Dato etiqueta="Código" valor={seleccionado.codigo} />
              <Dato etiqueta="DNI/RUC" valor={seleccionado.documento} icono="documento" />
              <Dato etiqueta="Teléfono" valor={seleccionado.telefono} icono="telefono" />
            </dl>
            {/* HU01 → HU03: continuar con la atención registrando la avería del cliente */}
            <Link href={`/agente/averias?cliente=${seleccionado.id}`} className={btn.primario}>
              Continuar atención: registrar avería
              <Icono nombre="flecha" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <Tarjeta
        titulo="Clientes registrados"
        descripcion="Ordenados por nombre. Esta lista es de solo lectura."
        acciones={<Insignia tono="azul">{resultado.clientes.length} clientes</Insignia>}
        sinRelleno
      >
        <Tabla columnas={["Nombre completo", "Código", "DNI/RUC", "Teléfono", { texto: "", derecha: true }]}>
          {resultado.clientes.map((c) => {
            const activo = c.id === seleccionadoId;
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
                    onClick={() => setSeleccionadoId(activo ? null : c.id)}
                    className={activo ? btn.chico : btn.chicoSecundario}
                  >
                    {activo && <Icono nombre="check" className="h-4 w-4" />}
                    {activo ? "Seleccionado" : "Seleccionar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </Tabla>
      </Tarjeta>
    </div>
  );
}
