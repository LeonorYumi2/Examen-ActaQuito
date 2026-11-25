\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claims', '{"amr":[{"method":"password"}]}', true);

-- Emula el JWT que PostgREST entrega a PostgreSQL tras verificar su firma.
create function pg_temp.simular_activacion(persona uuid, metodo text, sujeto uuid default null)
returns void language plpgsql as $$
declare
    sub_anterior text := current_setting('request.jwt.claim.sub', true);
    claims_anteriores text := current_setting('request.jwt.claims', true);
begin
    perform set_config('request.jwt.claim.sub', persona::text, true);
    perform set_config('request.jwt.claims', jsonb_strip_nulls(jsonb_build_object(
        'sub', coalesce(sujeto, persona), 'role', 'authenticated',
        'amr', case when metodo is not null then jsonb_build_array(jsonb_build_object('method', metodo)) end
    ))::text, true);
    perform public.activar_cuenta();
    perform set_config('request.jwt.claim.sub', coalesce(sub_anterior, ''), true);
    perform set_config('request.jwt.claims', coalesce(claims_anteriores, ''), true);
end;
$$;

-- Simula Supabase Auth y verifica los permisos SQL. No envía correo.
do $$
declare
    persona record;
    reserva jsonb;
    repetida jsonb;
begin
    if has_function_privilege('authenticated',
        'public.reservar_invitacion(uuid,text,text,text,text,text,text)', 'EXECUTE')
        or has_function_privilege('authenticated', 'public.gestionar_invitacion(text,text)', 'EXECUTE')
        or has_function_privilege('authenticated', 'public.confirmar_invitacion(uuid,boolean)', 'EXECUTE')
        or has_function_privilege('anon', 'public.activar_cuenta()', 'EXECUTE')
        or not has_function_privilege('authenticated', 'public.activar_cuenta()', 'EXECUTE')
        or has_table_privilege('authenticated', 'actaquito_privado.invitaciones', 'UPDATE')
        or has_function_privilege('anon', 'public.asignar_coordinador(text,uuid)', 'EXECUTE')
        or has_table_privilege('authenticated', 'public.asignaciones_veedor', 'UPDATE')
        or has_column_privilege('authenticated', 'public.usuarios', 'cedula', 'SELECT') then
        raise exception 'Se concedieron permisos directos indebidos';
    end if;

    if actaquito_privado.cedula_valida('0100000000') or actaquito_privado.cedula_valida('9900000000')
       or not actaquito_privado.cedula_valida('3000000012') then
        raise exception 'Validación de cédula incorrecta';
    end if;

    for persona in select * from (values
        (1, '00000000-0000-4000-8000-000000000001'::uuid, 'fase2b-1@example.test', '1700000019', null, null),
        (2, '00000000-0000-4000-8000-000000000002'::uuid, 'fase2b-2@example.test', '1700000027', null, '00000000-0000-4000-8000-000000000001'::uuid),
        (3, '00000000-0000-4000-8000-000000000003'::uuid, 'fase2b-3@example.test', '1700000035', 'R01', '00000000-0000-4000-8000-000000000002'::uuid),
        (4, '00000000-0000-4000-8000-000000000004'::uuid, 'fase2b-4@example.test', '1700000043', 'R01', '00000000-0000-4000-8000-000000000002'::uuid),
        (5, '00000000-0000-4000-8000-000000000005'::uuid, 'fase2b-5@example.test', '3000000012', null, '00000000-0000-4000-8000-000000000001'::uuid),
        (6, '00000000-0000-4000-8000-000000000006'::uuid, 'fase2b-6@example.test', '1700000050', null, '00000000-0000-4000-8000-000000000001'::uuid)
    ) as casos(orden, id, correo, cedula, recinto, actor) order by orden
    loop
        reserva := public.reservar_invitacion(persona.actor, persona.recinto, upper(persona.correo), persona.cedula,
            'Prueba', 'Fase Dos', '0999999999');
        if public.confirmar_invitacion((reserva->>'id')::uuid) is not null then
            raise exception 'Se creó un perfil sin identidad de Auth';
        end if;
        insert into auth.users (id, email, invited_at, email_confirmed_at, encrypted_password, raw_user_meta_data)
        values (persona.id, persona.correo, now(), case when persona.orden <> 6 then now() end,
            case persona.orden when 4 then 'hash-temporal-gotrue' when 6 then '' else 'hash-del-titular' end,
            jsonb_build_object('actaquito_invitacion', reserva->>'id'));
        if persona.orden = 6 then
            -- El reenvío está disponible con Auth creado y el perfil aún pendiente.
            repetida := public.gestionar_invitacion(persona.correo, 'reenviar');
            if repetida->>'id' is distinct from reserva->>'id'
               or (repetida->>'correoConfirmado')::boolean then
                raise exception 'La identidad existente no se reconoce como invitación pendiente';
            end if;
            begin
                perform public.gestionar_invitacion(persona.correo, 'cancelar');
                raise exception 'Se canceló una reserva que ya tiene identidad en Auth';
            exception when unique_violation then null;
            end;
            update auth.users set raw_user_meta_data = '{}'::jsonb where id = persona.id;
        end if;
        if public.confirmar_invitacion((reserva->>'id')::uuid) is distinct from persona.id then
            raise exception 'El perfil no quedó enlazado';
        end if;
        repetida := public.reservar_invitacion(persona.actor, persona.recinto, persona.correo, persona.cedula,
            'Prueba', 'Fase Dos', '0999999999');
        if repetida->>'usuarioId' is distinct from persona.id::text then
            raise exception 'El reintento no devolvió la identidad original';
        end if;
        if persona.orden = 4 then
            begin
                perform pg_temp.simular_activacion(persona.id, 'otp');
                raise exception 'Un JWT de invitación activó al veedor';
            exception when insufficient_privilege then null;
            end;
            if actaquito_privado.rol_activo(persona.id) is not null then
                raise exception 'El hash temporal hizo operativo al veedor';
            end if;
        elsif persona.orden = 6 then
            begin
                perform pg_temp.simular_activacion(persona.id, 'password');
                raise exception 'Un correo pendiente pudo activar la cuenta';
            exception when insufficient_privilege then null;
            end;
            if actaquito_privado.rol_activo(persona.id) is not null then
                raise exception 'La invitación pendiente hizo operativo al coordinador';
            end if;
        else
            perform pg_temp.simular_activacion(persona.id, 'password');
        end if;
        if persona.orden = 2 or persona.orden = 5 then
            perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
            perform public.asignar_coordinador(case persona.orden when 2 then 'R01' else 'R02' end, persona.id);
        end if;
    end loop;
    begin
        perform public.reservar_invitacion(null, null, 'otro-provincial@example.test', '0100000009',
            'Prueba', 'Fase Dos', '0999999999');
        raise exception 'Se permitió un segundo coordinador provincial';
    exception when unique_violation then null;
    end;
    begin
        perform public.reservar_invitacion('00000000-0000-4000-8000-000000000001', null, 'cedula-duplicada@example.test', '1700000027',
            'Prueba', 'Fase Dos', '0999999999');
        raise exception 'Se aceptó la cédula duplicada';
    exception when unique_violation then null;
    end;
    begin
        perform public.reservar_invitacion('00000000-0000-4000-8000-000000000001', null, 'FASE2B-2@example.test', '1700000050',
            'Otro', 'Otro', '0999999999');
        raise exception 'Se aceptó un correo duplicado con otra capitalización';
    exception when unique_violation then null;
    end;
    begin
        perform public.reservar_invitacion('00000000-0000-4000-8000-000000000002', 'R02', 'fuera@example.test', '1700000027',
            'Prueba', 'Fase Dos', '0999999999');
        raise exception 'Se permitió invitar fuera del ámbito';
    exception when insufficient_privilege then null;
    end;
    begin
        perform public.reservar_invitacion('00000000-0000-4000-8000-000000000003', 'R01', 'fuera@example.test', '1700000027',
            'Prueba', 'Fase Dos', '0999999999');
        raise exception 'Se permitió invitar a un veedor';
    exception when insufficient_privilege then null;
    end;
end;
$$;

-- Simular un fallo de envío sin alta en Auth y una respuesta de Auth tardía.
do $$
declare
    reservada jsonb;
    corregida jsonb;
    actor constant uuid := '00000000-0000-4000-8000-000000000001';
begin
    reservada := public.reservar_invitacion(actor, null, 'reserva-fallida@example.test', '1700000068',
        'Prueba', 'Fase Dos', '0999999999');
    if public.gestionar_invitacion('reserva-fallida@example.test', 'reenviar')->>'id'
        is distinct from reservada->>'id' then
        raise exception 'El reenvío tras un fallo cambió de reserva';
    end if;

    perform public.gestionar_invitacion('reserva-fallida@example.test', 'cancelar');
    corregida := public.reservar_invitacion(actor, null, 'reserva-fallida@example.test', '1700000068',
        'Prueba', 'Datos corregidos', '0999999999');
    if corregida->>'id' is not distinct from reservada->>'id' then
        raise exception 'La nueva invitación reutilizó el identificador cancelado';
    end if;

    begin
        insert into auth.users (id, email, invited_at, raw_user_meta_data)
        values ('00000000-0000-4000-8000-000000000007', 'reserva-fallida@example.test', now(),
            jsonb_build_object('actaquito_invitacion', reservada->>'id'));
        raise exception 'Una solicitud tardía creó una identidad con la reserva cancelada';
    exception when insufficient_privilege then null;
    end;
    begin
        insert into auth.users (id, email, raw_user_meta_data)
        values ('00000000-0000-4000-8000-000000000007', 'reserva-fallida@example.test', '{}'::jsonb);
        raise exception 'Un alta ajena pudo reclamar un correo reservado';
    exception when insufficient_privilege then null;
    end;
    perform public.gestionar_invitacion('reserva-fallida@example.test', 'cancelar');

    if not (public.gestionar_invitacion('fase2b-1@example.test', 'reenviar')->>'correoConfirmado')::boolean then
        raise exception 'Se permitiría reenviar una invitación ya confirmada';
    end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
begin
    if (select count(*) from public.recintos where codigo in ('R01','R02')) <> 2 then
        raise exception 'El provincial no puede leer ambos recintos';
    end if;
end;
$$;

do $$
declare
    creado text;
begin
    insert into public.recintos (codigo, parroquia_codigo, nombre, latitud, longitud)
    select 'FASE2B-PRUEBA', parroquia_codigo, 'Prueba RLS alta de recinto', 0, 0
    from public.recintos where codigo = 'R01'
    returning codigo into creado;

    if creado is distinct from 'FASE2B-PRUEBA' then
        raise exception 'El alta provincial no devolvió el recinto creado';
    end if;

    begin
        perform public.asignar_coordinador('R01', '00000000-0000-4000-8000-000000000006');
        raise exception 'Se reemplazó al coordinador con una cuenta sin activar';
    exception when invalid_parameter_value then null;
    end;
    if (select count(*) from public.asignaciones_coordinador
        where recinto_codigo = 'R01' and coordinador_id = '00000000-0000-4000-8000-000000000002'
            and fin is null) <> 1 then
        raise exception 'La asignación del coordinador saliente se alteró antes de la activación';
    end if;
end;
$$;

select set_config('request.jwt.claims', '{"amr":[{"method":"recovery"}]}', true);
do $$
begin
    if exists (select 1 from public.recintos) or exists (select id from public.usuarios) then
        raise exception 'La sesión de recuperación obtuvo lectura operativa';
    end if;
    begin
        perform public.asignar_coordinador('R01', '00000000-0000-4000-8000-000000000005');
        raise exception 'La sesión de recuperación pudo asignar un coordinador';
    exception when insufficient_privilege then null;
    end;
end;
$$;
select set_config('request.jwt.claims', '{"amr":[{"method":"password"}]}', true);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.asignar_veedor('R01', 1::smallint, '00000000-0000-4000-8000-000000000003');
select public.asignar_veedor('R01', 2::smallint, '00000000-0000-4000-8000-000000000003');
do $$
begin
    begin
        perform public.asignar_veedor('R02', 1::smallint, '00000000-0000-4000-8000-000000000003');
        raise exception 'El coordinador pudo asignar una mesa fuera de su recinto';
    exception when insufficient_privilege then null;
    end;
end;
$$;
do $$
begin
    if (select array_agg(codigo order by codigo) from public.recintos) is distinct from array['R01'] then
        raise exception 'El coordinador ve recintos ajenos';
    end if;
    begin
        perform public.asignar_veedor('R01', 1::smallint, '00000000-0000-4000-8000-000000000004', (
            select id from public.asignaciones_veedor where recinto_codigo = 'R01' and mesa_numero = 1 and fin is null));
        raise exception 'Se reemplazó a un veedor con hash temporal y sin login con contraseña';
    exception when invalid_parameter_value then null;
    end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
do $$
begin
    if (select array_agg(numero::integer order by numero) from public.mesas_jrv) is distinct from array[1,2]
       or (select count(*) from public.configuracion_captura where canton_codigo = 'QUITO') <> 1
       or (select count(*) from public.provincias where codigo = 'PICHINCHA') <> 1 then
        raise exception 'Ámbito de lectura del veedor incorrecto';
    end if;
end;
$$;

reset role;
-- Establecer la contraseña tampoco equivale a demostrar su uso.
update auth.users set encrypted_password = 'hash-del-titular' where id = '00000000-0000-4000-8000-000000000004';
do $$
begin
    begin
        perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000004', 'recovery');
        raise exception 'Un JWT de recuperación pudo activar la cuenta';
    exception when insufficient_privilege then null;
    end;
    begin
        perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000004', null);
        raise exception 'Un JWT sin AMR pudo activar la cuenta';
    exception when insufficient_privilege then null;
    end;
    begin
        perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000004', 'password',
            '00000000-0000-4000-8000-000000000003');
        raise exception 'Un JWT de otra identidad pudo activar la cuenta';
    exception when insufficient_privilege then null;
    end;
    if actaquito_privado.rol_activo('00000000-0000-4000-8000-000000000004') is not null then
        raise exception 'Una sesión de recuperación activó al veedor';
    end if;
end;
$$;
do $$
declare
    primer_ingreso timestamptz;
begin
    perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000004', 'password');
    select i.primer_ingreso_password_en into primer_ingreso from actaquito_privado.invitaciones i
        where i.auth_id = '00000000-0000-4000-8000-000000000004';
    perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000004', 'password');
    if primer_ingreso is null or primer_ingreso is distinct from (
        select i.primer_ingreso_password_en from actaquito_privado.invitaciones i
        where i.auth_id = '00000000-0000-4000-8000-000000000004'
    ) then
        raise exception 'La activación no conservó la marca inicial';
    end if;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.asignar_veedor('R01', 1::smallint, '00000000-0000-4000-8000-000000000004', (
    select id from public.asignaciones_veedor where recinto_codigo = 'R01' and mesa_numero = 1 and fin is null));
do $$
begin
    if (select count(*) from public.reemplazos_veedor where recinto_codigo = 'R01' and mesa_numero = 1) <> 1 then
        raise exception 'El reemplazo no quedó auditado';
    end if;
    begin
        perform public.asignar_veedor('R01', 1::smallint, '00000000-0000-4000-8000-000000000003');
        raise exception 'Una petición obsoleta pudo sustituir una asignación vigente';
    exception when serialization_failure then null;
    end;
end;
$$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
do $$
begin
    if (select array_agg(numero::integer order by numero) from public.mesas_jrv) is distinct from array[2] then
        raise exception 'El veedor saliente conserva una mesa o perdió otra por error';
    end if;
end;
$$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
do $$
begin
    if (select array_agg(numero::integer order by numero) from public.mesas_jrv) is distinct from array[1] then
        raise exception 'El veedor entrante no recibió exclusivamente la mesa asignada';
    end if;
end;
$$;

reset role;
do $$
declare
    reserva jsonb;
begin
    reserva := public.reservar_invitacion('00000000-0000-4000-8000-000000000002', 'R01',
        'perfil-pendiente@example.test', '1700000068', 'Prueba', 'Pendiente', '0999999999');
    insert into auth.users (id, email, invited_at, email_confirmed_at, raw_user_meta_data)
    values ('00000000-0000-4000-8000-000000000008', 'perfil-pendiente@example.test', now(), now(),
        jsonb_build_object('actaquito_invitacion', reserva->>'id'));
end;
$$;
update auth.users set email_confirmed_at = now(), encrypted_password = 'hash-temporal-gotrue'
where id = '00000000-0000-4000-8000-000000000006';
do $$
begin
    begin
        perform pg_temp.simular_activacion('00000000-0000-4000-8000-000000000006', 'otp');
        raise exception 'La invitación aceptada activó al coordinador entrante';
    exception when insufficient_privilege then null;
    end;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
begin
    begin
        perform public.asignar_coordinador('R01', '00000000-0000-4000-8000-000000000006');
        raise exception 'Se reemplazó al coordinador con una invitación aceptada y hash temporal';
    exception when invalid_parameter_value then null;
    end;
    if (select count(*) from public.asignaciones_coordinador
        where recinto_codigo = 'R01' and coordinador_id = '00000000-0000-4000-8000-000000000002'
            and fin is null) <> 1 then
        raise exception 'La invitación aceptada alteró el relevo o el historial';
    end if;
end;
$$;
reset role;
update auth.users set encrypted_password = 'hash-del-titular' where id = '00000000-0000-4000-8000-000000000006';
select pg_temp.simular_activacion('00000000-0000-4000-8000-000000000006', 'password');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.asignar_coordinador('R01', '00000000-0000-4000-8000-000000000006');
do $$
begin
    if (select count(*) from public.asignaciones_coordinador where recinto_codigo = 'R01') <> 2
        or not exists (
            select 1 from public.asignaciones_coordinador anterior
            join public.asignaciones_coordinador vigente
                on vigente.recinto_codigo = anterior.recinto_codigo and vigente.inicio = anterior.fin
            where anterior.recinto_codigo = 'R01' and vigente.fin is null
                and anterior.coordinador_id = '00000000-0000-4000-8000-000000000002'
                and vigente.coordinador_id = '00000000-0000-4000-8000-000000000006'
        ) then
        raise exception 'El reemplazo de coordinador perdió el historial o cambió el momento de relevo';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
    if exists (select 1 from public.recintos where codigo = 'R01') then
        raise exception 'El coordinador saliente conserva acceso al recinto';
    end if;
end;
$$;
reset role;
do $$
declare
    reserva_id uuid := (public.gestionar_invitacion('perfil-pendiente@example.test', 'reenviar')->>'id')::uuid;
    conciliada uuid;
begin
    begin
        perform public.confirmar_invitacion(reserva_id);
        raise exception 'El invitador que perdió el recinto pudo confirmar la invitación';
    exception when insufficient_privilege then null;
    end;

    conciliada := public.confirmar_invitacion(reserva_id, true);
    if conciliada is distinct from '00000000-0000-4000-8000-000000000008'::uuid
       or not exists (
           select 1 from public.usuarios where id = '00000000-0000-4000-8000-000000000008'
               and creado_por = '00000000-0000-4000-8000-000000000002'
               and rol = 'veedor' and recinto_base = 'R01'
       ) then
        raise exception 'La conciliación administrativa perdió la identidad, el autor o el ámbito original';
    end if;
end;
$$;
rollback;
