"use client";

// HU06 · Formulario de la orden. Muestra los datos heredados de la avería (no editables)
// y permite editar dirección, teléfono y horario. Pide confirmación antes de guardar.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarOrden } from "../actions";
import Icono from "@/components/Icono";
import { Tarjeta, Aviso, Avatar, Dato, Insignia, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

const TELEFONO_VALIDO = /^[0-9]{9}$/;

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

  return (
    <form onSubmit={pedirConfirmacion} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Datos editables de la orden */}
        <Tarjeta titulo="Datos de la visita" descripcion="Se precargan con los datos del cliente; puedes corregirlos." icono="ubicacion">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Etiqueta htmlFor="direccion" obligatorio>
                Dirección de atención
              </Etiqueta>
              <input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={campo(errores.direccion)}
              />
              <ErrorCampo>{errores.direccion}</ErrorCampo>
            </div>

            <div>
              <Etiqueta htmlFor="telefono" obligatorio>
                Teléfono de contacto
              </Etiqueta>
              <input
                id="telefono"
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ""))}
                className={campo(errores.telefono)}
              />
              <ErrorCampo>{errores.telefono}</ErrorCampo>
            </div>

            <div>
              <Etiqueta htmlFor="horario" opcional>
                Horario preferido
              </Etiqueta>
              <input
                id="horario"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ej.: Mañanas de 9 a 12"
                className={campo(false)}
              />
            </div>
          </div>
        </Tarjeta>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {!confirmando ? (
          <div className="flex justify-end">
            <button type="submit" className={btn.primario}>
              Registrar orden
            </button>
          </div>
        ) : (
          <div className="animar-entrada rounded-2xl border border-marca-200 bg-marca-50/60 p-5">
            <p className="text-sm text-marca-900">
              ¿Confirmas el registro de la orden para <strong>{cliente?.nombre_completo}</strong> en{" "}
              <strong>{direccion}</strong>?
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

      {/* Datos heredados de la avería: solo lectura */}
      <aside className="space-y-6">
        <Tarjeta titulo="Avería" descripcion="Datos heredados, no editables." icono="averias">
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <Dato etiqueta="Código" valor={averia.codigo} />
              <Insignia tono="ambar" punto>
                {averia.estado}
              </Insignia>
            </div>
            <Dato etiqueta="Tipo" valor={averia.tipo} />
            <Dato etiqueta="Descripción" valor={averia.descripcion} />
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Cliente" icono="usuario">
          <div className="flex items-center gap-3">
            <Avatar nombre={cliente?.nombre_completo} />
            <div>
              <p className="font-medium text-slate-900">{cliente?.nombre_completo}</p>
              <p className="tabular-nums text-xs text-slate-500">{cliente?.codigo}</p>
            </div>
          </div>
          <dl className="mt-4">
            <Dato etiqueta="DNI/RUC" valor={cliente?.documento} />
          </dl>
        </Tarjeta>

        <p className="px-1 text-xs text-slate-500">
          El código, la fecha, la hora y el agente se registran automáticamente. La orden se crea en estado
          &quot;Pendiente&quot;.
        </p>
      </aside>
    </form>
  );
}
