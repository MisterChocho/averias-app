-- =====================================================================
-- 02_seguridad.sql : quién puede ver y modificar cada tabla (Row Level Security)
-- Regla general:
--   * Personal (agente, gerente, técnico) ve la información operativa.
--   * El cliente solo ve sus propios datos, averías y órdenes.
--   * Cada rol solo modifica lo que le corresponde según sus historias.
-- Las reglas de negocio finas (estados, validaciones) se programan en cada HU.
-- =====================================================================

-- ---------- Funciones de apoyo ----------
create or replace function public.rol_actual()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.es_personal()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.rol_actual() in ('agente', 'gerente', 'tecnico'), false) $$;

create or replace function public.mi_cliente_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.clientes where perfil_id = auth.uid() $$;

create or replace function public.mi_tecnico_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.tecnicos where perfil_id = auth.uid() and estado = 'Activo' $$;

-- ---------- Activar RLS en todas las tablas ----------
alter table public.perfiles          enable row level security;
alter table public.zonas             enable row level security;
alter table public.tipos_averia      enable row level security;
alter table public.guias             enable row level security;
alter table public.guia_pasos        enable row level security;
alter table public.clientes          enable row level security;
alter table public.tecnicos          enable row level security;
alter table public.tecnico_zonas     enable row level security;
alter table public.historial_zonas   enable row level security;
alter table public.averias           enable row level security;
alter table public.valoraciones      enable row level security;
alter table public.ordenes           enable row level security;
alter table public.atenciones        enable row level security;
alter table public.evidencias        enable row level security;
alter table public.calificaciones    enable row level security;
alter table public.notificaciones    enable row level security;
alter table public.historial_estados enable row level security;

-- ---------- Perfiles ----------
-- Nadie puede cambiar su propio rol desde la app: los roles se asignan en el SQL Editor.
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.rol_actual() in ('agente', 'gerente'));

-- ---------- Catálogos: todos leen, el gerente administra ----------
create policy zonas_ver on public.zonas for select to authenticated using (true);
create policy zonas_gerente on public.zonas for all to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

create policy tipos_ver on public.tipos_averia for select to authenticated using (true);
create policy tipos_gerente on public.tipos_averia for all to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

create policy guias_ver on public.guias for select to authenticated using (true);
create policy guias_gerente on public.guias for all to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

create policy pasos_ver on public.guia_pasos for select to authenticated using (true);
create policy pasos_gerente on public.guia_pasos for all to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

-- ---------- Clientes (solo lectura desde la app, HU02) ----------
create policy clientes_ver on public.clientes for select to authenticated
  using (public.es_personal() or perfil_id = auth.uid());

-- ---------- Técnicos y zonas (HU09–HU11) ----------
create policy tecnicos_ver on public.tecnicos for select to authenticated
  using (public.es_personal());
create policy tecnicos_gerente_insertar on public.tecnicos for insert to authenticated
  with check (public.rol_actual() = 'gerente');
create policy tecnicos_gerente_editar on public.tecnicos for update to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

create policy tz_ver on public.tecnico_zonas for select to authenticated
  using (public.es_personal());
create policy tz_gerente on public.tecnico_zonas for all to authenticated
  using (public.rol_actual() = 'gerente') with check (public.rol_actual() = 'gerente');

create policy hz_ver on public.historial_zonas for select to authenticated
  using (public.rol_actual() = 'gerente');
create policy hz_insertar on public.historial_zonas for insert to authenticated
  with check (public.rol_actual() = 'gerente');

-- ---------- Averías (HU03, HU04, HU16) ----------
create policy averias_ver on public.averias for select to authenticated
  using (public.es_personal() or cliente_id = public.mi_cliente_id());
create policy averias_agente_insertar on public.averias for insert to authenticated
  with check (public.rol_actual() = 'agente');
create policy averias_cliente_insertar on public.averias for insert to authenticated
  with check (
    public.rol_actual() = 'cliente'
    and cliente_id = public.mi_cliente_id()
    and canal = 'web'
  );
create policy averias_agente_editar on public.averias for update to authenticated
  using (public.rol_actual() = 'agente') with check (public.rol_actual() = 'agente');

-- ---------- Valoraciones (HU05): se insertan, no se editan ni borran ----------
create policy valoraciones_ver on public.valoraciones for select to authenticated
  using (public.es_personal());
create policy valoraciones_insertar on public.valoraciones for insert to authenticated
  with check (public.rol_actual() = 'agente');

-- ---------- Órdenes (HU06–HU08, HU12–HU14, HU17, HU24) ----------
create policy ordenes_ver on public.ordenes for select to authenticated
  using (
    public.es_personal()
    or exists (
      select 1 from public.averias a
      where a.id = ordenes.averia_id and a.cliente_id = public.mi_cliente_id()
    )
  );
create policy ordenes_agente_insertar on public.ordenes for insert to authenticated
  with check (public.rol_actual() = 'agente');
create policy ordenes_agente_editar on public.ordenes for update to authenticated
  using (public.rol_actual() = 'agente') with check (public.rol_actual() = 'agente');
-- El técnico activo puede tomar órdenes libres o actualizar las suyas
create policy ordenes_tecnico_editar on public.ordenes for update to authenticated
  using (
    public.mi_tecnico_id() is not null
    and (tecnico_id = public.mi_tecnico_id() or (estado = 'Pendiente' and tecnico_id is null))
  )
  with check (tecnico_id = public.mi_tecnico_id());
-- El cliente solo puede cancelar sus órdenes (HU17)
create policy ordenes_cliente_cancelar on public.ordenes for update to authenticated
  using (
    exists (
      select 1 from public.averias a
      where a.id = ordenes.averia_id and a.cliente_id = public.mi_cliente_id()
    )
  )
  with check (estado = 'Cancelada');

-- ---------- Atenciones y evidencias (HU13, HU14) ----------
create policy atenciones_ver on public.atenciones for select to authenticated
  using (public.es_personal());
create policy atenciones_insertar on public.atenciones for insert to authenticated
  with check (tecnico_id = public.mi_tecnico_id());

create policy evidencias_ver on public.evidencias for select to authenticated
  using (public.es_personal());
create policy evidencias_insertar on public.evidencias for insert to authenticated
  with check (public.mi_tecnico_id() is not null);

-- ---------- Calificaciones (HU19) ----------
create policy calificaciones_ver on public.calificaciones for select to authenticated
  using (
    public.es_personal()
    or exists (
      select 1 from public.ordenes o join public.averias a on a.id = o.averia_id
      where o.id = calificaciones.orden_id and a.cliente_id = public.mi_cliente_id()
    )
  );
create policy calificaciones_insertar on public.calificaciones for insert to authenticated
  with check (
    exists (
      select 1 from public.ordenes o join public.averias a on a.id = o.averia_id
      where o.id = calificaciones.orden_id
        and a.cliente_id = public.mi_cliente_id()
        and o.estado = 'Cerrada'
    )
  );

-- ---------- Notificaciones (HU07, HU08) ----------
create policy notif_ver on public.notificaciones for select to authenticated
  using (tecnico_id = public.mi_tecnico_id() or public.rol_actual() in ('agente', 'gerente'));
create policy notif_insertar on public.notificaciones for insert to authenticated
  with check (public.rol_actual() in ('agente', 'gerente'));
create policy notif_marcar_leida on public.notificaciones for update to authenticated
  using (tecnico_id = public.mi_tecnico_id()) with check (tecnico_id = public.mi_tecnico_id());

-- ---------- Historial de estados (lo llenan los triggers) ----------
create policy historial_ver on public.historial_estados for select to authenticated
  using (public.es_personal());

-- ---------- Storage: bucket privado para las fotos de evidencia (HU14) ----------
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

create policy evidencias_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and public.mi_tecnico_id() is not null);
create policy evidencias_descargar on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and public.es_personal());
