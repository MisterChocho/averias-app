"use client";

// HU09 · Alta de técnico (JOJO-98 frontend) — Sneider Araneda
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarTecnico } from "./actions";
import { Tarjeta, Aviso, Etiqueta, ErrorCampo, btn, campo } from "@/components/ui";

const DNI_VALIDO = /^[0-9]{8}$/;
const TELEFONO_VALIDO = /^9[0-9]{8}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FormularioTecnico() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, startTransition] = useTransition();

  function guardar(ev) {
    ev.preventDefault();
    setError(null);
    setExito(null);

    const e = {};
    if (!nombre.trim()) e.nombre = "El nombre completo es obligatorio.";
    if (!dni) e.dni = "El DNI es obligatorio.";
    else if (!DNI_VALIDO.test(dni)) e.dni = "El DNI debe tener 8 dígitos.";
    if (!telefono) e.telefono = "El teléfono de contacto es obligatorio.";
    else if (!TELEFONO_VALIDO.test(telefono)) e.telefono = "El teléfono debe tener 9 dígitos y empezar con 9.";
    if (!correo.trim()) e.correo = "El correo institucional es obligatorio.";
    else if (!CORREO_VALIDO.test(correo.trim())) e.correo = "Ingresa un correo válido.";
    setErrores(e);
    if (Object.keys(e).length) return;

    startTransition(async () => {
      const r = await registrarTecnico({ nombre, dni, telefono, correo });
      if (!r.ok) {
        setErrores(r.errores || {});
        return setError(r.error);
      }
      setNombre("");
      setDni("");
      setTelefono("");
      setCorreo("");
      setErrores({});
      setExito(
        r.conCuenta
          ? `Técnico ${r.nombre} registrado y vinculado a su cuenta de acceso.`
          : `Técnico ${r.nombre} registrado. Aún no tiene una cuenta de acceso vinculada a ese correo.`
      );
      router.refresh();
    });
  }

  return (
    <Tarjeta titulo="Dar de alta a un técnico" descripcion="Todos los campos son obligatorios." icono="tecnicos">
      <form onSubmit={guardar} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Etiqueta htmlFor="nombre" obligatorio>
              Nombre completo
            </Etiqueta>
            <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo(errores.nombre)} />
            <ErrorCampo>{errores.nombre}</ErrorCampo>
          </div>
          <div>
            <Etiqueta htmlFor="dni" obligatorio>
              DNI
            </Etiqueta>
            <input
              id="dni"
              inputMode="numeric"
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ""))}
              className={campo(errores.dni)}
            />
            <ErrorCampo>{errores.dni}</ErrorCampo>
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
          <div className="sm:col-span-2">
            <Etiqueta htmlFor="correo" obligatorio>
              Correo institucional
            </Etiqueta>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={campo(errores.correo)}
            />
            <ErrorCampo>{errores.correo}</ErrorCampo>
          </div>
        </div>

        {error && <Aviso tipo="error">{error}</Aviso>}
        {exito && <Aviso tipo="exito">{exito}</Aviso>}

        <div className="flex justify-end">
          <button type="submit" disabled={enviando} className={btn.primario}>
            {enviando ? "Registrando..." : "Registrar técnico"}
          </button>
        </div>
      </form>
    </Tarjeta>
  );
}
