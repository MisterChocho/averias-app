// Estructura común de todas las pantallas internas: menú lateral del rol + barra superior.
import Link from "next/link";
import { ROLES } from "@/lib/auth";
import { MENUS } from "@/lib/menus";
import MenuLateral from "./MenuLateral";
import Icono from "./Icono";
import { Avatar } from "./ui";

export function Logo({ claro }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-marca-500 to-marca-700 text-white shadow-lg shadow-marca-900/30">
        <Icono nombre="rayo" className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span className={`block text-sm font-semibold ${claro ? "text-white" : "text-slate-900"}`}>Orsted Averías</span>
        <span className={`block text-xs ${claro ? "text-slate-400" : "text-slate-500"}`}>Gestión de atención técnica</span>
      </span>
    </span>
  );
}

export default function AppShell({ perfil, children }) {
  const menu = MENUS[perfil.rol] || [];
  const nombre = perfil.nombre_completo || perfil.correo;

  return (
    <div className="min-h-screen lg:flex">
      {/* Menú lateral */}
      <aside className="bg-tinta lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="px-5 py-4 lg:py-6">
          <Link href={`/${perfil.rol}`}>
            <Logo claro />
          </Link>
        </div>
        <div className="px-3 pb-3 lg:flex-1">
          <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:block">
            {ROLES[perfil.rol]}
          </p>
          <MenuLateral inicio={`/${perfil.rol}`} menu={menu} />
        </div>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="text-xs text-slate-500">Orsted Corp · v1.0</p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{nombre}</p>
              <p className="text-xs text-slate-500">{ROLES[perfil.rol]}</p>
            </div>
            <Avatar nombre={nombre} />
          </div>
          <span className="h-6 w-px bg-slate-200" />
          <form action="/auth/salir" method="post">
            <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <Icono nombre="salir" className="h-4 w-4" />
              Salir
            </button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
