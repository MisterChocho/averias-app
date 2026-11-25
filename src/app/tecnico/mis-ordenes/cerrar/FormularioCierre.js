"use client";

// HU14 · Cerrar orden con evidencia (JOJO-97 frontend) — Sneider Araneda
// Las fotos se suben desde el navegador al bucket «evidencias» (privado) y luego se cierra la orden.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cerrarOrden } from "./actions";
import EstadoOrden from "@/app/agente/ordenes/EstadoOrden";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Dato, Etiqueta, btn } from "@/components/ui";

const MAX_FOTOS = 5;
const MAX_MB = 5;

function fecha(valor) {
  return new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
}

export default function FormularioCierre({ orden, atenciones }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [fotos, setFotos] = useState([]); // [{ archivo, url }]
  const [error, setError] = useState(null);
  const [errorFotos, setErrorFotos] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, startTransition] = useTransition();

  // Libera las vistas previas al salir
  useEffect(() => {
    return () => fotos.forEach((f) => URL.revokeObjectURL(f.url));
  }, [fotos]);

  function elegir(ev) {
    setErrorFotos(null);
    setError(null);
    setConfirmando(false);
    const nuevas = Array.from(ev.target.files || []);
    ev.target.value = "";

    const validas = [];
    for (const a of nuevas) {
      if (!a.type.startsWith("image/")) {
        setErrorFotos(`«${a.name}» no es una imagen.`);
        continue;
      }
      if (a.size > MAX_MB * 1024 * 1024) {
        setErrorFotos(`«${a.name}» pesa más de ${MAX_MB} MB.`);
        continue;
      }
      validas.push({ archivo: a, url: URL.createObjectURL(a) });
    }
    setFotos((prev) => {
      const total = [...prev, ...validas];
      if (total.length > MAX_FOTOS) {
        setErrorFotos(`Máximo ${MAX_FOTOS} fotografías.`);
        total.slice(MAX_FOTOS).forEach((f) => URL.revokeObjectURL(f.url));
        return total.slice(0, MAX_FOTOS);
      }
      return total;
    });
  }

  function quitar(i) {
    setConfirmando(false);
    setFotos((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, k) => k !== i);
    });
  }

  function pedirConfirmacion(ev) {
    ev.preventDefault();
    setError(null);
    if (fotos.length === 0) {
      setErrorFotos("Adjunta al menos una fotografía como evidencia.");
      return;
    }
    setErrorFotos(null);
    setConfirmando(true);
  }

  async function cerrar() {
    setError(null);
    setSubiendo(true);

    // 1) Subir las fotos al bucket privado
    const supabase = createClient();
    const rutas = [];
    for (const f of fotos) {
      const ext = (f.archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const ruta = `${orden.id}/${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: errSubida } = await supabase.storage
        .from("evidencias")
        .upload(ruta, f.archivo, { contentType: f.archivo.type, upsert: false });
      if (errSubida) {
        console.error("[cerrar] subida", errSubida.message);
        setSubiendo(false);
        setConfirmando(false);
        return setError("No se pudo subir una de las fotografías. La orden sigue abierta; intenta nuevamente.");
      }
      rutas.push(ruta);
    }
    setSubiendo(false);

    // 2) Registrar evidencias y cerrar la orden
    startTransition(async () => {
      const r = await cerrarOrden({ ordenId: orden.id, rutas });
      if (!r.ok) {
        setConfirmando(false);
        return setError(r.error);
      }
      router.push(`/tecnico/mis-ordenes?cerrada=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  const ocupado = subiendo || guardando;

  return (
    <form onSubmit={pedirConfirmacion} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tarjeta titulo="Evidencia fotográfica" descripcion={`Obligatoria: de 1 a ${MAX_FOTOS} fotos (máx. ${MAX_MB} MB cada una).`} icono="documento">
          <div className="space-y-4">
            <div>
              <Etiqueta htmlFor="fotos" obligatorio>
                Fotografías
              </Etiqueta>
              <input
                ref={inputRef}
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                onChange={elegir}
                disabled={ocupado || fotos.length >= MAX_FOTOS}
                className="mt-1.5 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-marca-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-marca-700 hover:file:bg-marca-100"
              />
              {errorFotos && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
                  <Icono nombre="alerta" className="h-4 w-4" />
                  {errorFotos}
                </p>
              )}
            </div>

            {fotos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {fotos.map((f, i) => (
                  <li key={f.url} className="relative overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Evidencia ${i + 1}`} className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      disabled={ocupado}
                      aria-label={`Quitar foto ${i + 1}`}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                    >
                      <Icono nombre="x" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {!confirmando ? (
          <div className="flex justify-end">
            <button type="submit" disabled={ocupado} className={btn.primario}>
              Cerrar orden
            </button>
          </div>
        ) : (
          <div className="animar-entrada rounded-2xl border border-marca-200 bg-marca-50/60 p-5">
            <p className="text-sm text-marca-900">
              ¿Cerrar la orden <strong>{orden.codigo}</strong> con {fotos.length}{" "}
              {fotos.length === 1 ? "fotografía" : "fotografías"}? Pasará a «Cerrada» y no podrás modificarla.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={cerrar} disabled={ocupado} className={btn.primario}>
                <Icono nombre="check" className="h-4 w-4" />
                {subiendo ? "Subiendo fotos..." : guardando ? "Cerrando..." : "Sí, cerrar orden"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} disabled={ocupado} className={btn.secundario}>
                Revisar
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-6">
        <Tarjeta titulo="Orden" descripcion="Datos de la visita." icono="ordenes">
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <Dato etiqueta="Código" valor={orden.codigo} />
              <EstadoOrden estado={orden.estado} />
            </div>
            <Dato etiqueta="Cliente" valor={orden.cliente} icono="usuario" />
            <Dato etiqueta="Dirección" valor={orden.direccion} icono="ubicacion" />
            <Dato etiqueta="Avería" valor={`${orden.averia} · ${orden.tipo}`} />
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Atención registrada" descripcion="Lo que dejaste anotado." icono="libro">
          <ul className="space-y-3">
            {atenciones.map((a, i) => (
              <li key={i} className="text-sm">
                <p className="text-xs text-slate-500">{fecha(a.fecha)}</p>
                <p className="mt-1">
                  <span className="font-medium text-slate-700">Diagnóstico: </span>
                  {a.diagnostico}
                </p>
                <p className="mt-0.5">
                  <span className="font-medium text-slate-700">Solución: </span>
                  {a.solucion}
                </p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </aside>
    </form>
  );
}
