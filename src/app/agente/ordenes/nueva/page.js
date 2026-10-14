// HU06 · Registrar orden de avería (JOJO-47 interfaz, JOJO-50 frontend) — Sneider Araneda
// Se abre con /agente/ordenes/nueva?averia=<id de la avería>
// HU03 (Jhosep) puede enlazar aquí cuando una avería queda "No resuelta".
import Link from "next/link";
import { obtenerDatosParaOrden } from "../actions";
import FormularioOrden from "./FormularioOrden";

export default async function NuevaOrden({ searchParams }) {
  const { averia } = await searchParams;
  const datos = averia
    ? await obtenerDatosParaOrden(averia)
    : { ok: false, error: "Elige una avería de la lista para generar su orden." };

  return (
    <section className="space-y-6">
      <div>
        <Link href="/agente/ordenes" className="text-sm text-blue-700 hover:underline">
          ← Volver a órdenes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Registrar orden de avería</h1>
        <p className="text-slate-600">La falla no se resolvió por teléfono: se generará una orden para un técnico.</p>
      </div>

      {!datos.ok ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{datos.error}</p>
      ) : !datos.puedeGenerar ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{datos.motivoBloqueo}</p>
      ) : (
        <FormularioOrden datos={datos} />
      )}
    </section>
  );
}
