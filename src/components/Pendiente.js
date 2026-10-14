// Marcador para las pantallas que aún no se programan.
// Al implementar la HU, borren <Pendiente /> de la página y pongan su pantalla.
import { MENUS } from "@/lib/menus";
import { Encabezado, Tarjeta, Vacio, Insignia } from "./ui";

export default function Pendiente({ href }) {
  const item = Object.values(MENUS).flat().find((m) => m.href === href);

  return (
    <div className="space-y-6">
      <Encabezado titulo={item?.label} descripcion={item?.descripcion} />
      <Tarjeta>
        <Vacio icono={item?.icono || "herramienta"} titulo="Módulo en desarrollo">
          Esta pantalla se entrega en el Sprint {item?.sprint}.
        </Vacio>
        <div className="flex justify-center gap-1.5 pb-4">
          {item?.hu.map((hu) => (
            <Insignia key={hu} tono="azul">
              {hu}
            </Insignia>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
