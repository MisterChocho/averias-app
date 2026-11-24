-- =====================================================================
-- HU13 · Registrar atención
-- JOJO-127 Crear Base de Datos
-- Ejecutar UNA vez en Supabase > SQL Editor, después de 01 a 10.
-- Es seguro volver a ejecutarlo (usa "create or replace" y "drop ... if exists").
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Índice para listar las atenciones de una orden
-- ---------------------------------------------------------------------
create index if not exists atenciones_orden_idx on public.atenciones (orden_id);


-- ---------------------------------------------------------------------
-- 2. Política de inserción: el técnico solo registra atenciones de SUS órdenes en curso
--    (la lectura atenciones_ver de 02_seguridad.sql no cambia)
-- ---------------------------------------------------------------------
drop policy if exists atenciones_insertar on public.atenciones;
create policy atenciones_insertar on public.atenciones for insert to authenticated
  with check (
    tecnico_id = public.mi_tecnico_id()
    and exists (
      select 1
      from public.ordenes o
      where o.id = orden_id
        and o.tecnico_id = public.mi_tecnico_id()
        and o.estado in ('Asignada', 'En atención')
    )
  );


-- ---------------------------------------------------------------------
-- 3. Registrar la atención
--    * La orden debe estar asignada al técnico de la sesión (activo) y en estado
--      «Asignada» o «En atención».
--    * Se guarda el diagnóstico y la solución (sin espacios sobrantes) con el técnico
--      como autor y la fecha y hora automáticas.
--    * Si la orden estaba «Asignada» pasa a «En atención»; si ya estaba «En atención»
--      se agrega una atención más y el estado no cambia.
-- ---------------------------------------------------------------------
create or replace function public.registrar_atencion(
  p_orden_id    uuid,
  p_diagnostico text,
  p_solucion    text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tec      public.tecnicos;
  v_orden    public.ordenes;
  v_diag     text := btrim(coalesce(p_diagnostico, ''));
  v_sol      text := btrim(coalesce(p_solucion, ''));
  v_atencion public.atenciones;
begin
  if public.rol_actual() is distinct from 'tecnico' then
    raise exception 'Solo un técnico puede registrar la atención de una orden.';
  end if;

  select * into v_tec from public.tecnicos where perfil_id = auth.uid();
  if not found then
    raise exception 'Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta.';
  end if;
  if v_tec.estado <> 'Activo' then
    raise exception 'Tu cuenta de técnico está inactiva. Pide al gerente que la active.';
  end if;

  -- Campos obligatorios
  if v_diag = '' then
    raise exception 'El diagnóstico es obligatorio.';
  end if;
  if v_sol = '' then
    raise exception 'La solución aplicada es obligatoria.';
  end if;

  -- La orden existe, es de este técnico y sigue en curso
  select * into v_orden from public.ordenes where id = p_orden_id;
  if not found then
    raise exception 'La orden no existe.';
  end if;
  if v_orden.tecnico_id is distinct from v_tec.id then
    raise exception 'Solo puedes registrar la atención de órdenes asignadas a ti.';
  end if;
  if v_orden.estado not in ('Asignada', 'En atención') then
    raise exception 'Esta orden está «%» y ya no admite registrar atención.', v_orden.estado;
  end if;

  insert into public.atenciones (orden_id, tecnico_id, diagnostico, solucion)
  values (p_orden_id, v_tec.id, v_diag, v_sol)
  returning * into v_atencion;

  -- «Asignada» -> «En atención» (si ya estaba «En atención» no cambia)
  update public.ordenes
  set estado = 'En atención'
  where id = p_orden_id
    and tecnico_id = v_tec.id
    and estado = 'Asignada'
  returning * into v_orden;

  if not found then
    select * into v_orden from public.ordenes where id = p_orden_id;
  end if;

  return json_build_object(
    'atencion_id', v_atencion.id,
    'orden_id',    v_orden.id,
    'codigo',      v_orden.codigo,
    'estado',      v_orden.estado,
    'fecha',       v_atencion.fecha
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Permisos para llamar a la función (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.registrar_atencion(uuid, text, text) from public, anon;
grant  execute on function public.registrar_atencion(uuid, text, text) to authenticated;