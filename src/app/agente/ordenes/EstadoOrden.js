// Etiqueta de color para el estado de una orden
const COLORES = {
  Pendiente: "bg-amber-100 text-amber-800",
  Asignada: "bg-blue-100 text-blue-800",
  "En atención": "bg-violet-100 text-violet-800",
  Cerrada: "bg-emerald-100 text-emerald-800",
  Cancelada: "bg-slate-200 text-slate-600",
};

export default function EstadoOrden({ estado }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        COLORES[estado] || "bg-slate-100 text-slate-700"
      }`}
    >
      {estado}
    </span>
  );
}
