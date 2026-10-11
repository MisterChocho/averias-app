-- =====================================================================
-- 03_datos_prueba.sql : catálogos y datos de ejemplo para desarrollar y hacer la demo
-- Los nombres y documentos son inventados.
-- =====================================================================

-- ---------- Zonas de atención (distritos de Trujillo) ----------
insert into public.zonas (nombre) values
  ('Trujillo Centro'), ('La Esperanza'), ('El Porvenir'),
  ('Víctor Larco'), ('Florencia de Mora'), ('Huanchaco');

-- ---------- Tipos de avería ----------
-- requiere_tecnico = false -> falla simple, se intenta resolver con la guía (HU04)
insert into public.tipos_averia (nombre, requiere_tecnico) values
  ('Sin conexión a internet', false),
  ('Internet lento',          false),
  ('Equipo apagado',          false),
  ('Sin señal de TV',         false),
  ('Cable dañado',            true),
  ('Router averiado',         true),
  ('Instalación defectuosa',  true);

-- ---------- Guías de diagnóstico (HU04 / HU15) ----------
insert into public.guias (tipo_averia_id, titulo)
select id, 'Guía: ' || nombre from public.tipos_averia where requiere_tecnico = false;

insert into public.guia_pasos (guia_id, orden, instruccion)
select g.id, p.orden, p.instruccion
from public.guias g
join public.tipos_averia t on t.id = g.tipo_averia_id
join (values
  ('Sin conexión a internet', 1, 'Verificar que el router esté encendido y con la luz de energía fija.'),
  ('Sin conexión a internet', 2, 'Revisar que el cable de fibra o coaxial esté bien conectado al router.'),
  ('Sin conexión a internet', 3, 'Apagar el router, esperar 30 segundos y volver a encenderlo.'),
  ('Sin conexión a internet', 4, 'Esperar 2 minutos y comprobar si la luz de internet queda fija.'),
  ('Internet lento',          1, 'Preguntar cuántos equipos están conectados a la red en este momento.'),
  ('Internet lento',          2, 'Reiniciar el router (apagar 30 segundos y encender).'),
  ('Internet lento',          3, 'Pedir que pruebe la velocidad conectando un equipo por cable.'),
  ('Equipo apagado',          1, 'Verificar que el adaptador esté conectado al tomacorriente y al equipo.'),
  ('Equipo apagado',          2, 'Probar el equipo en otro tomacorriente.'),
  ('Equipo apagado',          3, 'Presionar el botón de encendido durante 5 segundos.'),
  ('Sin señal de TV',         1, 'Verificar que el decodificador esté encendido.'),
  ('Sin señal de TV',         2, 'Revisar que el televisor esté en la entrada HDMI correcta.'),
  ('Sin señal de TV',         3, 'Reiniciar el decodificador desconectándolo 30 segundos.')
) as p(tipo, orden, instruccion) on p.tipo = t.nombre;

-- ---------- Clientes de ejemplo (HU01, HU02) ----------
insert into public.clientes (nombre_completo, documento, telefono, correo, direccion, zona_id)
select c.nombre, c.doc, c.tel, c.correo, c.dir, z.id
from (values
  ('María Fernanda Ríos Paredes',   '70123456',    '949111222', 'maria.rios@correo.com',    'Av. España 1450',        'Trujillo Centro', 1),
  ('Carlos Alberto Mendoza Ruiz',   '71234567',    '949222333', 'carlos.mendoza@correo.com','Calle Los Pinos 230',     'La Esperanza', 2),
  ('Lucía Esther Vargas Campos',    '72345678',    '949333444', 'lucia.vargas@correo.com',  'Jr. Bolívar 812',         'Trujillo Centro', 3),
  ('Jorge Luis Castillo Herrera',   '73456789',    '949444555', null,                       'Av. Larco 1820',          'Víctor Larco', 4),
  ('Ana Sofía Quispe Morales',      '74567890',    '949555666', 'ana.quispe@correo.com',    'Calle Grau 145',          'El Porvenir', 5),
  ('Pedro Pablo Salazar Torres',    '75678901',    '949666777', null,                       'Mz. B Lt. 12 Alto Trujillo','El Porvenir', 6),
  ('Rosa Elena Gutiérrez Silva',    '76789012',    '949777888', 'rosa.gutierrez@correo.com','Av. La Marina 560',       'Huanchaco', 7),
  ('Inversiones Norte S.A.C.',      '20481234567', '044123456', 'contacto@invnorte.com',    'Av. América Sur 2100',    'Víctor Larco', 8),
  ('Miguel Ángel Rojas Chávez',     '77890123',    '949888999', null,                       'Calle 5 de Abril 340',    'Florencia de Mora', 9),
  ('Comercial Santa Rosa E.I.R.L.', '20509876543', '044654321', 'ventas@santarosa.com',     'Jr. Pizarro 999',         'Trujillo Centro', 10)
) as c(nombre, doc, tel, correo, dir, zona, n)
join public.zonas z on z.nombre = c.zona
order by c.n;  -- mantiene el orden para que los códigos salgan CLI-00001, CLI-00002...

-- ---------- Técnicos de ejemplo (HU09, HU10) ----------
insert into public.tecnicos (nombre_completo, dni, telefono, correo, max_ordenes) values
  ('Raúl Ernesto Paz Domínguez',  '45123456', '948100200', 'raul.paz@empresa.com',   3),
  ('Diana Carolina León Ávila',   '46234567', '948200300', 'diana.leon@empresa.com', 3),
  ('Hugo Martín Cruz Benites',    '47345678', '948300400', 'hugo.cruz@empresa.com',  2);

insert into public.tecnico_zonas (tecnico_id, zona_id)
select t.id, z.id
from public.tecnicos t
join public.zonas z on
  (t.dni = '45123456' and z.nombre in ('Trujillo Centro', 'Víctor Larco')) or
  (t.dni = '46234567' and z.nombre in ('La Esperanza', 'Florencia de Mora')) or
  (t.dni = '47345678' and z.nombre in ('El Porvenir', 'Huanchaco'));

-- =====================================================================
-- USUARIOS DE PRUEBA (hacer después de crearlos en Authentication > Users)
-- 1. Crea 4 usuarios con estos correos y la contraseña que quieran:
--      agente@demo.com, gerente@demo.com, tecnico@demo.com, cliente@demo.com
--    Al crearlos, el trigger les pone rol 'cliente' por defecto.
-- 2. Luego ejecuta este bloque para asignar roles y enlazar cuentas:
-- =====================================================================
-- update public.perfiles set rol = 'agente',  nombre_completo = 'Agente Demo'  where correo = 'agente@demo.com';
-- update public.perfiles set rol = 'gerente', nombre_completo = 'Gerente Demo' where correo = 'gerente@demo.com';
-- update public.perfiles set rol = 'tecnico', nombre_completo = 'Raúl Paz'     where correo = 'tecnico@demo.com';
-- update public.perfiles set nombre_completo = 'María Ríos'                    where correo = 'cliente@demo.com';
-- update public.tecnicos set perfil_id = (select id from public.perfiles where correo = 'tecnico@demo.com') where dni = '45123456';
-- update public.clientes set perfil_id = (select id from public.perfiles where correo = 'cliente@demo.com') where documento = '70123456';
