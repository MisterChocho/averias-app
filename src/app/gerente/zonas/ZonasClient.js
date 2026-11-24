"use client";

import { useEffect, useMemo, useState } from "react";

export default function ZonasClient() {
  const [zonas, setZonas] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [zonasMarcadas, setZonasMarcadas] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ordenesFuera, setOrdenesFuera] = useState(0);

  // Cargar zonas y técnicos al montar
  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);
        const res = await fetch("/api/gerente/zonas");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar datos");

        setZonas(data.zonas || []);
        setTecnicos(data.tecnicos || []);

        if (data.tecnicos?.length > 0) {
          seleccionarTecnico(data.tecnicos[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  // Cargar historial cuando cambia el técnico seleccionado
  async function cargarHistorial(tecnicoId) {
    try {
      const res = await fetch(`/api/gerente/zonas?tecnico_id=${tecnicoId}`);
      const data = await res.json();
      if (res.ok) setHistorial(data.historial || []);
    } catch {
      setHistorial([]);
    }
  }

  function seleccionarTecnico(tecnico) {
    setSeleccionadoId(tecnico.id);
    setZonasMarcadas(tecnico.zona_ids || []);
    setError("");
    setMensaje("");
    setOrdenesFuera(0);
    cargarHistorial(tecnico.id);
  }

  function toggleZona(zonaId) {
    setError("");
    setMensaje("");
    setZonasMarcadas((prev) =>
      prev.includes(zonaId)
        ? prev.filter((id) => id !== zonaId)
        : [...prev, zonaId]
    );
  }

  async function handleGuardar() {
    if (!seleccionadoId) return;
    if (zonasMarcadas.length === 0) {
      setError("Debes asignar al menos una zona al técnico.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const res = await fetch("/api/gerente/zonas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tecnico_id: seleccionadoId,
          zonas: zonasMarcadas,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");

      setOrdenesFuera(data.ordenes_fuera_de_zona || 0);
      setMensaje(
        data.cambio
          ? "Zonas actualizadas correctamente."
          : "No hubo cambios en las zonas asignadas."
      );

      // Actualizar la lista local de técnicos
      const zonasNuevasObj = zonas.filter((z) => data.zona_ids.includes(z.id));
      setTecnicos((prev) =>
        prev.map((t) =>
          t.id === seleccionadoId
            ? { ...t, zona_ids: data.zona_ids, zonas: zonasNuevasObj }
            : t
        )
      );

      if (data.cambio) {
        cargarHistorial(seleccionadoId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const tecnicosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tecnicos;
    return tecnicos.filter((t) =>
      t.nombre_completo.toLowerCase().includes(q)
    );
  }, [tecnicos, busqueda]);

  const tecnicoActual = tecnicos.find((t) => t.id === seleccionadoId);

  if (cargando) {
    return <p className="p-6 text-sm text-slate-500">Cargando zonas y técnicos...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0B1220]">Zonas de cobertura</h1>
        <p className="text-sm text-slate-500">
          Asigna y reasigna las zonas geográficas de atención para cada técnico.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna izquierda: lista de técnicos */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="mb-3 text-base font-semibold text-[#0B1220]">Técnicos</h2>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar técnico..."
            className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2554EB]"
          />

          <div className="space-y-2">
            {tecnicosFiltrados.map((t) => {
              const activo = t.id === seleccionadoId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => seleccionarTecnico(t)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    activo
                      ? "border-[#2554EB] bg-[#EEF4FF]/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-[#0B1220]">{t.nombre_completo}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.zonas?.length > 0 ? (
                      t.zonas.map((z) => (
                        <span
                          key={z.id}
                          className="rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-xs font-medium text-[#2554EB]"
                        >
                          {z.nombre}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Sin zonas asignadas</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Columna derecha: asignación + historial */}
        <div className="space-y-6 lg:col-span-7">
          {tecnicoActual ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-[#0B1220]">
                  Asignación de zonas — {tecnicoActual.nombre_completo}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Debes seleccionar al menos una zona. El cambio se aplica de inmediato.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {zonas.map((z) => (
                    <label
                      key={z.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={zonasMarcadas.includes(z.id)}
                        onChange={() => toggleZona(z.id)}
                        className="h-4 w-4 accent-[#2554EB]"
                      />
                      <span className="text-[#0B1220]">{z.nombre}</span>
                    </label>
                  ))}
                </div>

                {error && (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                {mensaje && (
                  <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {mensaje}
                  </p>
                )}

                {ordenesFuera > 0 && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Atención: este técnico tiene {ordenesFuera} orden(es) activa(s) fuera de sus nuevas zonas asignadas.
                  </p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="rounded-xl bg-[#2554EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D41D8] disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-base font-semibold text-[#0B1220]">
                  Historial de cambios de zona
                </h3>
                {historial.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Aún no hay cambios registrados para este técnico.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-2 pr-3">Fecha</th>
                          <th className="py-2 pr-3">Zonas anteriores</th>
                          <th className="py-2 pr-3">Zonas nuevas</th>
                          <th className="py-2">Autorizado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historial.map((h) => (
                          <tr key={h.id}>
                            <td className="py-2.5 pr-3 text-slate-600">
                              {new Date(h.fecha).toLocaleString("es-PE")}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600">
                              {h.zona_anterior || "Sin zona"}
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-[#0B1220]">
                              {h.zona_nueva}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {h.perfiles?.nombre_completo || h.autorizado_por}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Selecciona un técnico para gestionar sus zonas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}