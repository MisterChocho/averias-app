-- ---------------------------------------------------------------------
-- 1. Reglas de integridad adicionales
-- ---------------------------------------------------------------------
-- «El cliente no desea valorar» y un puntaje no pueden venir juntos
alter table public.valoraciones drop constraint if exists valoraciones_no_desea_sin_puntaje_chk;
alter table public.valoraciones
  add constraint valoraciones_no_desea_sin_puntaje_chk
  check (not no_desea or puntaje is null);

-- Comentario de máximo 500 caracteres
alter table public.valoraciones drop constraint if exists valoraciones_comentario_largo_chk;
alter table public.valoraciones
  add constraint valoraciones_comentario_largo_chk
  check (comentario is null or length(comentario) <= 500);

-- Acelera la consulta «¿esta avería tuvo alguna orden?»
create index if not exists ordenes_averia_idx on public.ordenes (averia_id);


-- ---------------------------------------------------------------------
-- 2. Una valoración no se puede editar ni eliminar
--    (las políticas RLS ya no tienen update ni delete; el trigger lo garantiza
--    también para el SQL Editor y el rol de servicio)
-- ---------------------------------------------------------------------
create or replace function public.bloquear_cambios_valoracion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Una valoración no se puede editar ni eliminar.';
end;
$$;

drop trigger if exists valoraciones_sin_cambios on public.valoraciones;
create trigger valoraciones_sin_cambios
  before update or delete on public.valoraciones
  for each row execute function public.bloquear_cambios_valoracion();

-- Para borrar datos de prueba desde el SQL Editor, hay que desactivar el trigger un momento:
--   alter table public.valoraciones disable trigger valoraciones_sin_cambios;
--   delete from public.valoraciones;   -- solo datos de prueba
--   alter table public.valoraciones enable trigger valoraciones_sin_cambios;


-- ---------------------------------------------------------------------
-- 3. ¿La avería fue resuelta en primer contacto?
--    Estado «Resuelta» y ninguna orden de técnico (de cualquier estado).
-- ---------------------------------------------------------------------
create or replace function public.es_primer_contacto(p_averia_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
           select 1 from public.averias a
           where a.id = p_averia_id and a.estado = 'Resuelta'
         )
     and not exists (
           select 1 from public.ordenes o where o.averia_id = p_averia_id
         );
$$;


-- ---------------------------------------------------------------------
-- 4. Política de inserción: solo agentes, a su nombre y solo primer contacto
--    (la lectura valoraciones_ver de 02_seguridad.sql no cambia)
-- ---------------------------------------------------------------------
drop policy if exists valoraciones_insertar on public.valoraciones;
create policy valoraciones_insertar on public.valoraciones for insert to authenticated
  with check (
    public.rol_actual() = 'agente'
    and agente_id = auth.uid()
    and public.es_primer_contacto(averia_id)
  );


-- ---------------------------------------------------------------------
-- 5. Registrar la valoración
--    p_puntaje   : 1 a 5, o null si el cliente no desea valorar
--    p_no_desea  : true si el cliente no desea valorar
--    p_comentario: obligatorio con puntaje 1 o 2; opcional en los demás casos (máx. 500)
--    Guarda el agente que la registra y la fecha y hora automáticas.
-- ---------------------------------------------------------------------
create or replace function public.registrar_valoracion(
  p_averia_id  uuid,
  p_puntaje    int,
  p_no_desea   boolean,
  p_comentario text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_averia   public.averias;
  v_no_desea boolean := coalesce(p_no_desea, false);
  v_coment   text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_val      public.valoraciones;
begin
  if public.rol_actual() is distinct from 'agente' then
    raise exception 'Solo un agente del call center puede registrar una valoración.';
  end if;

  -- Puntaje o «no desea valorar» (uno solo de los dos)
  if v_no_desea and p_puntaje is not null then
    raise exception 'Elige un puntaje del 1 al 5 o «El cliente no desea valorar», no ambos.';
  end if;
  if not v_no_desea and (p_puntaje is null or p_puntaje < 1 or p_puntaje > 5) then
    raise exception 'Elige un puntaje del 1 al 5 o «El cliente no desea valorar».';
  end if;

  -- Comentario
  if v_coment is not null and length(v_coment) > 500 then
    raise exception 'El comentario no puede superar los 500 caracteres.';
  end if;
  if p_puntaje is not null and p_puntaje <= 2 and v_coment is null then
    raise exception 'El comentario es obligatorio cuando el puntaje es 1 o 2.';
  end if;

  -- Avería: existe y fue resuelta en primer contacto
  select * into v_averia from public.averias where id = p_averia_id;
  if not found then
    raise exception 'La avería no existe.';
  end if;
  if v_averia.estado <> 'Resuelta' then
    raise exception 'Solo se puede valorar una avería resuelta en primer contacto (estado actual: %).',
      v_averia.estado;
  end if;
  if not public.es_primer_contacto(p_averia_id) then
    raise exception 'Esta avería no se resolvió en primer contacto: tuvo una orden de técnico.';
  end if;

  -- Una sola valoración por avería
  if exists (select 1 from public.valoraciones where averia_id = p_averia_id) then
    raise exception 'Esta avería ya tiene una valoración registrada.';
  end if;

  begin
    insert into public.valoraciones (averia_id, puntaje, no_desea, comentario, agente_id)
    values (p_averia_id, p_puntaje, v_no_desea, v_coment, auth.uid())
    returning * into v_val;
  exception
    when unique_violation then  -- dos agentes valorando a la vez
      raise exception 'Esta avería ya tiene una valoración registrada.';
  end;

  return json_build_object(
    'valoracion_id', v_val.id,
    'averia_id',     v_val.averia_id,
    'codigo',        v_averia.codigo,
    'puntaje',       v_val.puntaje,
    'no_desea',      v_val.no_desea,
    'comentario',    v_val.comentario,
    'agente_id',     v_val.agente_id,
    'fecha',         v_val.fecha
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. Permisos para llamar a las funciones (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.es_primer_contacto(uuid)                         from public, anon;
revoke execute on function public.registrar_valoracion(uuid, int, boolean, text)   from public, anon;

grant execute on function public.es_primer_contacto(uuid)                          to authenticated;
grant execute on function public.registrar_valoracion(uuid, int, boolean, text)    to authenticated;