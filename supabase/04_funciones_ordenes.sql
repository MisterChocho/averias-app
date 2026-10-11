-- =====================================================================
-- 04_funciones_ordenes.sql
-- JOJO-49 (HU06 backend) y JOJO-85 (HU08 backend) — Sneider Araneda
-- =====================================================================

-- HU06 · Registrar orden de avería
create or replace function public.registrar_orden(
  p_averia_id  uuid,
  p_direccion  text,
  p_telefono   text,
  p_horario    text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia  public.averias;
  v_activa  text;
  v_codigo  text;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede registrar órdenes.';
  end if;

  select * into v_averia from public.averias where id = p_averia_id for update;
  if not found then
    raise exception 'La avería no existe.';
  end if;

  if v_averia.estado <> 'No resuelta' then
    raise exception 'Solo se puede generar una orden desde una avería en estado "No resuelta" (estado actual: %).',
      v_averia.estado;
  end if;

  select codigo into v_activa
  from public.ordenes
  where averia_id = p_averia_id and estado in ('Pendiente', 'Asignada', 'En atención')
  limit 1;
  if v_activa is not null then
    raise exception 'Esta avería ya tiene una orden activa (%).', v_activa;
  end if;

  if coalesce(trim(p_direccion), '') = '' then
    raise exception 'La dirección de atención es obligatoria.';
  end if;
  if coalesce(trim(p_telefono), '') !~ '^[0-9]{9}$' then
    raise exception 'El teléfono de contacto debe tener 9 dígitos.';
  end if;

  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, horario_preferido, agente_id)
  values (
    p_averia_id,
    trim(p_direccion),
    trim(p_telefono),
    nullif(trim(coalesce(p_horario, '')), ''),
    auth.uid()
  )
  returning codigo into v_codigo;

  return v_codigo;
end;
$$;

-- HU08 · Cancelar orden
create or replace function public.cancelar_orden(
  p_orden_id  uuid,
  p_motivo    text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_orden public.ordenes;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede cancelar órdenes.';
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'El motivo de la cancelación es obligatorio.';
  end if;

  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    raise exception 'La orden no existe.';
  end if;

  if v_orden.estado not in ('Pendiente', 'Asignada') then
    raise exception 'Esta orden no puede cancelarse en su estado actual.';
  end if;

  update public.ordenes
  set estado             = 'Cancelada',
      motivo_cancelacion = trim(p_motivo),
      cancelado_por      = auth.uid(),
      fecha_cancelacion  = now()
  where id = p_orden_id;

  if v_orden.tecnico_id is not null then
    insert into public.notificaciones (tecnico_id, orden_id, mensaje)
    values (
      v_orden.tecnico_id,
      v_orden.id,
      'La orden ' || v_orden.codigo || ' fue cancelada. Motivo: ' || trim(p_motivo)
    );
  end if;

  return v_orden.codigo;
end;
$$;

-- HU08 · Una orden cancelada o cerrada no puede autoasignarse ni continuar
drop policy if exists ordenes_tecnico_editar on public.ordenes;
create policy ordenes_tecnico_editar on public.ordenes for update to authenticated
  using (
    public.mi_tecnico_id() is not null
    and estado in ('Pendiente', 'Asignada', 'En atención')
    and (tecnico_id = public.mi_tecnico_id() or (estado = 'Pendiente' and tecnico_id is null))
  )
  with check (
    tecnico_id = public.mi_tecnico_id()
    and estado in ('Asignada', 'En atención', 'Cerrada')
  );

-- Permisos para llamar a las funciones
revoke execute on function public.registrar_orden(uuid, text, text, text) from public, anon;
revoke execute on function public.cancelar_orden(uuid, text) from public, anon;
grant execute on function public.registrar_orden(uuid, text, text, text) to authenticated;
grant execute on function public.cancelar_orden(uuid, text) to authenticated;