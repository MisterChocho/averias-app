// Página de bienvenida de cada rol: muestra sus módulos.
import Link from "next/link";
import { MENUS } from "@/lib/menus";

export default function PanelRol({ perfil }) {
  const menu = MENUS[perfil.rol] || [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">
        Hola, {perfil.nombre_completo || perfil.correo}
      </h1>
      <p className="mt-1 text-sm text-slate-600">Elige un módulo para empezar.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg p-4 ring-1 ring-slate-200 hover:bg-blue-50 hover:ring-blue-300"
          >
            <span className="block font-medium text-slate-900">{item.label}</span>
            <span className="mt-1 block text-sm text-slate-600">{item.descripcion}</span>
            <span className="mt-2 block text-xs text-slate-400">
              {item.hu.join(" · ")} · Sprint {item.sprint}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
