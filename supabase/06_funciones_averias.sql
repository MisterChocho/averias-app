-- HU03 · Alerta: avería abierta del mismo tipo para el cliente
create or replace function public.averia_abierta_duplicada(
  p_cliente_id uuid,
  p_tipo_id    int
)
returns table (codigo text, estado public.estado_averia)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.codigo, a.estado
  from public.averias a
  where a.cliente_id = p_cliente_id
    and a.tipo_averia_id = p_tipo_id
    and a.estado <> 'Resuelta'
  order by a.fecha_registro desc
  limit 1;
$$;

-- HU03 · Registrar avería reportada
create or replace function public.registrar_averia(
  p_cliente_id  uuid,
  p_tipo_id     int,
  p_descripcion text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_requiere_tecnico boolean;
  v_averia           public.averias;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede registrar averías.';
  end if;

  if p_cliente_id is null
     or not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'Seleccione un cliente válido.';
  end if;

  if coalesce(trim(p_descripcion), '') = '' then
    raise exception 'La descripción de la avería es obligatoria.';
  end if;

  select requiere_tecnico into v_requiere_tecnico
  from public.tipos_averia
  where id = p_tipo_id and activo;
  if not found then
    raise exception 'El tipo de avería es obligatorio y debe ser válido.';
  end if;

  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id)
  values (p_cliente_id, p_tipo_id, trim(p_descripcion), auth.uid())
  returning * into v_averia;

  if v_requiere_tecnico then
    update public.averias
    set estado = 'No resuelta'
    where id = v_averia.id
    returning * into v_averia;
  end if;

  return json_build_object(
    'id',             v_averia.id,
    'codigo',         v_averia.codigo,
    'estado',         v_averia.estado,
    'habilita_guia',  not v_requiere_tecnico,
    'habilita_orden', v_requiere_tecnico
  );
end;
$$;
