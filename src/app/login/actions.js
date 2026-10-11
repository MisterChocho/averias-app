"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action del formulario de login
export async function iniciarSesion(estadoPrevio, formData) {
  const correo = String(formData.get("correo") || "").trim();
  const clave = String(formData.get("clave") || "");

  if (!correo || !clave) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (error) {
    // Muestra el error real en la terminal para poder diagnosticar
    console.error("Error de login:", error.status, error.code, error.message);

    if (error.code === "invalid_credentials") {
      return { error: "Correo o contraseña incorrectos." };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "La cuenta no está confirmada. Confírmala en Supabase." };
    }
    return { error: `No se pudo iniciar sesión: ${error.message}` };
  }

  // La página de inicio decide a qué panel ir según el rol
  redirect("/");
}
