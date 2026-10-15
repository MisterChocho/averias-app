// Marcador para las pantallas que aún no se programan.
// Al implementar la HU, borren <Pendiente /> de la página y pongan su pantalla.
import { MENUS } from "@/lib/menus";
import { Encabezado, Tarjeta, Vacio } from "./ui";

export default function Pendiente({ href }) {
  const item = Object.values(MENUS).flat().find((m) => m.href === href);

  return (
    <div className="space-y-6">
      <Encabezado titulo={item?.label} descripcion={item?.descripcion} />
      <Tarjeta>
        <Vacio icono={item?.icono || "herramienta"} titulo="Próximamente">
          Este módulo estará disponible en una próxima versión del sistema.
        </Vacio>
      </Tarjeta>
    </div>
  );
}
