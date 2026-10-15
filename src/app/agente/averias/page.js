// HU03 · Registrar avería reportada (JOJO-45 frontend) — Sneider Araneda
// Backend: ./actions.js (JOJO-44, Jhosep). Se abre desde HU01 con /agente/averias?cliente=<id>
import Link from "next/link";
import { listarClientes } from "../clientes/actions";
import { listarTiposAveria } from "./actions";
import FormularioAveria from "./FormularioAveria";
import Icono from "@/components/Icono";
import { Encabezado, Aviso, btn } from "@/components/ui";

export default async function AgenteAverias({ searchParams }) {
  const { cliente } = await searchParams;
  const [resClientes, resTipos] = await Promise.all([listarClientes(), listarTiposAveria()]);

  const error = !resClientes.ok ? resClientes.error : !resTipos.ok ? resTipos.error : null;

  return (
    <div className="space-y-6">
      <Encabezado
        etiqueta="Atención"
        titulo="Registrar avería"
        descripcion="Registra la falla que reporta el cliente. Según el tipo, se habilitará la guía de diagnóstico o la orden para un técnico."
        volver={{ href: "/agente/clientes", texto: "Volver a clientes" }}
      />

      {error ? (
        <Aviso
          tipo="error"
          titulo="No se pudo cargar la información"
          acciones={
            <Link href={cliente ? `/agente/averias?cliente=${cliente}` : "/agente/averias"} className={btn.chicoSecundario}>
              <Icono nombre="reintentar" className="h-4 w-4" />
              Reintentar
            </Link>
          }
        >
          {error}
        </Aviso>
      ) : (
        <FormularioAveria
          clientes={resClientes.clientes}
          tipos={resTipos.tipos}
          clienteInicial={resClientes.clientes.some((c) => c.id === cliente) ? cliente : ""}
        />
      )}
    </div>
  );
}
