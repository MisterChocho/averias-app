-- =====================================================================
-- 09_funciones_tecnicos.sql
-- HU09 · Administrar estado operativo del técnico
-- JOJO-103 Crear Base de Datos
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Reglas de integridad de los datos del técnico
-- ---------------------------------------------------------------------
alter table public.tecnicos drop constraint if exists tecnicos_nombre_chk;
alter table public.tecnicos
  add constraint tecnicos_nombre_chk check (btrim(nombre_completo) <> '');

alter table public.tecnicos drop constraint if exists tecnicos_dni_chk;
alter table public.tecnicos
  add constraint tecnicos_dni_chk check (dni ~ '^[0-9]{8}$');

alter table public.tecnicos drop constraint if exists tecnicos_telefono_chk;
alter table public.tecnicos
  add constraint tecnicos_telefono_chk check (telefono ~ '^9[0-9]{8}$');

alter table public.tecnicos drop constraint if exists tecnicos_correo_chk;
alter table public.tecnicos
  add constraint tecnicos_correo_chk check (correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- El correo identifica al técnico (se usa para vincular su cuenta): no se repite
create unique index if not exists tecnicos_correo_unico on public.tecnicos (lower(correo));


-- ---------------------------------------------------------------------
-- 2. Historial de cambios de estado del técnico
--    (se guarda en la misma tabla que averías y órdenes: entidad = 'tecnico')
-- ---------------------------------------------------------------------
alter table public.historial_estados drop constraint if exists historial_estados_entidad_check;
alter table public.historial_estados
  add constraint historial_estados_entidad_check
  check (entidad in ('averia', 'orden', 'tecnico'));

create or replace function public.registrar_cambio_estado_tecnico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id)
    values ('tecnico', new.id, null, new.estado::text, auth.uid());
  elsif new.estado is distinct from old.estado then
    insert into public.historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id)
    values ('tecnico', new.id, old.estado::text, new.estado::text, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists tecnicos_historial on public.tecnicos;
create trigger tecnicos_historial
  after insert or update of estado on public.tecnicos
  for each row execute function public.registrar_cambio_estado_tecnico();


-- ---------------------------------------------------------------------
-- 3. Una orden no se asigna a un técnico «Inactivo»
--    Complementa la política de 04 (que ya impide que un técnico inactivo se
--    autoasigne): aquí se impide también que otro usuario le asigne la orden.
-- ---------------------------------------------------------------------
create or replace function public.validar_tecnico_activo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado public.estado_tecnico;
  v_nombre text;
begin
  if new.tecnico_id is null then
    return new;
  end if;
  -- Solo cuando se asigna o se cambia de técnico (las órdenes que ya tenía no se tocan)
  if tg_op = 'UPDATE' and new.tecnico_id is not distinct from old.tecnico_id then
    return new;
  end if;

  select estado, nombre_completo into v_estado, v_nombre
  from public.tecnicos where id = new.tecnico_id;

  if found and v_estado <> 'Activo' then
    raise exception 'El técnico % está inactivo y no puede recibir órdenes.', v_nombre;
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_tecnico_activo on public.ordenes;
create trigger ordenes_tecnico_activo
  before insert or update of tecnico_id on public.ordenes
  for each row execute function public.validar_tecnico_activo();


-- ---------------------------------------------------------------------
-- 4. Vincular la cuenta de acceso con el técnico por el correo
--    Cuando existe un perfil con rol «tecnico» y el mismo correo que un técnico
--    sin cuenta, se enlaza (tecnicos.perfil_id). Así mi_tecnico_id() lo reconoce.
--    Funciona en cualquier orden: primero la cuenta o primero el técnico.
-- ---------------------------------------------------------------------
create or replace function public.vincular_perfil_tecnico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rol = 'tecnico' and new.correo is not null then
    update public.tecnicos t
    set perfil_id = new.id
    where t.perfil_id is null
      and lower(t.correo) = lower(new.correo)
      and not exists (select 1 from public.tecnicos x where x.perfil_id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists perfiles_vincular_tecnico on public.perfiles;
create trigger perfiles_vincular_tecnico
  after insert or update of rol, correo on public.perfiles
  for each row execute function public.vincular_perfil_tecnico();


-- ---------------------------------------------------------------------
-- 5. Dar de alta un técnico (siempre queda «Activo»)
--    El gerente indica nombre completo, DNI, teléfono y correo institucional.
-- ---------------------------------------------------------------------
create or replace function public.registrar_tecnico(
  p_nombre   text,
  p_dni      text,
  p_telefono text,
  p_correo   text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_dni      text := btrim(coalesce(p_dni, ''));
  v_telefono text := btrim(coalesce(p_telefono, ''));
  v_correo   text := lower(btrim(coalesce(p_correo, '')));
  v_tecnico  public.tecnicos;
  v_perfil   uuid;
begin
  if public.rol_actual() is distinct from 'gerente' then
    raise exception 'Solo el gerente puede dar de alta a los técnicos.';
  end if;

  -- Campos obligatorios
  if v_nombre = '' then
    raise exception 'El nombre completo es obligatorio.';
  end if;
  if v_dni = '' then
    raise exception 'El DNI es obligatorio.';
  end if;
  if v_telefono = '' then
    raise exception 'El teléfono de contacto es obligatorio.';
  end if;
  if v_correo = '' then
    raise exception 'El correo institucional es obligatorio.';
  end if;

  -- Formatos
  if v_dni !~ '^[0-9]{8}$' then
    raise exception 'El DNI debe tener 8 dígitos.';
  end if;
  if v_telefono !~ '^9[0-9]{8}$' then
    raise exception 'El teléfono de contacto debe tener 9 dígitos y empezar con 9.';
  end if;
  if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'El correo institucional no tiene un formato válido.';
  end if;

  -- No se permiten dos técnicos con el mismo documento (ni el mismo correo)
  if exists (select 1 from public.tecnicos where dni = v_dni) then
    raise exception 'Ya existe un técnico registrado con el DNI %.', v_dni;
  end if;
  if exists (select 1 from public.tecnicos where lower(correo) = v_correo) then
    raise exception 'Ya existe un técnico registrado con el correo %.', v_correo;
  end if;

  begin
    insert into public.tecnicos (nombre_completo, dni, telefono, correo)
    values (v_nombre, v_dni, v_telefono, v_correo)
    returning * into v_tecnico;
  exception
    when unique_violation then  -- dos altas a la vez con los mismos datos
      raise exception 'Ya existe un técnico registrado con el DNI % o el correo %.', v_dni, v_correo;
  end;

  -- Si la cuenta con rol «tecnico» ya existe, se vincula de inmediato
  select p.id into v_perfil
  from public.perfiles p
  where p.rol = 'tecnico'
    and lower(p.correo) = v_correo
    and not exists (select 1 from public.tecnicos x where x.perfil_id = p.id);

  if v_perfil is not null then
    update public.tecnicos set perfil_id = v_perfil where id = v_tecnico.id;
  end if;

  return json_build_object(
    'id',               v_tecnico.id,
    'nombre_completo',  v_tecnico.nombre_completo,
    'dni',              v_tecnico.dni,
    'telefono',         v_tecnico.telefono,
    'correo',           v_tecnico.correo,
    'estado',           v_tecnico.estado,
    'cuenta_vinculada', v_perfil is not null
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. Cambiar el estado operativo: «Activo» <-> «Inactivo»
--    Al pasar a «Inactivo» se bloquea de inmediato la autoasignación y la
--    recepción de órdenes. Las órdenes que ya tenía se informan en
--    ordenes_activas (Asignada o En atención) para que el gerente las revise.
--    Si el técnico ya tenía ese estado no cambia nada (cambio = false).
-- ---------------------------------------------------------------------
create or replace function public.cambiar_estado_tecnico(
  p_tecnico_id uuid,
  p_estado     text
)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tecnico public.tecnicos;
  v_cambio  boolean;
  v_activas int;
begin
  if public.rol_actual() is distinct from 'gerente' then
    raise exception 'Solo el gerente puede cambiar el estado de un técnico.';
  end if;

  if p_estado is null or p_estado not in ('Activo', 'Inactivo') then
    raise exception 'El estado debe ser «Activo» o «Inactivo».';
  end if;

  select * into v_tecnico from public.tecnicos where id = p_tecnico_id for update;
  if not found then
    raise exception 'El técnico no existe.';
  end if;

  v_cambio := v_tecnico.estado::text <> p_estado;
  if v_cambio then
    update public.tecnicos
    set estado = p_estado::public.estado_tecnico
    where id = p_tecnico_id
    returning * into v_tecnico;
  end if;

  select count(*)::int into v_activas
  from public.ordenes
  where tecnico_id = p_tecnico_id and estado in ('Asignada', 'En atención');

  return json_build_object(
    'id',              v_tecnico.id,
    'nombre_completo', v_tecnico.nombre_completo,
    'estado',          v_tecnico.estado,
    'cambio',          v_cambio,
    'ordenes_activas', v_activas
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 7. Estado del técnico que tiene la sesión abierta
--    Devuelve 'Activo', 'Inactivo' o null (la cuenta no es un técnico vinculado).
--    Sirve para avisar «Tu cuenta está inactiva» en vez de mostrar una lista vacía
--    (mi_tecnico_id() solo devuelve el técnico cuando está «Activo»).
-- ---------------------------------------------------------------------
create or replace function public.mi_estado_tecnico()
returns public.estado_tecnico
language sql
stable
security definer
set search_path = ''
as $$
  select estado from public.tecnicos where perfil_id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- 8. Permisos para llamar a las funciones (solo usuarios con sesión)
-- ---------------------------------------------------------------------
revoke execute on function public.registrar_tecnico(text, text, text, text)  from public, anon;
revoke execute on function public.cambiar_estado_tecnico(uuid, text)         from public, anon;
revoke execute on function public.mi_estado_tecnico()                        from public, anon;

grant execute on function public.registrar_tecnico(text, text, text, text)   to authenticated;
grant execute on function public.cambiar_estado_tecnico(uuid, text)          to authenticated;
grant execute on function public.mi_estado_tecnico()                         to authenticated;
