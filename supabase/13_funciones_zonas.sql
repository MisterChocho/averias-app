-- =====================================================================
-- HU10 · Asignar zonas de cobertura geográfica
-- JOJO-109 Crear Base de Datos
-- Ejecutar UNA vez en Supabase > SQL Editor, después de 01 a 12.
-- Es seguro volver a ejecutarlo (usa "create or replace" y "if not exists").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Índice para consultar el historial de zonas de un técnico
--    (la pantalla lo muestra del cambio más reciente al más antiguo)
-- ---------------------------------------------------------------------
create index if not exists historial_zonas_tecnico_fecha_idx
  on public.historial_zonas (tecnico_id, fecha desc);


-- ---------------------------------------------------------------------
-- 2. Asignar o reasignar las zonas de un técnico (solo el gerente)
--    * Recibe la lista COMPLETA de zonas que el técnico debe tener después del cambio:
--      las que no estén en la lista se le quitan y las nuevas se le agregan.
--    * Debe quedar con al menos una zona; todas deben existir.
--    * Si la lista es igual a la que ya tenía, no cambia nada ni guarda historial (cambio = false).
--    * Al cambiar, guarda UNA fila en historial_zonas con las zonas anteriores y las nuevas
--      (nombres separados por coma), la fecha y el gerente que lo autorizó.
--    * El efecto es inmediato: la autoasignación (HU24) consulta tecnico_zonas en cada lectura.
--    * Las órdenes que el técnico ya tenía NO se le quitan; se informa cuántas quedaron
--      fuera de sus zonas (ordenes_fuera_de_zona) para que el gerente las revise.
-- ---------------------------------------------------------------------
create or replace function public.asignar_zonas_tecnico(
  p_tecnico_id uuid,
  p_zonas      int[]
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tecnico  public.tecnicos;
  v_zonas    int[];
  v_validas  int;
  v_anterior text;
  v_nueva    text;
  v_cambio   boolean;
  v_fuera    int;
begin
  if public.rol_actual() is distinct from 'gerente' then
    raise exception 'Solo el gerente puede asignar zonas a un técnico.';
  end if;

  -- Sin valores vacíos ni repetidos
  select coalesce(array_agg(distinct id), '{}'::int[]) into v_zonas
  from unnest(coalesce(p_zonas, '{}'::int[])) as id
  where id is not null;

  if cardinality(v_zonas) = 0 then
    raise exception 'Debes asignar al menos una zona al técnico.';
  end if;

  select count(*)::int into v_validas from public.zonas where id = any(v_zonas);
  if v_validas <> cardinality(v_zonas) then
    raise exception 'Alguna de las zonas indicadas no existe.';
  end if;

  -- Un cambio a la vez por técnico: evita que dos guardados simultáneos se pisen
  select * into v_tecnico from public.tecnicos where id = p_tecnico_id for update;
  if not found then
    raise exception 'El técnico no existe.';
  end if;

  -- Zonas antes y después, como texto ordenado (así se pueden comparar y guardar en el historial)
  select string_agg(z.nombre, ', ' order by z.nombre) into v_anterior
  from public.tecnico_zonas tz
  join public.zonas z on z.id = tz.zona_id
  where tz.tecnico_id = p_tecnico_id;

  select string_agg(nombre, ', ' order by nombre) into v_nueva
  from public.zonas where id = any(v_zonas);

  v_cambio := v_anterior is distinct from v_nueva;

  if v_cambio then
    delete from public.tecnico_zonas
    where tecnico_id = p_tecnico_id and zona_id <> all(v_zonas);

    insert into public.tecnico_zonas (tecnico_id, zona_id)
    select p_tecnico_id, z from unnest(v_zonas) as z
    on conflict do nothing;

    insert into public.historial_zonas (tecnico_id, zona_anterior, zona_nueva, autorizado_por)
    values (p_tecnico_id, v_anterior, v_nueva, auth.uid());
  end if;

  -- Órdenes activas del técnico que quedaron en una zona que ya no atiende
  select count(*)::int into v_fuera
  from public.ordenes o
  join public.averias a  on a.id = o.averia_id
  join public.clientes c on c.id = a.cliente_id
  where o.tecnico_id = p_tecnico_id
    and o.estado in ('Asignada', 'En atención')
    and c.zona_id is not null
    and c.zona_id <> all(v_zonas);

  return json_build_object(
    'id',                    v_tecnico.id,
    'nombre_completo',       v_tecnico.nombre_completo,
    'zona_ids',              to_json(v_zonas),
    'anterior',              v_anterior,
    'nueva',                 v_nueva,
    'cambio',                v_cambio,
    'ordenes_fuera_de_zona', v_fuera
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 3. Permisos para llamar a la función (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.asignar_zonas_tecnico(uuid, int[]) from public, anon;
grant  execute on function public.asignar_zonas_tecnico(uuid, int[]) to authenticated;