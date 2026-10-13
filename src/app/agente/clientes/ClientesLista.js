"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ClientesLista({ resultado }) {
  const router = useRouter();
  const [cargando, startTransition] = useTransition();
  const [seleccionadoId, setSeleccionadoId] = useState(null);

  // Caso error: mensaje + Reintentar
  if (!resultado.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-red-700">{resultado.error}</p>
        <button
          type="button"
          disabled={cargando}
          onClick={() => startTransition(() => router.refresh())}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {cargando ? "Cargando..." : "Reintentar"}
        </button>
      </div>
    );
  }

  // Caso vacío
  if (resultado.vacio) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
        {resultado.mensaje}
      </div>
    );
  }

  const seleccionado = resultado.clientes.find((c) => c.id === seleccionadoId);

  // Caso con datos
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre completo</th>
              <th className="px-4 py-3 font-medium">DNI/RUC</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {resultado.clientes.map((c) => {
              const activo = c.id === seleccionadoId;
              return (
                <tr
                  key={c.id}
                  className={activo ? "bg-blue-50" : "hover:bg-slate-50"}
                >
                  <td className="px-4 py-3 text-slate-600">{c.codigo}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.nombre_completo}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.documento}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefono}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSeleccionadoId(activo ? null : c.id)}
                      className={
                        activo
                          ? "rounded-lg bg-blue-600 px-3 py-1.5 text-white"
                          : "rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                      }
                    >
                      {activo ? "Seleccionado" : "Seleccionar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <p className="text-sm text-slate-600">
          Cliente seleccionado:{" "}
          <span className="font-medium text-slate-900">
            {seleccionado.nombre_completo}
          </span>{" "}
          ({seleccionado.codigo})
        </p>
      )}
    </div>
  );
}