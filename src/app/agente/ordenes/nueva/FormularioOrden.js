"use client";

// HU06 · Formulario de la orden. Muestra los datos heredados de la avería (no editables)
// y permite editar dirección, teléfono y horario. Pide confirmación antes de guardar.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarOrden } from "../actions";

const TELEFONO_VALIDO = /^[0-9]{9}$/;

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{valor || "—"}</dd>
    </div>
  );
}

export default function FormularioOrden({ datos }) {
  const router = useRouter();
  const { averia, cliente, valoresIniciales } = datos;

  const [direccion, setDireccion] = useState(valoresIniciales.direccion);
  const [telefono, setTelefono] = useState(valoresIniciales.telefono);
  const [horario, setHorario] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, startTransition] = useTransition();

  function validar() {
    const e = {};
    if (!direccion.trim()) e.direccion = "La dirección de atención es obligatoria.";
    if (!TELEFONO_VALIDO.test(telefono.replace(/\s+/g, ""))) e.telefono = "El teléfono debe tener 9 dígitos.";
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
      const r = await registrarOrden({ averiaId: averia.id, direccion, telefono, horario });
      if (!r.ok) {
        setConfirmando(false);
        setError(r.error);
        if (r.errores) setErrores(r.errores);
        return;
      }
      router.push(`/agente/ordenes?registrada=${encodeURIComponent(r.codigo)}`);
      router.refresh();
    });
  }

  const claseCampo = (campo) =>
    `mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
      errores[campo] ? "border-red-500 bg-red-50" : "border-slate-300 focus:border-blue-600"
    }`;

  return (
    <form onSubmit={pedirConfirmacion} className="space-y-6">
      {/* Datos heredados de la avería: solo lectura */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700">Datos de la avería (no editables)</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Avería" valor={averia.codigo} />
          <Dato etiqueta="Tipo" valor={averia.tipo} />
          <Dato etiqueta="Cliente" valor={`${cliente?.nombre_completo} (${cliente?.codigo})`} />
          <Dato etiqueta="DNI/RUC" valor={cliente?.documento} />
          <div className="sm:col-span-2">
            <Dato etiqueta="Descripción" valor={averia.descripcion} />
          </div>
        </dl>
      </div>

      {/* Datos editables de la orden */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="direccion" className="block text-sm font-medium text-slate-700">
            Dirección de atención <span className="text-red-600">*</span>
          </label>
          <input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className={claseCampo("direccion")}
          />
          {errores.direccion && <p className="mt-1 text-sm text-red-700">{errores.direccion}</p>}
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-slate-700">
            Teléfono de contacto <span className="text-red-600">*</span>
          </label>
          <input
            id="telefono"
            inputMode="numeric"
            maxLength={9}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ""))}
            className={claseCampo("telefono")}
          />
          {errores.telefono && <p className="mt-1 text-sm text-red-700">{errores.telefono}</p>}
        </div>

        <div>
          <label htmlFor="horario" className="block text-sm font-medium text-slate-700">
            Horario preferido <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            id="horario"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            placeholder="Ej.: Mañanas de 9 a 12"
            className={claseCampo("horario")}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        El código, la fecha, la hora y el agente se registran automáticamente. La orden se crea en estado
        &quot;Pendiente&quot;.
      </p>

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!confirmando ? (
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Registrar orden
        </button>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            ¿Confirmas el registro de la orden para <strong>{cliente?.nombre_completo}</strong> en{" "}
            <strong>{direccion}</strong>?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={enviando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {enviando ? "Registrando..." : "Sí, registrar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={enviando}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Revisar datos
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
