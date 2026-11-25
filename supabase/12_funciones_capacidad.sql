-- =====================================================================
-- HU11 · Configurar límites de capacidad de trabajo por técnico
-- JOJO-115 Crear Base de Datos
-- Ejecutar UNA vez en Supabase > SQL Editor, después de 01 a 11.
-- Es seguro volver a ejecutarlo (usa "create or replace" y "drop ... if exists").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Rango del límite: de 1 a 10 órdenes simultáneas
--    (si en el equipo se acuerda otro tope, cambiar el 10 aquí y en actualizar_limite_tecnico)
-- ---------------------------------------------------------------------
alter table public.tecnicos drop constraint if exists tecnicos_max_ordenes_rango_chk;
alter table public.tecnicos
  add constraint tecnicos_max_ordenes_rango_chk check (max_ordenes between 1 and 10);


-- ---------------------------------------------------------------------
-- 2. Una orden no se asigna a un técnico que ya está en su límite
--    Se revisa al asignar o cambiar de técnico una orden «Asignada» o «En atención»
--    (las órdenes que el técnico ya tenía no se tocan).
-- ---------------------------------------------------------------------
create or replace function public.validar_capacidad_tecnico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre  text;
  v_max     int;
  v_activas int;
begin
  if new.tecnico_id is null or new.estado not in ('Asignada', 'En atención') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.tecnico_id is not distinct from old.tecnico_id then
    return new;
  end if;

  -- Un técnico a la vez: evita pasarse del límite si dos órdenes se asignan al mismo tiempo
  perform pg_advisory_xact_lock(hashtextextended(new.tecnico_id::text, 0));

  select nombre_completo, max_ordenes into v_nombre, v_max
  from public.tecnicos where id = new.tecnico_id;
  if not found then
    return new;  -- la clave foránea se encarga de rechazar un técnico inexistente
  end if;

  select count(*)::int into v_activas
  from public.ordenes
  where tecnico_id = new.tecnico_id
    and estado in ('Asignada', 'En atención')
    and id <> new.id;

  if v_activas >= v_max then
    raise exception 'El técnico % alcanzó su límite de % órdenes activas.', v_nombre, v_max;
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_capacidad_tecnico on public.ordenes;
create trigger ordenes_capacidad_tecnico
  before insert or update of tecnico_id on public.ordenes
  for each row execute function public.validar_capacidad_tecnico();


-- ---------------------------------------------------------------------
-- 3. Cambiar el límite de órdenes simultáneas de un técnico (solo el gerente)
--    * El límite es un número entero de 1 a 10.
--    * Si se baja por debajo de las órdenes que el técnico ya tiene, NO se le quita ninguna:
--      conserva las que tiene y no puede tomar nuevas hasta quedar por debajo del límite
--      (supera_limite = true).
--    Devuelve el límite anterior, las órdenes activas y el cupo que queda.
-- ---------------------------------------------------------------------
create or replace function public.actualizar_limite_tecnico(
  p_tecnico_id uuid,
  p_max        int
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tecnico  public.tecnicos;
  v_anterior int;
  v_activas  int;
begin
  if public.rol_actual() is distinct from 'gerente' then
    raise exception 'Solo el gerente puede cambiar el límite de órdenes de un técnico.';
  end if;

  if p_max is null or p_max < 1 or p_max > 10 then
    raise exception 'El límite debe ser un número entero entre 1 y 10.';
  end if;

  select * into v_tecnico from public.tecnicos where id = p_tecnico_id for update;
  if not found then
    raise exception 'El técnico no existe.';
  end if;

  v_anterior := v_tecnico.max_ordenes;
  if v_anterior <> p_max then
    update public.tecnicos
    set max_ordenes = p_max
    where id = p_tecnico_id
    returning * into v_tecnico;
  end if;

  v_activas := public.ordenes_activas_tecnico(p_tecnico_id);

  return json_build_object(
    'id',              v_tecnico.id,
    'nombre_completo', v_tecnico.nombre_completo,
    'max_ordenes',     v_tecnico.max_ordenes,
    'anterior',        v_anterior,
    'cambio',          v_anterior <> p_max,
    'ordenes_activas', v_activas,
    'cupo',            greatest(v_tecnico.max_ordenes - v_activas, 0),
    'supera_limite',   v_activas > v_tecnico.max_ordenes
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Permisos para llamar a la función (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.actualizar_limite_tecnico(uuid, int) from public, anon;
grant  execute on function public.actualizar_limite_tecnico(uuid, int) to authenticated;