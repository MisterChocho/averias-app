// Consultas de solo lectura para las pantallas de órdenes (HU06 y HU08).
// Se usan desde páginas del servidor; no son Server Actions.
import { createClient } from "@/lib/supabase/server";

const ESTADOS_ACTIVOS = ["Pendiente", "Asignada", "En atención"];

// Todas las órdenes, de la más reciente a la más antigua
export async function listarOrdenes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes")
    .select(`
      id, codigo, estado, fecha_registro, direccion_atencion, telefono_contacto,
      horario_preferido, motivo_cancelacion, fecha_cancelacion,
      averia:averias (
        codigo, descripcion,
        tipo:tipos_averia ( nombre ),
        cliente:clientes ( codigo, nombre_completo )
      ),
      tecnico:tecnicos ( nombre_completo )
    `)
    .order("fecha_registro", { ascending: false });

  if (error) {
    console.error("[ordenes] listarOrdenes", error.code, error.message);
    return { ok: false, error: "No se pudo cargar la lista de órdenes.", ordenes: [] };
  }
  return { ok: true, ordenes: data || [] };
}

// Averías "No resuelta" que todavía no tienen una orden activa (HU06)
export async function listarAveriasSinOrden() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("averias")
    .select(`
      id, codigo, descripcion, fecha_registro,
      tipo:tipos_averia ( nombre ),
      cliente:clientes ( codigo, nombre_completo ),
      ordenes ( estado )
    `)
    .eq("estado", "No resuelta")
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("[ordenes] listarAveriasSinOrden", error.code, error.message);
    return { ok: false, error: "No se pudieron cargar las averías.", averias: [] };
  }

  const averias = (data || []).filter(
    (a) => !(a.ordenes || []).some((o) => ESTADOS_ACTIVOS.includes(o.estado))
  );
  return { ok: true, averias };
}
