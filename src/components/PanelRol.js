// Página de bienvenida de cada rol: muestra sus módulos.
import Link from "next/link";
import { MENUS } from "@/lib/menus";
import Icono from "./Icono";
import { Encabezado } from "./ui";

function saludo() {
  const hora = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Lima" }));
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function PanelRol({ perfil }) {
  const menu = MENUS[perfil.rol] || [];
  const nombre = (perfil.nombre_completo || perfil.correo).split(" ")[0];

  return (
    <div className="space-y-8">
      <Encabezado
        etiqueta="Panel principal"
        titulo={`${saludo()}, ${nombre}`}
        descripcion="Elige un módulo para empezar."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-marca-200 hover:shadow-lg hover:shadow-marca-900/5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-50 text-marca-600 transition group-hover:bg-marca-600 group-hover:text-white">
              <Icono nombre={item.icono} className="h-5 w-5" />
            </span>
            <span className="mt-5 text-base font-semibold text-slate-900">{item.label}</span>
            <span className="mt-1 flex-1 text-sm text-slate-500">{item.descripcion}</span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-marca-600">
              Abrir módulo
              <Icono nombre="flecha" className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
