// Marcador para las pantallas que aún no se programan.
// Al implementar la HU, borren <Pendiente /> de la página y pongan su pantalla.
import { MENUS } from "@/lib/menus";

export default function Pendiente({ href }) {
  const item = Object.values(MENUS).flat().find((m) => m.href === href);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{item?.label}</h1>
      <p className="mt-1 text-sm text-slate-600">{item?.descripcion}</p>
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        En desarrollo · {item?.hu.join(", ")} · Sprint {item?.sprint}
      </div>
    </div>
  );
}
