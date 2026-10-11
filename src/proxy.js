// En Next.js 16 el antiguo "middleware" se llama "proxy".
// Se ejecuta antes de cada página para mantener la sesión y proteger rutas.
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todas las rutas excepto archivos estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
