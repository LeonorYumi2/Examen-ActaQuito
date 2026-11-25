\set ON_ERROR_STOP on
begin;

-- Solo para una instancia local desechable con Auth simulado y 2B aplicado.
create function pg_temp.persona(n integer) returns uuid language sql
as $$ select ('00000000-0000-4000-8000-00000000000' || n)::uuid $$;

create function pg_temp.sesion(n integer) returns void language plpgsql as $$
begin
    perform set_config('request.jwt.claim.sub', pg_temp.persona(n)::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.persona(n),
        'role', 'authenticated', 'amr', '[{"method":"password"}]'::jsonb)::text, true);
end;
$$;

do $$
declare
    fila record;
    reserva jsonb;
    correo text;
begin
    for fila in select * from (values
        (1, null, null, '1700000019'), (2, 1, null, '1700000027'),
        (3, 2, 'R01', '1700000035'), (4, 1, null, '1700000043')
    ) as f(n, invitador, recinto, cedula) order by n loop
        correo := 'dashboard-prueba-' || fila.n || '@example.test';
        reserva := public.reservar_invitacion(pg_temp.persona(fila.invitador), fila.recinto,
            correo, fila.cedula, 'Prueba', 'Dashboard', '0999999999');
        insert into auth.users (id, email, invited_at, email_confirmed_at, encrypted_password, raw_user_meta_data)
        values (pg_temp.persona(fila.n), correo, now(), now(), 'hash-simulado',
            jsonb_build_object('actaquito_invitacion', reserva->>'id'));
        perform public.confirmar_invitacion((reserva->>'id')::uuid);
        perform pg_temp.sesion(fila.n);
        perform public.activar_cuenta();
        if fila.n = 2 then
            perform pg_temp.sesion(1);
            perform public.asignar_coordinador('R01', pg_temp.persona(2));
        end if;
    end loop;
end;
$$;

set local role authenticated;
select pg_temp.sesion(1);
do $$
begin
    begin
        perform id, nombres, apellidos, habilitado, correo, telefono, cedula, creado_en
        from public.usuarios where rol = 'recinto';
        raise exception 'La proyección anterior debía fallar';
    exception when insufficient_privilege then
        raise notice 'Proyección anterior rechazada con SQLSTATE %', sqlstate;
    end;
    if (select count(id) from public.usuarios where rol = 'recinto') <> 2
       or (select count(*) from (select id, nombres, apellidos, habilitado
           from public.usuarios where rol = 'recinto') as lista) <> 2 then
        raise exception 'El contador y el listado autorizado no coinciden';
    end if;
    if (select count(coordinador_id) from public.asignaciones_coordinador where fin is null) <> 1 then
        raise exception 'Se esperaba una asignación vigente y un coordinador sin asignar';
    end if;
    if has_column_privilege('authenticated', 'public.usuarios', 'correo', 'SELECT')
       or has_column_privilege('authenticated', 'public.usuarios', 'telefono', 'SELECT')
       or has_column_privilege('authenticated', 'public.usuarios', 'cedula', 'SELECT')
       or has_column_privilege('authenticated', 'public.usuarios', 'creado_en', 'SELECT') then
        raise exception 'Se ampliaron privilegios de perfil';
    end if;
end;
$$;

select pg_temp.sesion(2);
do $$
begin
    if (select count(id) from public.usuarios where rol = 'recinto') <> 1
       or not exists (select id from public.usuarios where id = pg_temp.persona(2))
       or (select count(coordinador_id) from public.asignaciones_coordinador where fin is null) <> 1 then
        raise exception 'Visibilidad indebida del coordinador de recinto';
    end if;
end;
$$;

select pg_temp.sesion(3);
do $$
begin
    if exists (select id from public.usuarios where rol = 'recinto')
       or exists (select coordinador_id from public.asignaciones_coordinador where fin is null) then
        raise exception 'El veedor obtuvo acceso a coordinaciones';
    end if;
end;
$$;

rollback;
