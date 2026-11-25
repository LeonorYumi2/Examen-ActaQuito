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
        (3, 2, 'R01', '1700000035'), (4, 1, null, '1700000043')
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
    end;
    $$;

set local role authenticated;
select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(3));
select pg_temp.sesion(3);
select public.guardar_borrador_acta(pg_temp.acta(1), pg_temp.operacion(1), 'R01', 1::smallint, 'ALCALDIA',
    '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', 1, 1, 5);

do $$
declare
    votos constant jsonb := '{"MFC":3,"ARP":1,"MUC":0,"FDP":0,"MNE":0}';
    captura constant timestamptz := '2026-11-25 14:00:00+00';
    historial jsonb;
begin
    perform pg_temp.sesion(2);
    for i in 1..2 loop
        if public.corregir_acta(pg_temp.acta(1), pg_temp.operacion(2), votos, 1, 1, 6,
            -0.173, -78.483, 9, captura) <> 2 then
            raise exception 'La operación no es idempotente';
        end if;
    end loop;
    begin
        perform public.corregir_acta(pg_temp.acta(1), pg_temp.operacion(2), votos, 1, 1, 6,
            -0.174, -78.483, 9, captura);
        raise exception 'Se aceptó un cambio de GPS para el mismo UUID';
    exception when unique_violation then null;
    end;
    begin
        perform public.guardar_borrador_acta(pg_temp.acta(1), pg_temp.operacion(3), 'R01', 1::smallint, 'ALCALDIA', votos, 1, 1, 6);
        raise exception 'Se corrigió sin GPS';
    exception when invalid_parameter_value then null;
    end;
    begin
        perform public.corregir_acta(pg_temp.acta(1), pg_temp.operacion(3), votos, 1, 1, 6,
            -0.173, -78.483, 'Infinity'::double precision, captura);
        raise exception 'Se aceptó precisión inválida';
    exception when invalid_parameter_value then null;
    end;
    perform pg_temp.sesion(1);
    historial := public.leer_historial_acta(pg_temp.acta(1));
    if jsonb_array_length(historial) <> 2
        or historial #> '{0,ubicacion}' is distinct from 'null'::jsonb
        or historial #>> '{1,cedula_enmascarada}' is distinct from '******0027'
        or historial #>> '{1,anterior,sufragantes}' is distinct from '5'
        or historial #>> '{1,nuevo,sufragantes}' is distinct from '6'
        or historial #> '{1,ubicacion,latitud}' is distinct from '-0.173'::jsonb
        or historial #> '{1,ubicacion,precision_metros}' is distinct from '9'::jsonb then
        raise exception 'Historial, GPS o cédula enmascarada incorrectos';
    end if;
    if has_column_privilege(current_user, 'public.actas_revisiones', 'actor_cedula', 'SELECT')
       or has_function_privilege('anon', 'public.leer_historial_acta(uuid)', 'EXECUTE') then
        raise exception 'Privilegios de historial incorrectos';
    end if;
    begin
        update public.actas_revisiones set version = 9;
        raise exception 'Se permitió modificar el historial';
    exception when insufficient_privilege then null;
    end;
    perform pg_temp.sesion(3);
    if jsonb_array_length(public.leer_historial_acta(pg_temp.acta(1))) <> 2 then
        raise exception 'El veedor no puede leer su propia acta';
    end if;
    perform pg_temp.sesion(4);
    begin
        perform public.leer_historial_acta(pg_temp.acta(1));
        raise exception 'Lectura entre recintos';
    exception when insufficient_privilege then null;
    end;
    begin
        perform public.corregir_acta(pg_temp.acta(1), pg_temp.operacion(3), votos, 1, 1, 6,
            -0.173, -78.483, 9, captura);
        raise exception 'Corrección entre recintos';
    exception when insufficient_privilege then null;
    end;
end;
$$;

rollback;