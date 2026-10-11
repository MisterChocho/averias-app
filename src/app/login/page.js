"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [estado, accion, cargando] = useActionState(iniciarSesion, { error: null });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Atención de averías</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta</p>

        <form action={accion} className="mt-6 space-y-4">
          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="clave" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="clave"
              name="clave"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          {estado?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{estado.error}</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
