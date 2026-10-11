-- =====================================================================
-- Sistema de gestión de técnicos y órdenes de servicio (Grupo 04)
-- 01_schema.sql : tablas, tipos, códigos automáticos e historial de estados
-- Ejecutar en Supabase > SQL Editor (en orden: 01, 02, 03)
-- =====================================================================

-- ---------- Tipos (valores permitidos) ----------
create type public.rol_usuario    as enum ('agente', 'gerente', 'tecnico', 'cliente');
create type public.estado_averia  as enum ('Reportada', 'En diagnóstico', 'Resuelta', 'No resuelta');
create type public.estado_orden   as enum ('Pendiente', 'Asignada', 'En atención', 'Cerrada', 'Cancelada');
create type public.estado_tecnico as enum ('Activo', 'Inactivo');
create type public.canal_averia   as enum ('call_center', 'web');

-- ---------- Secuencias para los códigos legibles ----------
create sequence public.seq_cliente;
create sequence public.seq_averia;
create sequence public.seq_orden;

-- ---------- Usuarios del sistema (1 fila por cada cuenta de Supabase Auth) ----------
create table public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nombre_completo  text not null default '',
  correo           text,
  rol              public.rol_usuario not null default 'cliente',
  created_at       timestamptz not null default now()
);

-- ---------- Catálogos ----------
create table public.zonas (
  id      serial primary key,
  nombre  text not null unique
);

create table public.tipos_averia (
  id                serial primary key,
  nombre            text not null unique,
  requiere_tecnico  boolean not null default false,  -- false = falla simple (usa guía)
  activo            boolean not null default true
);

-- HU04 / HU15: guías de diagnóstico por tipo de avería
create table public.guias (
  id              serial primary key,
  tipo_averia_id  int not null unique references public.tipos_averia (id),
  titulo          text not null,
  activa          boolean not null default true
);

create table public.guia_pasos (
  id           serial primary key,
  guia_id      int not null references public.guias (id) on delete cascade,
  orden        int not null check (orden > 0),
  instruccion  text not null,
  unique (guia_id, orden)
);

-- ---------- Clientes (HU01, HU02) — solo lectura para el agente ----------
create table public.clientes (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique
                   default 'CLI-' || lpad(nextval('public.seq_cliente')::text, 5, '0'),
  nombre_completo  text not null,
  documento        text not null unique,          -- DNI (8) o RUC (11)
  telefono         text not null,
  correo           text,
  direccion        text not null,
  zona_id          int references public.zonas (id),
  perfil_id        uuid unique references public.perfiles (id) on delete set null, -- cuenta web del cliente
  created_at       timestamptz not null default now()
);

-- ---------- Técnicos (HU09, HU10, HU11) ----------
create table public.tecnicos (
  id               uuid primary key default gen_random_uuid(),
  nombre_completo  text not null,
  dni              text not null unique,           -- HU09: no se permiten DNI repetidos
  telefono         text not null,
  correo           text not null,
  estado           public.estado_tecnico not null default 'Activo',
  max_ordenes      int not null default 3 check (max_ordenes > 0),  -- HU11
  perfil_id        uuid unique references public.perfiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create table public.tecnico_zonas (
  tecnico_id  uuid not null references public.tecnicos (id) on delete cascade,
  zona_id     int  not null references public.zonas (id),
  primary key (tecnico_id, zona_id)
);

-- HU10: historial de cambios de zona
create table public.historial_zonas (
  id             bigserial primary key,
  tecnico_id     uuid not null references public.tecnicos (id) on delete cascade,
  zona_anterior  text,
  zona_nueva     text,
  autorizado_por uuid references public.perfiles (id),
  fecha          timestamptz not null default now()
);

-- ---------- Averías (HU03, HU04, HU16) ----------
create table public.averias (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique
                         default 'AV-' || lpad(nextval('public.seq_averia')::text, 6, '0'),
  cliente_id             uuid not null references public.clientes (id),
  tipo_averia_id         int  not null references public.tipos_averia (id),
  descripcion            text not null check (length(trim(descripcion)) > 0),
  estado                 public.estado_averia not null default 'Reportada',
  canal                  public.canal_averia  not null default 'call_center',
  agente_id              uuid references public.perfiles (id),
  fecha_registro         timestamptz not null default now(),
  inicio_diagnostico     timestamptz,
  ultimo_paso            int,                     -- HU04: para retomar la guía
  fin_diagnostico        timestamptz,
  fecha_resolucion       timestamptz,
  tiempo_diagnostico_seg int
);

-- HU05: valoración en call center (una por avería, no editable)
create table public.valoraciones (
  id          uuid primary key default gen_random_uuid(),
  averia_id   uuid not null unique references public.averias (id),
  puntaje     smallint check (puntaje between 1 and 5),
  no_desea    boolean not null default false,
  comentario  text,
  agente_id   uuid references public.perfiles (id),
  fecha       timestamptz not null default now(),
  check (no_desea or puntaje is not null),
  check (puntaje is null or puntaje > 2 or length(trim(coalesce(comentario, ''))) > 0)
);

-- ---------- Órdenes de avería (HU06, HU07, HU08, HU12–HU14, HU24) ----------
create table public.ordenes (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique
                      default 'OR-' || lpad(nextval('public.seq_orden')::text, 6, '0'),
  averia_id           uuid not null references public.averias (id),
  direccion_atencion  text not null,
  telefono_contacto   text not null,
  horario_preferido   text,
  fecha_programada    date,                       -- HU18
  estado              public.estado_orden not null default 'Pendiente',
  tecnico_id          uuid references public.tecnicos (id),
  agente_id           uuid references public.perfiles (id),
  fecha_registro      timestamptz not null default now(),
  fecha_asignacion    timestamptz,
  fecha_cierre        timestamptz,
  motivo_cancelacion  text,
  cancelado_por       uuid references public.perfiles (id),
  fecha_cancelacion   timestamptz,
  check (estado <> 'Cancelada' or length(trim(coalesce(motivo_cancelacion, ''))) > 0)
);

-- HU06: una avería solo puede tener una orden activa
create unique index ordenes_una_activa_por_averia
  on public.ordenes (averia_id)
  where estado in ('Pendiente', 'Asignada', 'En atención');

-- HU13: registro de atención del técnico
create table public.atenciones (
  id           uuid primary key default gen_random_uuid(),
  orden_id     uuid not null references public.ordenes (id),
  tecnico_id   uuid not null references public.tecnicos (id),
  diagnostico  text not null check (length(trim(diagnostico)) > 0),
  solucion     text not null check (length(trim(solucion)) > 0),
  fecha        timestamptz not null default now()
);

-- HU14: fotos de evidencia (el archivo va en Storage, bucket "evidencias")
create table public.evidencias (
  id          uuid primary key default gen_random_uuid(),
  orden_id    uuid not null references public.ordenes (id),
  ruta        text not null,                      -- ruta del archivo dentro del bucket
  subido_por  uuid references public.perfiles (id),
  fecha       timestamptz not null default now()
);

-- HU19: calificación del cliente (una por orden)
create table public.calificaciones (
  id          uuid primary key default gen_random_uuid(),
  orden_id    uuid not null unique references public.ordenes (id),
  puntaje     smallint not null check (puntaje between 1 and 5),
  comentario  text,
  fecha       timestamptz not null default now()
);

-- HU07 / HU08: avisos al técnico cuando su orden cambia o se cancela
create table public.notificaciones (
  id          bigserial primary key,
  tecnico_id  uuid not null references public.tecnicos (id) on delete cascade,
  orden_id    uuid references public.ordenes (id),
  mensaje     text not null,
  leida       boolean not null default false,
  fecha       timestamptz not null default now()
);

-- HU20 / HU21: cada cambio de estado queda registrado para medir tiempos por etapa
create table public.historial_estados (
  id               bigserial primary key,
  entidad          text not null check (entidad in ('averia', 'orden')),
  entidad_id       uuid not null,
  estado_anterior  text,
  estado_nuevo     text not null,
  usuario_id       uuid,
  fecha            timestamptz not null default now()
);

create index historial_estados_entidad_idx on public.historial_estados (entidad, entidad_id);
create index averias_cliente_idx on public.averias (cliente_id);
create index ordenes_tecnico_idx on public.ordenes (tecnico_id);
create index ordenes_estado_idx  on public.ordenes (estado);

-- ---------- Trigger: guardar historial de estados ----------
create or replace function public.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entidad text := case tg_table_name when 'averias' then 'averia' else 'orden' end;
begin
  if tg_op = 'INSERT' then
    insert into public.historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id)
    values (v_entidad, new.id, null, new.estado::text, auth.uid());
  elsif new.estado is distinct from old.estado then
    insert into public.historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id)
    values (v_entidad, new.id, old.estado::text, new.estado::text, auth.uid());
  end if;
  return new;
end;
$$;

create trigger averias_historial
  after insert or update of estado on public.averias
  for each row execute function public.registrar_cambio_estado();

create trigger ordenes_historial
  after insert or update of estado on public.ordenes
  for each row execute function public.registrar_cambio_estado();

-- ---------- Trigger: crear el perfil automáticamente al crear una cuenta ----------
-- El rol se toma de los metadatos de la cuenta (raw_user_meta_data.rol); por defecto 'cliente'.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''),
    new.email,
    case
      when new.raw_user_meta_data ->> 'rol' in ('agente', 'gerente', 'tecnico', 'cliente')
        then (new.raw_user_meta_data ->> 'rol')::public.rol_usuario
      else 'cliente'::public.rol_usuario
    end
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();
