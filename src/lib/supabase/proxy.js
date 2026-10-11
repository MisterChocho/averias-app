// Refresca la sesión de Supabase en cada petición y protege las rutas privadas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Rutas que se pueden abrir sin haber iniciado sesión
const RUTAS_PUBLICAS = ["/login"];

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no escribir código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some((ruta) => pathname.startsWith(ruta));

  // Sin sesión y en ruta privada -> al login
  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión e intentando entrar al login -> a la página de inicio
  if (user && esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
