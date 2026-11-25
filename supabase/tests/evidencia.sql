\set ON_ERROR_STOP on
begin;

-- Solo para PostgreSQL local. Las identidades y objetos de Storage son simulados.
create function pg_temp.persona(n integer) returns uuid language sql
as $$ select ('00000000-0000-4000-8000-00000000000' || n)::uuid $$;

create function pg_temp.sesion(n integer) returns void language sql
as $$
    select set_config('request.jwt.claims', jsonb_build_object(
        'sub', pg_temp.persona(n), 'role', 'authenticated',
        'amr', '[{"method":"password"}]'::jsonb
    )::text, true)
$$;

create function pg_temp.acta(n integer) returns uuid language sql
as $$ select ('10000000-0000-4000-8000-00000000000' || n)::uuid $$;

create function pg_temp.operacion(n integer) returns uuid language sql
as $$ select ('20000000-0000-4000-8000-00000000000' || n)::uuid $$;

create function pg_temp.reservar(n integer, norte double precision, op integer)
returns text language sql as $$
    select public.reservar_evidencia_acta(pg_temp.acta(n), 1, pg_temp.operacion(op), repeat('a', 64),
        norte, -78.4829615893297, 10, '2026-11-25 12:00:00+00', '2026-11-25 12:00:10+00')
$$;

do $$
declare
    fila record;
    id uuid;
    correo text;
    reserva jsonb;
begin
    for fila in select * from (values
        (1, null, null, '1700000019'), (2, 1, null, '1700000027'), (3, 2, 'R01', '1700000035'),
        (4, 2, 'R01', '1700000043'), (5, 1, null, '3000000012')
    ) as f(n, invitador, recinto, cedula) order by n loop
        id := pg_temp.persona(fila.n);
        correo := 'evidencia-prueba-' || fila.n || '@example.test';
        reserva := public.reservar_invitacion(pg_temp.persona(fila.invitador), fila.recinto,
            correo, fila.cedula, 'Prueba', 'Evidencia', '0999999999');
        insert into auth.users (id, email, invited_at, email_confirmed_at, encrypted_password, raw_user_meta_data)
        values (id, correo, now(), now(), 'hash-simulado', jsonb_build_object('actaquito_invitacion', reserva->>'id'));
        perform public.confirmar_invitacion((reserva->>'id')::uuid);
        perform pg_temp.sesion(fila.n);
        perform public.activar_cuenta();
        if fila.n in (2, 5) then
            perform pg_temp.sesion(1);
            perform public.asignar_coordinador(case when fila.n = 2 then 'R01' else 'R02' end, id);
        end if;
    end loop;
    if (select margen_gps_metros from public.configuracion_captura where canton_codigo = 'QUITO') <> 200
       or abs(actaquito_privado.distancia_evidencia(0, 0, 0.001, 0) - 111.195) > 0.01 then
        raise exception 'Configuración GPS o Haversine incorrectos';
    end if;
    if has_function_privilege('anon', 'public.reservar_evidencia_acta(uuid,integer,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.confirmar_evidencia_acta(uuid,text)', 'EXECUTE')
       or has_table_privilege('authenticated', 'public.actas_evidencias', 'INSERT')
       or has_table_privilege('service_role', 'public.actas_evidencias', 'UPDATE') then
        raise exception 'Privilegios indebidos';
    end if;
    if not exists (select 1 from storage.buckets b where b.id = 'actas-evidencia'
        and public = false and allowed_mime_types = array['image/jpeg']) then
        raise exception 'Bucket público o mal configurado';
    end if;
end;
$$;

set local role authenticated;
select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(3));
select pg_temp.sesion(3);
select public.guardar_borrador_acta(pg_temp.acta(n), gen_random_uuid(), 'R01', 1::smallint, dignidad,
    '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', 1, 1, 5)
from (values (1, 'ALCALDIA'), (2, 'PREFECTURA')) f(n, dignidad);

do $$
declare
    ruta text;
begin
    ruta := pg_temp.reservar(1, -0.17261842559297133, 1);
    if ruta <> pg_temp.reservar(1, -0.17261842559297133, 1)
       or ruta <> pg_temp.acta(1)::text || '/' || pg_temp.operacion(1)::text || '.jpg' then
        raise exception 'La reserva no es idempotente o la ruta no es canónica';
    end if;
    begin
        perform pg_temp.reservar(1, -0.170, 1);
        raise exception 'Se aceptó el UUID con otras coordenadas';
    exception when unique_violation then null;
    end;
    begin
        perform public.reservar_evidencia_acta(pg_temp.acta(2), 1, pg_temp.operacion(2), repeat('a', 64),
            -0.165, -78.4829615893297, 'NaN', now(), now());
        raise exception 'Se aceptó precisión GPS desconocida';
    exception when invalid_parameter_value then null;
    end;
    perform pg_temp.reservar(2, -0.165, 2);
    if exists (select 1 from public.mesas_actas_reportadas) or exists (select 1 from public.actas_evidencias) then
        raise exception 'Una reserva o borrador figura como recibido';
    end if;
    begin
        insert into storage.objects (bucket_id, name, metadata) values ('actas-evidencia', ruta, '{}');
        raise exception 'Storage permitió carga directa desde el móvil';
    exception when insufficient_privilege then null;
    end;
end;
$$;

select pg_temp.sesion(2);
do $$
begin
    begin
        perform pg_temp.reservar(1, -0.17261842559297133, 1);
        raise exception 'El coordinador pudo reservar evidencia en nombre del veedor';
    exception when insufficient_privilege then null;
    end;
end;
$$;
reset role;

set local role service_role;
do $$
begin
    begin
        perform public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('a', 64));
        raise exception 'Se aceptó una foto inexistente';
    exception when invalid_parameter_value then null;
    end;
end;
$$;
reset role;
insert into storage.objects (bucket_id, name, metadata)
select 'actas-evidencia', ruta, '{"mimetype":"image/jpeg"}' from actaquito_privado.reservas_evidencia;

set local role service_role;
do $$
begin
    begin
        perform public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('b', 64));
        raise exception 'Se aceptó una huella distinta';
    exception when invalid_parameter_value then null;
    end;
    if public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('a', 64)) <> pg_temp.acta(1)
       or public.confirmar_evidencia_acta(pg_temp.operacion(1), repeat('a', 64)) <> pg_temp.acta(1) then
        raise exception 'La confirmación no es idempotente';
    end if;
end;
$$;
reset role;
set local role authenticated;
select pg_temp.sesion(3);
do $$
begin
    if exists (select 1 from public.mesas_actas_reportadas)
       or not exists (select 1 from public.actas_evidencias where acta_id = pg_temp.acta(1)
            and not fuera_margen and abs(distancia_metros) < 0.01 and margen_metros = 200) then
        raise exception 'Una sola evidencia reportó la mesa o su distancia es incorrecta';
    end if;
end;
$$;

select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(4),
    (select id from public.asignaciones_veedor where recinto_codigo = 'R01' and mesa_numero = 1 and fin is null));
reset role;
set local role service_role;
do $$
begin
    begin
        perform public.confirmar_evidencia_acta(pg_temp.operacion(2), repeat('a', 64));
        raise exception 'La asignación revocada pudo finalizar evidencia';
    exception when insufficient_privilege then null;
    end;
end;
$$;
reset role;
set local role authenticated;
select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(3),
    (select id from public.asignaciones_veedor where recinto_codigo = 'R01' and mesa_numero = 1 and fin is null));
reset role;
set local role service_role;
select public.confirmar_evidencia_acta(pg_temp.operacion(2), repeat('a', 64));
reset role;

set local role authenticated;
select pg_temp.sesion(2);
select public.guardar_borrador_acta(pg_temp.acta(1), gen_random_uuid(), 'R01', 1::smallint, 'ALCALDIA',
    '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', 2, 0, 5);

select pg_temp.sesion(1);
do $$
begin
    if (select count(*) from public.mesas_actas_reportadas) <> 1
       or not exists (select 1 from public.actas_evidencias where acta_id = pg_temp.acta(2)
             and fuera_margen and distancia_metros > margen_metros and margen_metros = 200)
       or not exists (select 1 from public.actas_evidencias where acta_id = pg_temp.acta(1)
             and version = 1 and actor_id = pg_temp.persona(3) and operacion_id = pg_temp.operacion(1))
       or (select count(version) from public.actas_revisiones where acta_id = pg_temp.acta(1)) <> 2 then
        raise exception 'Distancia, historial o reporte incorrectos';
    end if;
end;
$$;

select pg_temp.sesion(5);
do $$
begin
    if exists (select 1 from public.actas_evidencias) or exists (select 1 from public.mesas_actas_reportadas) then
        raise exception 'RLS reveló evidencia o avance de otro recinto';
    end if;
end;
$$;

reset role;
do $$
begin
    begin
        update public.actas_evidencias set latitud = 0;
        raise exception 'Fue posible reemplazar la ubicación original';
    exception when insufficient_privilege then null;
    end;
end;
$$;
rollback;
