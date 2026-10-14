// Se muestra si la cuenta existe en Supabase Auth pero no tiene fila en "perfiles".
import Icono from "@/components/Icono";
import { btn } from "@/components/ui";

export default function SinPerfil() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Icono nombre="usuario" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Tu cuenta no tiene perfil</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pide al administrador que revise la tabla <code className="rounded bg-slate-100 px-1">perfiles</code> en Supabase.
        </p>
        <form action="/auth/salir" method="post" className="mt-6">
          <button className={btn.secundario}>
            <Icono nombre="salir" className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </main>
  );
}
