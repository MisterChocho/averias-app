// Se muestra si la cuenta existe en Supabase Auth pero no tiene fila en "perfiles".
export default function SinPerfil() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Tu cuenta no tiene perfil</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pide al administrador que revise la tabla <code>perfiles</code> en Supabase.
        </p>
        <form action="/auth/salir" method="post" className="mt-6">
          <button className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white">Salir</button>
        </form>
      </div>
    </main>
  );
}
