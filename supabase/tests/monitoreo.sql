\set ON_ERROR_STOP on
begin;

-- Solo PostgreSQL desechable con Auth y Storage simulados.
create function pg_temp.persona(n integer) returns uuid language sql
as $$ select ('00000000-0000-4000-8000-00000000000' || n)::uuid $$;
create function pg_temp.sesion(n integer) returns void language plpgsql as $$
begin
    perform set_config('request.jwt.claim.sub', pg_temp.persona(n)::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.persona(n),
        'role', 'authenticated', 'amr', '[{"method":"password"}]'::jsonb)::text, true);
end;
$$;
create function pg_temp.acta(n integer) returns uuid language sql
as $$ select ('10000000-0000-4000-8000-00000000000' || n)::uuid $$;
create function pg_temp.operacion(n integer) returns uuid language sql
as $$ select ('20000000-0000-4000-8000-00000000000' || n)::uuid $$;

do $$
declare
    fila record;
    reserva jsonb;
    correo text;
begin
    for fila in select * from (values
        (1, null, null, '1700000019'), (2, 1, null, '1700000027'),
        (3, 2, 'R01', '1700000035'), (4, 1, null, '1700000043'), (5, 4, 'R02', '1700000050'), (6, 1, null, '1700000068')
    ) as f(n, actor, recinto, cedula) order by n loop
        correo := 'monitoreo-prueba-' || fila.n || '@example.test';
        reserva := public.reservar_invitacion(pg_temp.persona(fila.actor), fila.recinto,
            correo, fila.cedula, 'Prueba', 'Monitoreo', '0999999999');
        insert into auth.users (id, email, invited_at, email_confirmed_at, encrypted_password, raw_user_meta_data)
        values (pg_temp.persona(fila.n), correo, now(), now(), 'hash-simulado',
            jsonb_build_object('actaquito_invitacion', reserva->>'id'));
        perform public.confirmar_invitacion((reserva->>'id')::uuid);
        perform pg_temp.sesion(fila.n);
        perform public.activar_cuenta();
        if fila.n in (2, 4) then
            perform pg_temp.sesion(1);
            perform public.asignar_coordinador(case when fila.n = 2 then 'R01' else 'R02' end, pg_temp.persona(fila.n));
        end if;
    end loop;
    if not exists (select 1 from pg_proc where oid = 'public.leer_monitoreo_electoral()'::regprocedure
                    and not prosecdef and proconfig = array['search_path=""'])
       or not exists (select 1 from pg_proc
                      where oid = 'actaquito_privado.notificar_monitoreo_electoral()'::regprocedure
                        and prosecdef and proconfig = array['search_path=""'])
       or exists (
            select 1 from unnest(array['anon','authenticated','service_role']) as roles(nombre)
            where has_function_privilege(roles.nombre, 'actaquito_privado.notificar_monitoreo_electoral()', 'EXECUTE')
       )
       or not exists (select 1 from pg_class where oid = 'public.senal_monitoreo_electoral'::regclass and relrowsecurity)
       or exists (select 1 from pg_class where oid in ('public.actas_confirmadas_monitoreo'::regclass,
            'public.resultados_preliminares'::regclass, 'public.mapa_recintos_electoral'::regclass)
           and not coalesce(reloptions @> array['security_invoker=true'], false)) then
        raise exception 'Privilegios, search_path o RLS de monitoreo incorrectos';
    end if;
    if has_function_privilege('anon', 'public.leer_monitoreo_electoral()', 'EXECUTE')
       or has_table_privilege('authenticated', 'public.senal_monitoreo_electoral', 'UPDATE')
       or not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'senal_monitoreo_electoral') then
        raise exception 'Permisos o publicación incorrectos';
    end if;
end;
$$;

insert into public.provincias values ('FUERA_PRUEBA', 'Provincia de prueba');
insert into public.cantones values ('FUERA_PRUEBA', 'FUERA_PRUEBA', 'Cantón de prueba');
insert into public.parroquias values ('FUERA_PRUEBA', 'FUERA_PRUEBA', 'Parroquia de prueba', 'urbana');
insert into public.recintos values ('FUERA_PRUEBA', 'FUERA_PRUEBA', 'Recinto de prueba', 0, 0);
insert into public.senal_monitoreo_electoral (recinto_codigo) values ('FUERA_PRUEBA');

set local role authenticated;
select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(3));
select pg_temp.sesion(3);
select public.guardar_borrador_acta(pg_temp.acta(1), gen_random_uuid(), 'R01', 1::smallint, 'ALCALDIA',
    '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', 1, 1, 5);
select public.guardar_borrador_acta(pg_temp.acta(2), gen_random_uuid(), 'R01', 1::smallint, 'PREFECTURA',
    '{"MFC":0,"ARP":0,"MUC":0,"FDP":0,"MNE":0}', 2, 1, 3);
select public.reservar_evidencia_acta(pg_temp.acta(n), 1, pg_temp.operacion(n), repeat('a', 64),
    -0.173, -78.483, 9, now(), now()) from generate_series(1,2) f(n);

select pg_temp.sesion(1);
do $$
declare
    datos jsonb := public.leer_monitoreo_electoral();
begin
    if exists (
        select m.codigo, m.nombre, m.parroquia_codigo, m.parroquia, m.latitud, m.longitud
        from public.mapa_recintos_electoral m
        except
        select r.codigo, r.nombre, p.codigo, p.nombre, r.latitud, r.longitud
        from public.recintos r join public.parroquias p on p.codigo = r.parroquia_codigo
    ) or exists (
        select 1 from public.mapa_recintos_electoral where mesas <>
            '[{"numero":1,"reportada":false},{"numero":2,"reportada":false},{"numero":3,"reportada":false}]'::jsonb
    ) then
        raise exception 'El mapa difiere de las coordenadas, parroquias o mesas de la semilla';
    end if;
    if jsonb_array_length(datos->'actas') <> 0
       or jsonb_array_length(datos->'resultados') <> 26
       or jsonb_array_length(datos->'recintos') <> 12
       or (select sum(total_mesas) from public.mapa_recintos_electoral) <> 36
       or exists (select 1 from public.resultados_preliminares where actas_confirmadas <> 0
                  or candidaturas->0->'porcentaje_votos_validos' <> 'null')
       or exists (select 1 from public.senal_monitoreo_electoral)
       or exists (select 1 from public.mapa_recintos_electoral where mesas_reportadas <> 0) then
        raise exception 'Se incluyó un borrador o se perdió el catálogo territorial';
    end if;
end;
$$;

reset role;
insert into storage.objects (bucket_id, name, metadata)
select 'actas-evidencia', ruta, '{"mimetype":"image/jpeg"}' from actaquito_privado.reservas_evidencia;
set local role service_role;
select public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('a', 64));
select public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('a', 64));
reset role;
set local role authenticated;
select pg_temp.sesion(1);

do $$
begin
    if not exists (select 1 from public.resultados_preliminares where recinto_codigo is null
        and dignidad_codigo = 'ALCALDIA' and actas_confirmadas = 1 and sufragantes = 5
        and votos_validos = 3 and blancos = 1 and nulos = 1
        and (candidaturas->0->>'porcentaje_votos_validos')::numeric = 66.67)
       or exists (select 1 from public.resultados_preliminares where dignidad_codigo='PREFECTURA' and actas_confirmadas <> 0)
       or exists (select 1 from public.mapa_recintos_electoral where mesas_reportadas <> 0)
       or not exists (select 1 from public.senal_monitoreo_electoral where recinto_codigo = 'R01' and revision = 1) then
        raise exception 'La primera dignidad no se contabilizó correctamente o reportó toda la mesa';
    end if;
end;
$$;

reset role;
set local role service_role;
select public.confirmar_evidencia_acta(pg_temp.operacion(2), repeat('a', 64));
reset role;
set local role authenticated;
select pg_temp.sesion(2);
select public.guardar_borrador_acta(pg_temp.acta(1), gen_random_uuid(), 'R01', 1::smallint, 'ALCALDIA',
    '{"MFC":1.0,"ARP":2,"MUC":0,"FDP":0,"MNE":0}', 2, 0, 5);

do $$
declare
    datos jsonb := public.leer_monitoreo_electoral();
begin
    if jsonb_array_length(datos->'actas') <> 2 or jsonb_array_length(datos->'recintos') <> 1
       or not exists (select 1 from public.mapa_recintos_electoral where codigo = 'R01'
           and mesas_reportadas = 1 and mesas_pendientes = 2 and mesas->0->>'reportada' = 'true')
       or not exists (select 1 from public.resultados_preliminares where recinto_codigo = 'R01'
           and dignidad_codigo = 'ALCALDIA' and actas_confirmadas = 1 and sufragantes = 5
           and (candidaturas->0->>'votos')::numeric = 1 and blancos = 2 and nulos = 0)
       or not exists (select 1 from public.resultados_preliminares where recinto_codigo = 'R01'
           and dignidad_codigo = 'PREFECTURA' and actas_confirmadas = 1 and sufragantes = 3
           and votos_validos = 0 and candidaturas->0->'porcentaje_votos_validos' = 'null')
       or not exists (select 1 from public.actas_confirmadas_monitoreo a join public.actas_evidencias e using (acta_id)
          where a.acta_id = pg_temp.acta(1) and a.version = 2 and e.version = 1
            and (a.latitud, a.longitud, a.distancia_metros) = (e.latitud, e.longitud, e.distancia_metros))
       or not exists (select 1 from public.senal_monitoreo_electoral where recinto_codigo = 'R01' and revision = 3) then
        raise exception 'La segunda dignidad, la revisión o la señal no fueron consistentes';
    end if;
end;
$$;

select pg_temp.sesion(4);
do $$
begin
    if exists (select 1 from public.actas_confirmadas_monitoreo)
       or exists (select 1 from public.senal_monitoreo_electoral)
       or exists (select 1 from public.mapa_recintos_electoral where codigo <> 'R02') then
        raise exception 'El coordinador vio información de otro recinto';
    end if;
end;
$$;

select public.asignar_veedor('R02', 1::smallint, pg_temp.persona(5));
select pg_temp.sesion(5);
select public.guardar_borrador_acta(pg_temp.acta(3), gen_random_uuid(), 'R02', 1::smallint, 'ALCALDIA',
    '{"MFC":7,"ARP":0,"MUC":0,"FDP":0,"MNE":0}', 0, 0, 7);
select public.reservar_evidencia_acta(pg_temp.acta(3), 1, pg_temp.operacion(3), repeat('a', 64),
    r.latitud, r.longitud, 9, now(), now()) from public.recintos r where r.codigo = 'R02';
reset role;
insert into storage.objects (bucket_id, name, metadata)
select 'actas-evidencia', ruta, '{"mimetype":"image/jpeg"}'
from actaquito_privado.reservas_evidencia where operacion_id = pg_temp.operacion(3);
set local role service_role;
select public.confirmar_evidencia_acta(pg_temp.operacion(3), repeat('a', 64));
reset role;
set local role authenticated;
do $$
declare
    rol integer;
begin
    if not has_column_privilege(current_user, 'public.actas_revisiones', 'acta_id', 'SELECT')
       or exists (
         select 1 from unnest(array['version','votos','blancos','nulos','sufragantes','recibida_en']) as c(nombre)
         where not has_column_privilege(current_user, 'public.actas_revisiones', c.nombre, 'SELECT')
       ) or has_column_privilege(current_user, 'public.actas_revisiones', 'actor_cedula', 'SELECT') then
        raise exception 'Los GRANT de columnas son incompletos o excesivos';
    end if;
    perform pg_temp.sesion(1);
    if (select count(*) from public.actas_confirmadas_monitoreo) <> 3
       or not exists (select 1 from public.resultados_preliminares where recinto_codigo is null
           and dignidad_codigo = 'ALCALDIA' and actas_confirmadas = 2 and sufragantes = 12)
       or (select count(*) from public.senal_monitoreo_electoral) <> 2
       or exists (select 1 from public.mapa_recintos_electoral where codigo = 'FUERA_PRUEBA') then
        raise exception 'El provincial no puede consultar ambos recintos o excede su jurisdicción';
    end if;
    foreach rol in array array[2,4] loop
        perform pg_temp.sesion(rol);
        if (select count(*) from public.mapa_recintos_electoral) <> 1
           or (select count(*) from public.resultados_preliminares) <> 2
           or exists (select 1 from public.resultados_preliminares where recinto_codigo is distinct from
               case when rol = 2 then 'R01' else 'R02' end)
           or (select count(*) from public.actas_confirmadas_monitoreo) <> (case when rol = 2 then 2 else 1 end)
           or exists (select 1 from public.senal_monitoreo_electoral where recinto_codigo <>
               case when rol = 2 then 'R01' else 'R02' end)
           or (select count(*) from public.senal_monitoreo_electoral) <> 1 then
            raise exception 'Ámbito incorrecto para el coordinador %', rol;
        end if;
    end loop;
    perform pg_temp.sesion(6);
    if public.leer_monitoreo_electoral() <> '{"actas":[],"resultados":[],"recintos":[]}'::jsonb
       or exists (select 1 from public.senal_monitoreo_electoral) then
        raise exception 'Un coordinador sin asignación accedió al monitoreo';
    end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
    begin
        perform public.leer_monitoreo_electoral();
        raise exception 'El rol anónimo ejecutó la RPC';
    exception when insufficient_privilege then null;
    end;
    begin
        perform 1 from public.senal_monitoreo_electoral;
        raise exception 'El rol anónimo recibió la señal';
    exception when insufficient_privilege then null;
    end;
end;
$$;
reset role;
set local role authenticated;
select pg_temp.sesion(3);
do $$
begin
    if public.leer_monitoreo_electoral() <> '{"actas":[],"resultados":[],"recintos":[]}'::jsonb
       or exists (select 1 from public.senal_monitoreo_electoral) then
        raise exception 'El veedor obtuvo acceso al panel de seguimiento';
    end if;
end;
$$;
reset role;
do $$
begin
    begin
        delete from public.senal_monitoreo_electoral where recinto_codigo = 'R01';
        raise exception 'La señal territorial generó un DELETE';
    exception when insufficient_privilege then null;
    end;
    begin
        truncate public.senal_monitoreo_electoral;
        raise exception 'La señal territorial pudo truncarse';
    exception when insufficient_privilege then null;
    end;
end;
$$;
rollback;
