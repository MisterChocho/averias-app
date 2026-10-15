-- =====================================================================
-- 05_datos_flujo.sql : averías y órdenes de ejemplo en TODOS los estados
-- Sirve para que cada historia se pueda programar y probar sin esperar
-- a que otra esté terminada (por ejemplo, HU04 no espera a HU03).
-- Ejecutar UNA vez en Supabase > SQL Editor (después de 01 a 04).
-- Todas las descripciones empiezan con "[PRUEBA]" para reconocerlas.
-- =====================================================================

do $$
declare
  v_agente   uuid := (select id from public.perfiles where correo = 'agente@demo.com');
  v_tecnico  uuid := (select id from public.tecnicos where dni = '45123456');
  v_av       uuid;
begin
  -- ---------- HU04: averías "Reportada" (falla simple, listas para la guía) ----------
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id)
  select c.id, t.id, '[PRUEBA] ' || x.descr, v_agente
  from (values
    ('70123456', 'Sin conexión a internet', 'El cliente no tiene internet desde la mañana.'),
    ('71234567', 'Internet lento',          'La conexión está muy lenta en las noches.'),
    ('72345678', 'Sin señal de TV',         'El televisor muestra "Sin señal".')
  ) as x(doc, tipo, descr)
  join public.clientes c on c.documento = x.doc
  join public.tipos_averia t on t.nombre = x.tipo;

  -- ---------- HU04: avería "En diagnóstico" interrumpida en el paso 2 (para retomar) ----------
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id,
                              estado, inicio_diagnostico, ultimo_paso)
  select c.id, t.id, '[PRUEBA] Se cortó la llamada durante la guía.', v_agente,
         'En diagnóstico', now() - interval '20 minutes', 2
  from public.clientes c, public.tipos_averia t
  where c.documento = '73456789' and t.nombre = 'Equipo apagado';

  -- ---------- HU05: averías "Resuelta" en primer contacto (listas para valorar) ----------
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado,
                              inicio_diagnostico, ultimo_paso, fin_diagnostico,
                              fecha_resolucion, tiempo_diagnostico_seg)
  select c.id, t.id, '[PRUEBA] ' || x.descr, v_agente, 'Resuelta',
         now() - interval '30 minutes', 3, now() - interval '22 minutes',
         now() - interval '22 minutes', 480
  from (values
    ('74567890', 'Sin conexión a internet', 'Se resolvió reiniciando el router.'),
    ('75678901', 'Equipo apagado',          'El adaptador estaba desconectado.')
  ) as x(doc, tipo, descr)
  join public.clientes c on c.documento = x.doc
  join public.tipos_averia t on t.nombre = x.tipo;

  -- ---------- HU06: averías "No resuelta" SIN orden (listas para generar la orden) ----------
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] ' || x.descr, v_agente, 'No resuelta'
  from (values
    ('76789012',    'Router averiado',        'El router no enciende ni con otro adaptador.'),
    ('20481234567', 'Cable dañado',           'El cable de fibra está cortado en la fachada.'),
    ('77890123',    'Instalación defectuosa', 'La roseta quedó suelta tras la instalación.')
  ) as x(doc, tipo, descr)
  join public.clientes c on c.documento = x.doc
  join public.tipos_averia t on t.nombre = x.tipo;

  -- ---------- HU07 / HU08 (y Sprint 2-3): órdenes en cada estado ----------
  -- Orden "Pendiente" (se puede modificar y cancelar)
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] Router con luces apagadas.', v_agente, 'No resuelta'
  from public.clientes c, public.tipos_averia t
  where c.documento = '70123456' and t.nombre = 'Router averiado'
  returning id into v_av;
  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, horario_preferido, agente_id)
  select v_av, c.direccion, c.telefono, 'Mañanas', v_agente
  from public.averias a join public.clientes c on c.id = a.cliente_id where a.id = v_av;

  -- Orden "Pendiente" en otra zona
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] Cable coaxial roto por obras.', v_agente, 'No resuelta'
  from public.clientes c, public.tipos_averia t
  where c.documento = '71234567' and t.nombre = 'Cable dañado'
  returning id into v_av;
  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, agente_id)
  select v_av, c.direccion, c.telefono, v_agente
  from public.averias a join public.clientes c on c.id = a.cliente_id where a.id = v_av;

  -- Orden "Asignada" al técnico Raúl Paz (para probar la notificación al modificar/cancelar)
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] Router reinicia solo cada hora.', v_agente, 'No resuelta'
  from public.clientes c, public.tipos_averia t
  where c.documento = '72345678' and t.nombre = 'Router averiado'
  returning id into v_av;
  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, agente_id,
                              estado, tecnico_id, fecha_asignacion, fecha_programada)
  select v_av, c.direccion, c.telefono, v_agente,
         'Asignada', v_tecnico, now() - interval '1 hour', current_date + 1
  from public.averias a join public.clientes c on c.id = a.cliente_id where a.id = v_av;

  -- Orden "En atención" (NO se puede modificar ni cancelar)
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] Instalación nueva sin señal.', v_agente, 'No resuelta'
  from public.clientes c, public.tipos_averia t
  where c.documento = '73456789' and t.nombre = 'Instalación defectuosa'
  returning id into v_av;
  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, agente_id,
                              estado, tecnico_id, fecha_asignacion)
  select v_av, c.direccion, c.telefono, v_agente,
         'En atención', v_tecnico, now() - interval '3 hours'
  from public.averias a join public.clientes c on c.id = a.cliente_id where a.id = v_av;

  -- Orden "Cerrada" (NO se puede modificar ni cancelar; útil para HU19/HU20)
  insert into public.averias (cliente_id, tipo_averia_id, descripcion, agente_id, estado)
  select c.id, t.id, '[PRUEBA] Cable cambiado por el técnico.', v_agente, 'Resuelta'
  from public.clientes c, public.tipos_averia t
  where c.documento = '20509876543' and t.nombre = 'Cable dañado'
  returning id into v_av;
  insert into public.ordenes (averia_id, direccion_atencion, telefono_contacto, agente_id,
                              estado, tecnico_id, fecha_asignacion, fecha_cierre)
  select v_av, c.direccion, c.telefono, v_agente,
         'Cerrada', v_tecnico, now() - interval '1 day', now() - interval '20 hours'
  from public.averias a join public.clientes c on c.id = a.cliente_id where a.id = v_av;
end;
$$;

-- Ver lo que quedó cargado
select a.codigo as averia, a.estado as estado_averia, o.codigo as orden, o.estado as estado_orden,
       left(a.descripcion, 50) as descripcion
from public.averias a
left join public.ordenes o on o.averia_id = a.id
where a.descripcion like '[PRUEBA]%'
order by a.codigo;
