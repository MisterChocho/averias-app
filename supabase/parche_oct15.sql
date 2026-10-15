-- Parche para bases ya cargadas (ejecutar una sola vez en el SQL Editor de Supabase)
update public.clientes set telefono = '949123456' where documento = '20481234567';
update public.clientes set telefono = '949654321' where documento = '20509876543';
update public.averias set estado = 'Resuelta'
where descripcion = '[PRUEBA] Cable cambiado por el técnico.';

