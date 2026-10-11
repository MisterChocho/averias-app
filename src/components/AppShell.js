// Estructura común de todas las pantallas internas: barra superior + menú lateral del rol.
import Link from "next/link";
import { ROLES } from "@/lib/auth";
import { MENUS } from "@/lib/menus";

export default function AppShell({ perfil, children }) {
  const menu = MENUS[perfil.rol] || [];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href={`/${perfil.rol}`} className="font-semibold text-slate-900">
          Atención de averías
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-right sm:block">
            <span className="block font-medium text-slate-800">
              {perfil.nombre_completo || perfil.correo}
            </span>
            <span className="block text-xs text-slate-500">{ROLES[perfil.rol]}</span>
          </span>
          <form action="/auth/salir" method="post">
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:flex-row">
        <nav className="flex gap-2 overflow-x-auto md:w-56 md:flex-col md:overflow-visible">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 rounded-xl bg-white p-6 ring-1 ring-slate-200">
          {children}
        </main>
      </div>
    </div>
  );
}
