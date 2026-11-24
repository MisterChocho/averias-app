-- =====================================================================
-- HU24 · Autoasignar orden
-- JOJO-139 Crear Base de Datos
-- Ejecutar UNA vez en Supabase > SQL Editor, después de 01 a 09.
-- Es seguro volver a ejecutarlo (usa "create or replace" y "drop ... if exists").
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funciones de apoyo (security definer para que la política no dependa de otras políticas)
-- ---------------------------------------------------------------------
-- ¿La orden es de una zona del técnico que tiene la sesión abierta?
create or replace function public.orden_en_mi_zona(p_orden_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ordenes o
    join public.averias a        on a.id = o.averia_id
    join public.clientes c       on c.id = a.cliente_id
    join public.tecnico_zonas tz on tz.zona_id = c.zona_id
    join public.tecnicos t       on t.id = tz.tecnico_id
    where o.id = p_orden_id
      and t.perfil_id = auth.uid()
  );
$$;

-- Cantidad de órdenes activas («Asignada» o «En atención») de un técnico
create or replace function public.ordenes_activas_tecnico(p_tecnico_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.ordenes
  where tecnico_id = p_tecnico_id
    and estado in ('Asignada', 'En atención');
$$;

-- ¿El técnico activo de la sesión todavía puede tomar más órdenes?
create or replace function public.tengo_cupo_ordenes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.ordenes_activas_tecnico(t.id) < t.max_ordenes
     from public.tecnicos t
     where t.perfil_id = auth.uid() and t.estado = 'Activo'),
    false
  );
$$;


-- ---------------------------------------------------------------------
-- 2. Política del técnico sobre las órdenes
--    Igual que en 04 (HU08) y, además, para TOMAR una orden libre:
--    de su zona y con cupo disponible.
-- ---------------------------------------------------------------------
drop policy if exists ordenes_tecnico_editar on public.ordenes;
create policy ordenes_tecnico_editar on public.ordenes for update to authenticated
  using (
    public.mi_tecnico_id() is not null
    and estado in ('Pendiente', 'Asignada', 'En atención')
    and (
      tecnico_id = public.mi_tecnico_id()
      or (
        estado = 'Pendiente'
        and tecnico_id is null
        and public.orden_en_mi_zona(id)
        and public.tengo_cupo_ordenes()
      )
    )
  )
  with check (
    tecnico_id = public.mi_tecnico_id()
    and estado in ('Asignada', 'En atención', 'Cerrada')
  );


-- ---------------------------------------------------------------------
-- 3. La fecha de asignación se guarda sola al asignar una orden
-- ---------------------------------------------------------------------
create or replace function public.guardar_fecha_asignacion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.tecnico_id is null and new.tecnico_id is not null and new.fecha_asignacion is null then
    new.fecha_asignacion := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_fecha_asignacion on public.ordenes;
create trigger ordenes_fecha_asignacion
  before update of tecnico_id on public.ordenes
  for each row execute function public.guardar_fecha_asignacion();


-- ---------------------------------------------------------------------
-- 4. Órdenes disponibles para el técnico de la sesión
--    Solo «Pendiente», sin técnico y de sus zonas; de la más antigua a la más reciente.
--    Devuelve también su máximo y cuántas órdenes activas tiene (puede_autoasignarse).
-- ---------------------------------------------------------------------
create or replace function public.listar_ordenes_disponibles()
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tec     public.tecnicos;
  v_activas int;
  v_ordenes json;
begin
  if public.rol_actual() is distinct from 'tecnico' then
    raise exception 'Solo un técnico puede ver las órdenes disponibles.';
  end if;

  select * into v_tec from public.tecnicos where perfil_id = auth.uid();
  if not found then
    raise exception 'Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta.';
  end if;
  if v_tec.estado <> 'Activo' then
    raise exception 'Tu cuenta de técnico está inactiva. Pide al gerente que la active.';
  end if;

  v_activas := public.ordenes_activas_tecnico(v_tec.id);

  select coalesce(
           json_agg(
             json_build_object(
               'id',                 o.id,
               'codigo',             o.codigo,
               'direccion_atencion', o.direccion_atencion,
               'telefono_contacto',  o.telefono_contacto,
               'horario_preferido',  o.horario_preferido,
               'fecha_registro',     o.fecha_registro,
               'averia_codigo',      a.codigo,
               'tipo',               ta.nombre,
               'descripcion',        a.descripcion,
               'zona',               z.nombre,
               'cliente',            c.nombre_completo
             )
             order by o.fecha_registro
           ),
           '[]'::json
         )
  into v_ordenes
  from public.ordenes o
  join public.averias a       on a.id = o.averia_id
  join public.clientes c      on c.id = a.cliente_id
  join public.zonas z         on z.id = c.zona_id
  join public.tipos_averia ta on ta.id = a.tipo_averia_id
  where o.estado = 'Pendiente'
    and o.tecnico_id is null
    and exists (
      select 1 from public.tecnico_zonas tz
      where tz.tecnico_id = v_tec.id and tz.zona_id = c.zona_id
    );

  return json_build_object(
    'tecnico', json_build_object(
      'id',                  v_tec.id,
      'nombre_completo',     v_tec.nombre_completo,
      'max_ordenes',         v_tec.max_ordenes,
      'ordenes_activas',     v_activas,
      'puede_autoasignarse', v_activas < v_tec.max_ordenes
    ),
    'ordenes', v_ordenes
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 5. Autoasignarse una orden
--    La orden pasa a «Asignada» a nombre del técnico, con fecha y hora automáticas.
--    El UPDATE final solo afecta a una orden que siga «Pendiente» y sin técnico:
--    si dos técnicos la toman a la vez, solo uno la consigue.
-- ---------------------------------------------------------------------
create or replace function public.autoasignar_orden(p_orden_id uuid)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tec     public.tecnicos;
  v_orden   public.ordenes;
  v_activas int;
begin
  if public.rol_actual() is distinct from 'tecnico' then
    raise exception 'Solo un técnico puede autoasignarse órdenes.';
  end if;

  select * into v_tec from public.tecnicos where perfil_id = auth.uid();
  if not found then
    raise exception 'Tu usuario no está registrado como técnico. Pide al gerente que te dé de alta.';
  end if;
  if v_tec.estado <> 'Activo' then
    raise exception 'Tu cuenta de técnico está inactiva. Pide al gerente que la active.';
  end if;

  -- Una autoasignación a la vez por técnico: el máximo de órdenes no se puede saltar
  -- tomando dos órdenes al mismo tiempo
  perform pg_advisory_xact_lock(hashtextextended(v_tec.id::text, 0));

  select * into v_orden from public.ordenes where id = p_orden_id;
  if not found then
    raise exception 'La orden no existe.';
  end if;

  if v_orden.estado <> 'Pendiente' or v_orden.tecnico_id is not null then
    raise exception 'Esta orden ya no está disponible.';
  end if;

  if not public.orden_en_mi_zona(p_orden_id) then
    raise exception 'Esta orden no pertenece a tu zona.';
  end if;

  v_activas := public.ordenes_activas_tecnico(v_tec.id);
  if v_activas >= v_tec.max_ordenes then
    raise exception 'Ya tienes el máximo de órdenes activas (% de %). Termina una para tomar otra.',
      v_activas, v_tec.max_ordenes;
  end if;

  update public.ordenes
  set tecnico_id       = v_tec.id,
      estado           = 'Asignada',
      fecha_asignacion = now()
  where id = p_orden_id
    and estado = 'Pendiente'
    and tecnico_id is null
  returning * into v_orden;

  if not found then  -- otro técnico la tomó justo antes
    raise exception 'Esta orden ya no está disponible.';
  end if;

  return json_build_object(
    'orden_id',         v_orden.id,
    'codigo',           v_orden.codigo,
    'estado',           v_orden.estado,
    'fecha_asignacion', v_orden.fecha_asignacion,
    'ordenes_activas',  v_activas + 1,
    'max_ordenes',      v_tec.max_ordenes
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. Permisos para llamar a las funciones (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.orden_en_mi_zona(uuid)          from public, anon;
revoke execute on function public.ordenes_activas_tecnico(uuid)   from public, anon;
revoke execute on function public.tengo_cupo_ordenes()            from public, anon;
revoke execute on function public.listar_ordenes_disponibles()    from public, anon;
revoke execute on function public.autoasignar_orden(uuid)         from public, anon;

grant execute on function public.orden_en_mi_zona(uuid)           to authenticated;
grant execute on function public.ordenes_activas_tecnico(uuid)    to authenticated;
grant execute on function public.tengo_cupo_ordenes()             to authenticated;
grant execute on function public.listar_ordenes_disponibles()     to authenticated;
grant execute on function public.autoasignar_orden(uuid)          to authenticated;