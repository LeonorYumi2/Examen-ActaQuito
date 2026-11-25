\set ON_ERROR_STOP on
begin;

-- Auth y sus JWT se simulan. Ejecutar solo en una base local desechable.
create function pg_temp.persona(n integer) returns uuid language sql
as $$ select ('00000000-0000-4000-8000-00000000000' || n)::uuid $$;

create function pg_temp.sesion(n integer) returns void language plpgsql as $$
begin
    perform set_config('request.jwt.claim.sub', pg_temp.persona(n)::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.persona(n),
        'role', 'authenticated', 'amr', jsonb_build_array(jsonb_build_object('method', 'password')))::text, true);
end;
$$;

create function pg_temp.capturar(acta uuid, operacion uuid, dignidad text default 'ALCALDIA',
    votos jsonb default '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', total numeric default 5,
    blancos numeric default 1, nulos numeric default 1)
returns integer language sql as $$
    select public.guardar_borrador_acta(acta, operacion, 'R01', 1::smallint, dignidad, votos, blancos, nulos, total)
$$;

do $$
declare
    fila record;
    persona uuid;
    actor uuid;
    correo text;
    reserva jsonb;
begin
    if has_function_privilege('anon', 'public.guardar_borrador_acta(uuid,uuid,text,smallint,text,jsonb,numeric,numeric,numeric)', 'execute')
       or has_table_privilege('authenticated', 'public.actas', 'INSERT')
       or has_table_privilege('authenticated', 'public.actas_revisiones', 'UPDATE')
       or has_column_privilege('authenticated', 'public.actas_revisiones', 'actor_cedula', 'SELECT') then
        raise exception 'Privilegios de actas indebidos';
    end if;

    for fila in select * from (values
        (1, null, null, '1700000019'), (2, 1, null, '1700000027'), (3, 2, 'R01', '1700000035'),
        (4, 2, 'R01', '1700000043'), (5, 1, null, '3000000012')
    ) as f(n, invitador, recinto, cedula) order by n
    loop
        persona := pg_temp.persona(fila.n);
        actor := pg_temp.persona(fila.invitador);
        correo := 'actas-prueba-' || fila.n || '@example.test';
        reserva := public.reservar_invitacion(actor, fila.recinto, correo, fila.cedula, 'Prueba', 'Actas', '0999999999');
        insert into auth.users (id, email, invited_at, email_confirmed_at, encrypted_password, raw_user_meta_data)
            values (persona, correo, now(), now(), 'hash-simulado', jsonb_build_object('actaquito_invitacion', reserva->>'id'));
        perform public.confirmar_invitacion((reserva->>'id')::uuid);
        perform pg_temp.sesion(fila.n);
        perform public.activar_cuenta();
        if fila.n in (2, 5) then
            perform pg_temp.sesion(1);
            perform public.asignar_coordinador(case when fila.n = 2 then 'R01' else 'R02' end, persona);
        end if;
    end loop;
end;
$$;

set local role authenticated;
select pg_temp.sesion(2);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(3));
select pg_temp.sesion(3);

do $$
declare
    acta uuid := '10000000-0000-4000-8000-000000000001';
    primer_intento uuid := gen_random_uuid();
    votos_invalidos jsonb;
begin
    for votos_invalidos in select value from jsonb_array_elements('[
        {"MFC":-1,"ARP":4,"MUC":0,"FDP":0,"MNE":0},
        {"MFC":1.5,"ARP":1.5,"MUC":0,"FDP":0,"MNE":0},
        {"MFC":"2","ARP":1,"MUC":0,"FDP":0,"MNE":0},
        {"MFC":2,"ARP":1,"MUC":0,"FDP":0,"OTRA":0},
        {"MFC":6,"ARP":0,"MUC":0,"FDP":0,"MNE":0},
        {"MFC":1,"ARP":1,"MUC":0,"FDP":0,"MNE":0}
    ]')
    loop
        begin
            perform pg_temp.capturar(acta, gen_random_uuid(), votos => votos_invalidos);
            raise exception 'Se aceptaron cifras o candidatura inválidas';
        exception when invalid_parameter_value then null;
        end;
    end loop;
    begin
        perform pg_temp.capturar(acta, gen_random_uuid(), total => 5.5, blancos => 1.5);
        raise exception 'Se redondeó un valor no entero';
    exception when invalid_parameter_value then null;
    end;
    if exists (select 1 from public.actas) then raise exception 'Un rechazo dejó filas parciales'; end if;

    if pg_temp.capturar(acta, primer_intento) <> 1 or pg_temp.capturar(acta, primer_intento) <> 1 then
        raise exception 'El reintento no fue idempotente';
    end if;
    begin
        perform pg_temp.capturar(acta, primer_intento, nulos => 0, blancos => 2);
        raise exception 'Se reutilizó el UUID con otras cifras';
    exception when unique_violation then null;
    end;
    begin
        perform pg_temp.capturar(gen_random_uuid(), gen_random_uuid());
        raise exception 'Se duplicó mesa y dignidad';
    exception when unique_violation then null;
    end;
    begin
        perform public.guardar_borrador_acta(gen_random_uuid(), gen_random_uuid(), 'R01', 2::smallint,
            'ALCALDIA', '{"MFC":2,"ARP":1,"MUC":0,"FDP":0,"MNE":0}', 1, 1, 5);
        raise exception 'El veedor pudo guardar en una mesa no asignada';
    exception when insufficient_privilege then null;
    end;
    perform pg_temp.capturar(gen_random_uuid(), gen_random_uuid(), 'PREFECTURA',
        '{"MFC":0,"ARP":0,"MUC":0,"FDP":0,"MNE":0}', 0, 0, 0);
    if (select count(*) from public.actas where estado = 'borrador') <> 2
        or (select count(version) from public.actas_revisiones where acta_id = acta) <> 1 then
        raise exception 'Se esperaba un borrador por dignidad y una revisión por operación';
    end if;
end;
$$;

select pg_temp.sesion(5);
do $$
begin
    if exists (select 1 from public.actas) or exists (select version from public.actas_revisiones) then
        raise exception 'RLS reveló borradores de otro recinto';
    end if;
    begin
        perform pg_temp.capturar('10000000-0000-4000-8000-000000000001', gen_random_uuid());
        raise exception 'El coordinador pudo corregir otro recinto';
    exception when insufficient_privilege then null;
    end;
end;
$$;

select pg_temp.sesion(2);
select pg_temp.capturar('10000000-0000-4000-8000-000000000001', gen_random_uuid(), blancos => 2, nulos => 0);
select public.asignar_veedor('R01', 1::smallint, pg_temp.persona(4), (
    select a.id from public.asignaciones_veedor a where a.recinto_codigo = 'R01' and a.mesa_numero = 1 and a.fin is null));

select pg_temp.sesion(3);
do $$
begin
    if exists (select 1 from public.actas) or exists (select version from public.actas_revisiones) then
        raise exception 'El veedor saliente conserva acceso a las actas';
    end if;
    begin
        perform pg_temp.capturar('10000000-0000-4000-8000-000000000001', gen_random_uuid());
        raise exception 'El veedor anterior pudo corregir';
    exception when insufficient_privilege then null;
    end;
end;
$$;

select pg_temp.sesion(4);
do $$
begin
    if exists (select 1 from public.actas) then raise exception 'El reemplazante ve actas ajenas'; end if;
    begin
        perform pg_temp.capturar('10000000-0000-4000-8000-000000000001', gen_random_uuid());
        raise exception 'El reemplazante pudo corregir un acta ajena';
    exception when insufficient_privilege then null;
    end;
end;
$$;

select pg_temp.sesion(1);
do $$
begin
    if (select count(*) from public.actas) <> 2
        or not exists (select 1 from public.actas where id = '10000000-0000-4000-8000-000000000001'
            and autor_id = pg_temp.persona(3))
        or not exists (select 1 from public.actas_revisiones where acta_id = '10000000-0000-4000-8000-000000000001'
            and version = 1 and blancos = 1)
        or not exists (select 1 from public.actas_revisiones where acta_id = '10000000-0000-4000-8000-000000000001'
            and version = 2 and blancos = 2 and actor_id = pg_temp.persona(2)) then
        raise exception 'Se alteró la autoría o el historial';
    end if;
    begin
        perform pg_temp.capturar('10000000-0000-4000-8000-000000000001', gen_random_uuid());
        raise exception 'El provincial pudo corregir';
    exception when insufficient_privilege then null;
    end;
end;
$$;

reset role;
do $$
begin
    begin
        update public.actas_revisiones set blancos = 0;
        raise exception 'El historial fue modificable';
    exception when insufficient_privilege then null;
    end;
    begin
        delete from public.actas_revisiones;
        raise exception 'El historial pudo borrarse';
    exception when insufficient_privilege then null;
    end;
end;
$$;
rollback;
