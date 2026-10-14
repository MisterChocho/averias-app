"use client";

// Menú del rol con la opción activa resaltada según la ruta actual.
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icono from "./Icono";

export default function MenuLateral({ inicio, menu }) {
  const ruta = usePathname();
  const opciones = [{ href: inicio, label: "Inicio", icono: "inicio", exacto: true }, ...menu];

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {opciones.map((item) => {
        const activo = item.exacto ? ruta === item.href : ruta.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={`group flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              activo ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icono
              nombre={item.icono}
              className={`h-5 w-5 ${activo ? "text-marca-200" : "text-slate-500 group-hover:text-slate-300"}`}
            />
            {item.label}
            {item.sprint > 1 && (
              <span className="ml-auto hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 lg:inline">
                S{item.sprint}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
