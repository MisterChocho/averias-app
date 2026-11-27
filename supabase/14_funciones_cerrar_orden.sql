-- =====================================================================
-- HU14 · Cerrar orden (JOJO-133)
-- Bucket de evidencias + políticas de Storage + RPC cerrar_orden
-- =====================================================================

-- 1. Crear bucket "evidencias" (idempotente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  5242880, -- 5 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Políticas de Storage para el bucket "evidencias"
drop policy if exists "evidencias_storage_insert_tecnico" on storage.objects;
create policy "evidencias_storage_insert_tecnico"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidencias'
  and exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'tecnico'
  )
);

drop policy if exists "evidencias_storage_select_personal" on storage.objects;
create policy "evidencias_storage_select_personal"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol in ('tecnico', 'agente', 'gerente')
  )
);

-- 3. Función RPC: cerrar_orden
-- Reglas validadas:
--   - Técnico autenticado y activo
--   - Orden existente y asignada al técnico
--   - Orden con al menos una atención registrada y en estado 'En atención'
--   - Al menos una fotografía adjunta
-- Efectos:
--   - Inserta las rutas en public.evidencias
--   - Actualiza public.ordenes a estado = 'Cerrada' y fecha_cierre = now()
--   - Actualiza public.averias asociada a estado = 'Resuelta'
create or replace function public.cerrar_orden(
  p_orden_id uuid,
  p_rutas    text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tecnico_id   uuid;
  v_orden        record;
  v_tiene_atenc  boolean;
  v_ruta         text;
  v_insertadas   int := 0;
  v_fecha_cierre timestamptz := now();
begin
  -- Verificar técnico activo del usuario autenticado
  select id into v_tecnico_id
  from public.tecnicos
  where perfil_id = auth.uid() and estado = 'Activo';

  if v_tecnico_id is null then
    raise exception 'Tu cuenta de técnico no está activa.' using errcode = 'P0001';
  end if;

  -- Validar al menos una fotografía
  if p_rutas is null or coalesce(array_length(p_rutas, 1), 0) = 0 then
    raise exception 'Adjunta al menos una fotografía como evidencia.' using errcode = 'P0001';
  end if;

  -- Bloquear y obtener la orden
  select id, codigo, estado, tecnico_id, averia_id
  into v_orden
  from public.ordenes
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'P0001';
  end if;

  if v_orden.tecnico_id is distinct from v_tecnico_id then
    raise exception 'Solo puedes cerrar órdenes asignadas a ti.' using errcode = 'P0001';
  end if;

  if v_orden.estado in ('Cerrada', 'Cancelada') then
    raise exception 'Esta orden ya está «%» y no se puede cerrar.', v_orden.estado using errcode = 'P0001';
  end if;

  -- Verificar que tenga al menos una atención registrada
  select exists (
    select 1 from public.atenciones where orden_id = p_orden_id
  ) into v_tiene_atenc;

  if not v_tiene_atenc or v_orden.estado <> 'En atención' then
    raise exception 'Debes registrar la atención antes de cerrar la orden.' using errcode = 'P0001';
  end if;

  -- Insertar evidencias válidas
  foreach v_ruta in array p_rutas loop
    if length(trim(coalesce(v_ruta, ''))) > 0 then
      insert into public.evidencias (orden_id, ruta, subido_por)
      values (p_orden_id, trim(v_ruta), auth.uid());
      v_insertadas := v_insertadas + 1;
    end if;
  end loop;

  if v_insertadas = 0 then
    raise exception 'Adjunta al menos una fotografía válida como evidencia.' using errcode = 'P0001';
  end if;

  -- Cerrar la orden (el trigger ordenes_historial registra el cambio automáticamente)
  update public.ordenes
  set estado = 'Cerrada',
      fecha_cierre = v_fecha_cierre
  where id = p_orden_id;

  -- Marcar la avería asociada como Resuelta
  update public.averias
  set estado = 'Resuelta',
      fecha_resolucion = v_fecha_cierre
  where id = v_orden.averia_id
    and estado <> 'Resuelta';

  return jsonb_build_object(
    'codigo', v_orden.codigo,
    'estado', 'Cerrada',
    'fecha_cierre', v_fecha_cierre,
    'evidencias_registradas', v_insertadas
  );
end;
$$;

grant execute on function public.cerrar_orden(uuid, text[]) to authenticated;