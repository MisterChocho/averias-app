"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";
import Icono from "@/components/Icono";
import { btn, campo } from "@/components/ui";

const PUNTOS = [
  { icono: "clientes", texto: "Atención al cliente y registro de averías en un solo flujo" },
  { icono: "ordenes", texto: "Órdenes para técnicos con seguimiento de estado" },
  { icono: "grafico", texto: "Indicadores para la gerencia de operaciones" },
];

export default function LoginPage() {
  const [estado, accion, cargando] = useActionState(iniciarSesion, { error: null });

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <section className="relative hidden overflow-hidden bg-tinta p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-marca-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-marca-500/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-marca-500 to-marca-700">
            <Icono nombre="rayo" className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold">Orsted Averías</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Resuelve más averías desde el primer contacto.
          </h2>
          <p className="mt-4 text-slate-400">
            Sistema de gestión de técnicos y órdenes de servicio para el call center y el equipo de campo.
          </p>
          <ul className="mt-10 space-y-4">
            {PUNTOS.map((p) => (
              <li key={p.texto} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-marca-200">
                  <Icono nombre={p.icono} className="h-5 w-5" />
                </span>
                {p.texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© 2026 Orsted Corp. Todos los derechos reservados.</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-marca-500 to-marca-700 text-white">
              <Icono nombre="rayo" className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-lg font-semibold text-slate-900">Orsted Averías</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inicia sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa con la cuenta que te asignó tu supervisor.</p>

          <form action={accion} className="mt-8 space-y-5">
            <div>
              <label htmlFor="correo" className="block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <div className="relative">
                <Icono nombre="correo" className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  required
                  className={`${campo(false)} pl-9`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="clave" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <Icono nombre="candado" className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="clave"
                  name="clave"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className={`${campo(false)} pl-9`}
                />
              </div>
            </div>

            {estado?.error && (
              <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <Icono nombre="alerta" className="h-4 w-4 shrink-0" />
                {estado.error}
              </p>
            )}

            <button type="submit" disabled={cargando} className={`${btn.primario} w-full py-3`}>
              {cargando ? "Ingresando..." : "Ingresar"}
              {!cargando && <Icono nombre="flecha" className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
