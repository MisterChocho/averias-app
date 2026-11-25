-- ---------------------------------------------------------------------
-- 1. Reglas de integridad del diagnóstico
-- ---------------------------------------------------------------------
alter table public.averias drop constraint if exists averias_ultimo_paso_chk;
alter table public.averias
  add constraint averias_ultimo_paso_chk
  check (ultimo_paso is null or ultimo_paso >= 0);

alter table public.averias drop constraint if exists averias_tiempo_diagnostico_chk;
alter table public.averias
  add constraint averias_tiempo_diagnostico_chk
  check (tiempo_diagnostico_seg is null or tiempo_diagnostico_seg >= 0);

alter table public.averias drop constraint if exists averias_fin_despues_inicio_chk;
alter table public.averias
  add constraint averias_fin_despues_inicio_chk
  check (
    inicio_diagnostico is null
    or fin_diagnostico is null
    or fin_diagnostico >= inicio_diagnostico
  );

-- Una avería «En diagnóstico» siempre tiene fecha y hora de inicio
alter table public.averias drop constraint if exists averias_en_diagnostico_inicio_chk;
alter table public.averias
  add constraint averias_en_diagnostico_inicio_chk
  check (estado <> 'En diagnóstico' or inicio_diagnostico is not null);


-- ---------------------------------------------------------------------
-- 2. Apoyo: cantidad de pasos de la guía ACTIVA de un tipo de avería
--    (0 = el tipo no tiene guía activa o su guía no tiene pasos)
-- ---------------------------------------------------------------------
create or replace function public.total_pasos_guia(p_tipo_id int)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int
  from public.guias g
  join public.guia_pasos p on p.guia_id = g.id
  where g.tipo_averia_id = p_tipo_id
    and g.activa;
$$;


-- ---------------------------------------------------------------------
-- 3. Consultar la guía de una avería (solo lectura, no cambia el estado)
--    Devuelve solo la guía activa del tipo de avería, con los pasos en orden.
--    Si no hay guía activa: hay_guia = false y guia = null
--    («No hay guía disponible para este tipo de avería»).
-- ---------------------------------------------------------------------
create or replace function public.obtener_guia_averia(p_averia_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_averia public.averias;
  v_tipo   text;
  v_guia   public.guias;
  v_pasos  json;
  v_total  int;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede consultar la guía de diagnóstico.';
  end if;

  select * into v_averia from public.averias where id = p_averia_id;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado not in ('Reportada', 'En diagnóstico') then
    raise exception 'La guía solo se habilita para averías en estado «Reportada» (estado actual: %).',
      v_averia.estado;
  end if;

  select nombre into v_tipo from public.tipos_averia where id = v_averia.tipo_averia_id;

  v_total := public.total_pasos_guia(v_averia.tipo_averia_id);

  if v_total > 0 then
    select * into v_guia
    from public.guias
    where tipo_averia_id = v_averia.tipo_averia_id and activa;

    select json_agg(
             json_build_object('orden', p.orden, 'instruccion', p.instruccion)
             order by p.orden
           )
    into v_pasos
    from public.guia_pasos p
    where p.guia_id = v_guia.id;
  end if;

  return json_build_object(
    'averia_id',          v_averia.id,
    'codigo',             v_averia.codigo,
    'estado',             v_averia.estado,
    'tipo',               v_tipo,
    'ultimo_paso',        coalesce(v_averia.ultimo_paso, 0),
    'inicio_diagnostico', v_averia.inicio_diagnostico,
    'hay_guia',           v_total > 0,
    'guia',               case
                            when v_total > 0 then json_build_object(
                              'id',          v_guia.id,
                              'titulo',      v_guia.titulo,
                              'total_pasos', v_total,
                              'pasos',       v_pasos
                            )
                            else null
                          end
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Abrir la guía: «Reportada» -> «En diagnóstico» y se registra el inicio
--    * Solo funciona con averías «Reportada».
--    * Si la avería ya está «En diagnóstico» (llamada interrumpida) NO cambia
--      nada: conserva la hora de inicio y devuelve el último paso para retomar.
--    * Si el tipo no tiene guía activa NO cambia el estado (hay_guia = false).
-- ---------------------------------------------------------------------
create or replace function public.iniciar_diagnostico(p_averia_id uuid)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia public.averias;
  v_total  int;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede abrir la guía de diagnóstico.';
  end if;

  select * into v_averia from public.averias where id = p_averia_id for update;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado not in ('Reportada', 'En diagnóstico') then
    raise exception 'La guía solo se habilita para averías en estado «Reportada» (estado actual: %).',
      v_averia.estado;
  end if;

  v_total := public.total_pasos_guia(v_averia.tipo_averia_id);

  -- Averia nueva con guía activa: pasa a «En diagnóstico»
  if v_averia.estado = 'Reportada' and v_total > 0 then
    update public.averias
    set estado             = 'En diagnóstico',
        inicio_diagnostico = now(),
        ultimo_paso        = 1,
        fin_diagnostico    = null,
        fecha_resolucion   = null,
        tiempo_diagnostico_seg = null
    where id = p_averia_id
    returning * into v_averia;
  end if;

  return json_build_object(
    'averia_id',          v_averia.id,
    'codigo',             v_averia.codigo,
    'estado',             v_averia.estado,
    'inicio_diagnostico', v_averia.inicio_diagnostico,
    'ultimo_paso',        coalesce(v_averia.ultimo_paso, 0),
    'hay_guia',           v_total > 0
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 5. Guardar el paso actual (para retomar si la llamada se interrumpe)
--    Devuelve el paso guardado.
-- ---------------------------------------------------------------------
create or replace function public.guardar_paso_diagnostico(
  p_averia_id uuid,
  p_paso      int
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia public.averias;
  v_total  int;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede registrar el avance de la guía.';
  end if;

  select * into v_averia from public.averias where id = p_averia_id for update;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado <> 'En diagnóstico' then
    raise exception 'La avería no está «En diagnóstico» (estado actual: %).', v_averia.estado;
  end if;

  v_total := public.total_pasos_guia(v_averia.tipo_averia_id);
  if v_total = 0 then
    raise exception 'No hay guía disponible para este tipo de avería.';
  end if;

  if p_paso is null or p_paso < 1 or p_paso > v_total then
    raise exception 'El paso debe estar entre 1 y %.', v_total;
  end if;

  update public.averias set ultimo_paso = p_paso where id = p_averia_id;

  return p_paso;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. Finalizar el diagnóstico: «Resuelta» o «No resuelta»
--    * Resuelta    : estado «Resuelta» + fecha_resolucion (después se registra
--                    la valoración de HU05 en /agente/averias/valoracion).
--    * No resuelta : estado «No resuelta» (queda lista para generar la orden, HU06).
--    En ambos casos se guarda fin_diagnostico y el tiempo total de diagnóstico
--    en segundos (desde inicio_diagnostico hasta ahora, incluye las pausas por
--    llamadas interrumpidas).
-- ---------------------------------------------------------------------
create or replace function public.finalizar_diagnostico(
  p_averia_id uuid,
  p_resultado text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia public.averias;
  v_ahora  timestamptz := now();
  v_seg    int;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede indicar el resultado del diagnóstico.';
  end if;

  if p_resultado is null or p_resultado not in ('Resuelta', 'No resuelta') then
    raise exception 'Indique el resultado: «Resuelta» o «No resuelta».';
  end if;

  select * into v_averia from public.averias where id = p_averia_id for update;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado <> 'En diagnóstico' then
    raise exception 'Solo se puede indicar el resultado de una avería «En diagnóstico» (estado actual: %).',
      v_averia.estado;
  end if;

  v_seg := greatest(
    0,
    round(extract(epoch from (v_ahora - coalesce(v_averia.inicio_diagnostico, v_ahora))))::int
  );

  update public.averias
  set estado                 = p_resultado::public.estado_averia,
      fin_diagnostico        = v_ahora,
      fecha_resolucion       = case when p_resultado = 'Resuelta' then v_ahora else null end,
      tiempo_diagnostico_seg = v_seg
  where id = p_averia_id
  returning * into v_averia;

  return json_build_object(
    'averia_id',              v_averia.id,
    'codigo',                 v_averia.codigo,
    'estado',                 v_averia.estado,
    'inicio_diagnostico',     v_averia.inicio_diagnostico,
    'fin_diagnostico',        v_averia.fin_diagnostico,
    'fecha_resolucion',       v_averia.fecha_resolucion,
    'tiempo_diagnostico_seg', v_averia.tiempo_diagnostico_seg,
    'habilita_valoracion',    v_averia.estado = 'Resuelta',   -- HU05
    'habilita_orden',         v_averia.estado = 'No resuelta' -- HU06
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 7. Derivar a técnico cuando el tipo de avería NO tiene guía activa
--    La avería queda «No resuelta» y lista para generar la orden (HU06).
--    Si la avería sí tiene guía, se debe terminar con finalizar_diagnostico.
-- ---------------------------------------------------------------------
create or replace function public.derivar_a_tecnico(p_averia_id uuid)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia public.averias;
  v_ahora  timestamptz := now();
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede derivar una avería a un técnico.';
  end if;

  select * into v_averia from public.averias where id = p_averia_id for update;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado not in ('Reportada', 'En diagnóstico') then
    raise exception 'Solo se puede derivar una avería «Reportada» o «En diagnóstico» (estado actual: %).',
      v_averia.estado;
  end if;

  if public.total_pasos_guia(v_averia.tipo_averia_id) > 0 then
    raise exception 'Este tipo de avería tiene guía disponible. Termine la guía e indique el resultado «No resuelta».';
  end if;

  update public.averias
  set estado                 = 'No resuelta',
      fin_diagnostico        = case when inicio_diagnostico is not null then v_ahora end,
      tiempo_diagnostico_seg = case
                                 when inicio_diagnostico is not null
                                 then greatest(0, round(extract(epoch from (v_ahora - inicio_diagnostico)))::int)
                               end
  where id = p_averia_id
  returning * into v_averia;

  return json_build_object(
    'averia_id',      v_averia.id,
    'codigo',         v_averia.codigo,
    'estado',         v_averia.estado,
    'habilita_orden', true  -- HU06
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 8. Permisos para llamar a las funciones (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.total_pasos_guia(int)                    from public, anon;
revoke execute on function public.obtener_guia_averia(uuid)                from public, anon;
revoke execute on function public.iniciar_diagnostico(uuid)                from public, anon;
revoke execute on function public.guardar_paso_diagnostico(uuid, int)      from public, anon;
revoke execute on function public.finalizar_diagnostico(uuid, text)        from public, anon;
revoke execute on function public.derivar_a_tecnico(uuid)                  from public, anon;

grant execute on function public.total_pasos_guia(int)                     to authenticated;
grant execute on function public.obtener_guia_averia(uuid)                 to authenticated;
grant execute on function public.iniciar_diagnostico(uuid)                 to authenticated;
grant execute on function public.guardar_paso_diagnostico(uuid, int)       to authenticated;
grant execute on function public.finalizar_diagnostico(uuid, text)         to authenticated;
grant execute on function public.derivar_a_tecnico(uuid)                   to authenticated;