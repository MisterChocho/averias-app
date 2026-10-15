// Componentes visuales comunes del sistema. Úsenlos en todas las pantallas para que se vean iguales.
//   import { Encabezado, Tarjeta, Insignia, Aviso, Vacio, Avatar, btn, campo } from "@/components/ui";
import Link from "next/link";
import Icono from "./Icono";

// ---------- Clases de botones y campos ----------
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btn = {
  primario: `${BTN_BASE} bg-marca-600 px-4 py-2.5 text-white shadow-sm hover:bg-marca-700`,
  secundario: `${BTN_BASE} border border-slate-300 bg-white px-4 py-2.5 text-slate-700 shadow-sm hover:bg-slate-50`,
  peligro: `${BTN_BASE} bg-red-600 px-4 py-2.5 text-white shadow-sm hover:bg-red-700`,
  peligroSuave: `${BTN_BASE} border border-red-200 bg-white px-3 py-1.5 text-red-700 hover:bg-red-50`,
  chico: `${BTN_BASE} bg-marca-600 px-3 py-1.5 text-white shadow-sm hover:bg-marca-700`,
  chicoSecundario: `${BTN_BASE} border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50`,
  enlace: "inline-flex items-center gap-1.5 text-sm font-medium text-marca-700 hover:text-marca-800",
};

export function campo(conError) {
  return `mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
    conError
      ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-marca-500 focus:ring-marca-100"
  }`;
}

export function Etiqueta({ htmlFor, children, obligatorio, opcional }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
      {obligatorio && <span className="ml-0.5 text-red-500">*</span>}
      {opcional && <span className="ml-1 font-normal text-slate-400">(opcional)</span>}
    </label>
  );
}

export function ErrorCampo({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
      <Icono nombre="alerta" className="h-4 w-4" />
      {children}
    </p>
  );
}

// ---------- Estructura de página ----------
export function Encabezado({ titulo, descripcion, volver, acciones, etiqueta }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {volver && (
          <Link href={volver.href} className={`${btn.enlace} mb-3`}>
            <Icono nombre="atras" className="h-4 w-4" />
            {volver.texto}
          </Link>
        )}
        {etiqueta && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-marca-600">{etiqueta}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-sm text-slate-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 gap-2">{acciones}</div>}
    </div>
  );
}

export function Tarjeta({ titulo, descripcion, icono, acciones, children, className = "", sinRelleno }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {(titulo || acciones) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            {icono && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-50 text-marca-600">
                <Icono nombre={icono} className="h-5 w-5" />
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
              {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
            </div>
          </div>
          {acciones}
        </header>
      )}
      <div className={sinRelleno ? "" : "p-6"}>{children}</div>
    </section>
  );
}

// ---------- Tablas ----------
export function Tabla({ columnas, children }) {
  return (
    <div className="scroll-fino overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columnas.map((c, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                  c.derecha ? "text-right" : ""
                }`}
              >
                {c.texto ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

// ---------- Indicadores ----------
const TONOS = {
  gris: "bg-slate-100 text-slate-700 ring-slate-500/20",
  azul: "bg-marca-50 text-marca-700 ring-marca-600/20",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/20",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  violeta: "bg-violet-50 text-violet-700 ring-violet-600/20",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
};
const PUNTOS = {
  gris: "bg-slate-400",
  azul: "bg-marca-500",
  ambar: "bg-amber-500",
  verde: "bg-emerald-500",
  violeta: "bg-violet-500",
  rojo: "bg-red-500",
};

export function Insignia({ tono = "gris", punto, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tono]}`}
    >
      {punto && <span className={`h-1.5 w-1.5 rounded-full ${PUNTOS[tono]}`} />}
      {children}
    </span>
  );
}

const AVISOS = {
  exito: { clase: "border-emerald-200 bg-emerald-50 text-emerald-800", icono: "checkCirculo" },
  error: { clase: "border-red-200 bg-red-50 text-red-700", icono: "alerta" },
  alerta: { clase: "border-amber-200 bg-amber-50 text-amber-800", icono: "alerta" },
  info: { clase: "border-marca-200 bg-marca-50 text-marca-800", icono: "info" },
};

export function Aviso({ tipo = "info", titulo, children, acciones }) {
  const a = AVISOS[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`animar-entrada flex gap-3 rounded-xl border px-4 py-3 text-sm ${a.clase}`}>
      <Icono nombre={a.icono} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? "mt-0.5" : ""}>{children}</div>
        {acciones && <div className="mt-3 flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </div>
  );
}

export function Vacio({ icono = "info", titulo, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icono nombre={icono} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium text-slate-900">{titulo}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export function iniciales(nombre = "") {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ nombre, tamano = "md" }) {
  const t = tamano === "lg" ? "h-12 w-12 text-base" : tamano === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marca-500 to-marca-700 font-semibold text-white ${t}`}>
      {iniciales(nombre)}
    </span>
  );
}

export function Dato({ etiqueta, valor, icono }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icono && <Icono nombre={icono} className="h-3.5 w-3.5" />}
        {etiqueta}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{valor || "—"}</dd>
    </div>
  );
}

export function Metrica({ etiqueta, valor, tono = "gris", icono }) {
  const color = {
    gris: "text-slate-600 bg-slate-100",
    azul: "text-marca-600 bg-marca-50",
    ambar: "text-amber-600 bg-amber-50",
    verde: "text-emerald-600 bg-emerald-50",
    violeta: "text-violet-600 bg-violet-50",
    rojo: "text-red-600 bg-red-50",
  }[tono];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icono nombre={icono} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900">{valor}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{etiqueta}</p>
      </div>
    </div>
  );
}
