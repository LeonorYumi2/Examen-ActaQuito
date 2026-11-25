begin;

-- Serializa los cambios de autorización asociados a un mismo recinto.
create function actaquito_privado.bloquear_recinto(recinto text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
    perform 1 from public.recintos r where r.codigo = recinto for update;
    if not found or not actaquito_privado.en_provincia(recinto) then
        raise sqlstate '42501' using message = 'Recinto fuera del ámbito autorizado';
    end if;
end;
$$;

create function actaquito_privado.rol_invitado(actor uuid, recinto text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
    if recinto is not null then
        if actaquito_privado.coordina(actor, recinto) then
            perform actaquito_privado.bloquear_recinto(recinto);
            if actaquito_privado.coordina(actor, recinto) then return 'veedor'; end if;
        end if;
    elsif actor is null then
        return 'provincial';
    elsif actaquito_privado.rol_activo(actor) = 'provincial' then
        return 'recinto';
    end if;
    raise sqlstate '42501' using message = 'El actor no puede invitar en este ámbito';
end;
$$;

-- Las reservas, su cancelación y el alta en Auth comparten este bloqueo.
-- Así una llamada de Auth que llega tarde no puede usar una reserva cancelada.
create function actaquito_privado.bloquear_correo(correo text)
returns void language sql set search_path = ''
as $$
    select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(correo, 21002))
$$;

create function actaquito_privado.vincular_alta_auth()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    correo_normalizado text := lower(btrim(new.email));
    identificador text := new.raw_user_meta_data ->> 'actaquito_invitacion';
    reserva actaquito_privado.invitaciones%rowtype;
begin
    if correo_normalizado is null and identificador is null then return new; end if;
    perform actaquito_privado.bloquear_correo(correo_normalizado);

    select i.* into reserva from actaquito_privado.invitaciones i
    where i.correo = correo_normalizado for update;
    if not found and identificador is null then return new; end if;
    if reserva.id is null or identificador is distinct from reserva.id::text or reserva.auth_id is not null then
        raise sqlstate '42501' using message = 'El alta de Auth no coincide con una reserva disponible';
    end if;

    update actaquito_privado.invitaciones set auth_id = new.id where id = reserva.id;
    return new;
end;
$$;

create trigger actaquito_vincular_alta_auth
after insert on auth.users
for each row execute function actaquito_privado.vincular_alta_auth();

-- Solo el titular puede registrar la activación con una sesión de contraseña.
create function public.activar_cuenta()
returns void language plpgsql security definer set search_path = ''
as $$
declare
    persona uuid := auth.uid();
    claims jsonb := auth.jwt();
begin
    if persona is null
        or claims ->> 'sub' is distinct from persona::text
        or claims ->> 'role' is distinct from 'authenticated'
        or not coalesce((claims -> 'amr') @> '[{"method":"password"}]'::jsonb, false) then
        raise sqlstate '42501' using message = 'Se requiere iniciar sesión con contraseña';
    end if;

    update actaquito_privado.invitaciones i
    set primer_ingreso_password_en = clock_timestamp()
    from auth.users a join public.usuarios u on u.id = a.id
    where a.id = persona and i.auth_id = a.id and i.usuario_id = u.id
        and i.correo = lower(a.email) and u.correo = i.correo and u.habilitado
        and a.email_confirmed_at is not null and nullif(a.encrypted_password, '') is not null
        and (a.banned_until is null or a.banned_until <= now())
        and i.primer_ingreso_password_en is null;

    if not found and actaquito_privado.rol_activo(persona) is null then
        raise sqlstate '42501' using message = 'La cuenta no tiene un perfil vinculado y habilitado';
    end if;
end;
$$;

create function public.reservar_invitacion(
    actor uuid, recinto text, correo_nuevo text, cedula_nueva text,
    nombres_nuevos text, apellidos_nuevos text, telefono_nuevo text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
    rol_nuevo text := actaquito_privado.rol_invitado(actor, recinto);
    correo_normalizado text := lower(btrim(correo_nuevo));
    reserva actaquito_privado.invitaciones%rowtype;
begin
    perform actaquito_privado.bloquear_correo(correo_normalizado);

    select i.* into reserva from actaquito_privado.invitaciones i where i.correo = correo_normalizado;
    if found then
        if row(reserva.actor_id, reserva.recinto_base, reserva.rol, reserva.cedula, reserva.nombres,
               reserva.apellidos, reserva.telefono) is distinct from
           row(actor, recinto, rol_nuevo, cedula_nueva, btrim(nombres_nuevos), btrim(apellidos_nuevos), btrim(telefono_nuevo)) then
            raise sqlstate '23505' using message = 'Correo o cédula ya registrados';
        end if;
    else
        if exists (select 1 from auth.users a where lower(a.email) = correo_normalizado)
           or exists (select 1 from public.usuarios u where u.correo = correo_normalizado or u.cedula = cedula_nueva) then
            raise sqlstate '23505' using message = 'Correo o cédula ya registrados';
        end if;
        insert into actaquito_privado.invitaciones (correo, cedula, nombres, apellidos, telefono, recinto_base, rol, actor_id)
        values (correo_normalizado, cedula_nueva, btrim(nombres_nuevos), btrim(apellidos_nuevos), btrim(telefono_nuevo),
                recinto, rol_nuevo, actor)
        returning * into reserva;
    end if;

    return jsonb_build_object('id', reserva.id, 'correo', reserva.correo, 'usuarioId', reserva.usuario_id);
end;
$$;

create function public.confirmar_invitacion(reserva_id uuid, recuperacion_administrativa boolean default false)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
    reserva actaquito_privado.invitaciones%rowtype;
    identidad uuid;
begin
    select * into strict reserva from actaquito_privado.invitaciones where id = reserva_id;
    if not coalesce(recuperacion_administrativa, false)
        and actaquito_privado.rol_invitado(reserva.actor_id, reserva.recinto_base) is distinct from reserva.rol then
        raise sqlstate '42501' using message = 'Ámbito de invitación inválido';
    end if;
    select * into strict reserva from actaquito_privado.invitaciones where id = reserva_id for update;
    if reserva.usuario_id is not null then return reserva.usuario_id; end if;

    -- El vínculo privado fue fijado al crear la identidad. Los metadatos
    -- editables de Auth ya no intervienen al confirmar la invitación.
    select a.id into identidad from auth.users a
    where a.id = reserva.auth_id and lower(a.email) = reserva.correo and a.invited_at is not null;
    if identidad is null then return null; end if;

    insert into public.usuarios (id, rol, cedula, correo, nombres, apellidos, telefono, recinto_base, creado_por)
    values (identidad, reserva.rol, reserva.cedula, reserva.correo, reserva.nombres, reserva.apellidos,
            reserva.telefono, reserva.recinto_base, reserva.actor_id);
    update actaquito_privado.invitaciones set usuario_id = identidad where id = reserva_id;
    return identidad;
end;
$$;

create function public.gestionar_invitacion(correo_objetivo text, operacion text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
    correo_normalizado text := lower(btrim(correo_objetivo));
    reserva actaquito_privado.invitaciones%rowtype;
    correo_confirmado boolean := false;
begin
    if operacion is null or operacion not in ('cancelar', 'reenviar') then
        raise sqlstate '22023' using message = 'Operación de invitación inválida';
    end if;
    perform actaquito_privado.bloquear_correo(correo_normalizado);
    select i.* into strict reserva from actaquito_privado.invitaciones i
    where i.correo = correo_normalizado for update;

    if operacion = 'cancelar' then
        if reserva.auth_id is not null or exists (
            select 1 from auth.users a where lower(a.email) = correo_normalizado
        ) then
            raise sqlstate '23505' using message = 'Existe una identidad de Auth. La reserva se conserva';
        end if;
        delete from actaquito_privado.invitaciones where id = reserva.id;
        return jsonb_build_object('cancelada', true);
    end if;

    if reserva.auth_id is not null then
        select a.email_confirmed_at is not null into correo_confirmado from auth.users a
        where a.id = reserva.auth_id and lower(a.email) = correo_normalizado and a.invited_at is not null;
        if not found then
            raise sqlstate '23505' using message = 'La identidad de Auth requiere conciliación administrativa';
        end if;
    elsif exists (select 1 from auth.users a where lower(a.email) = correo_normalizado) then
        raise sqlstate '23505' using message = 'Ya existe una identidad de Auth ajena a la reserva';
    end if;

    return jsonb_build_object('id', reserva.id, 'correo', reserva.correo,
        'usuarioId', reserva.usuario_id, 'correoConfirmado', correo_confirmado);
end;
$$;

create function public.asignar_coordinador(recinto text, coordinador uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    anterior public.asignaciones_coordinador%rowtype;
    vigente uuid;
    instante timestamptz;
begin
    if actaquito_privado.mi_rol() is distinct from 'provincial' then
        raise sqlstate '42501' using message = 'Solo el coordinador provincial puede asignar coordinadores';
    end if;
    perform actaquito_privado.bloquear_recinto(recinto);
    if actaquito_privado.mi_rol() is distinct from 'provincial' then
        raise sqlstate '42501' using message = 'Solo el coordinador provincial puede asignar coordinadores';
    end if;
    if actaquito_privado.rol_activo(coordinador) is distinct from 'recinto' then
        raise sqlstate '22023' using message = 'El coordinador entrante debe confirmar el correo e iniciar sesión con su contraseña';
    end if;
    select a.* into anterior from public.asignaciones_coordinador a
        where a.recinto_codigo = recinto and a.fin is null;
    if anterior.coordinador_id = coordinador then return anterior.id; end if;

    instante := clock_timestamp();
    update public.asignaciones_coordinador set fin = instante where id = anterior.id;
    insert into public.asignaciones_coordinador (recinto_codigo, coordinador_id, asignado_por, inicio)
    values (recinto, coordinador, actor, instante) returning id into vigente;
    return vigente;
end;
$$;

create function public.asignar_veedor(
    recinto text, mesa smallint, veedor uuid, asignacion_saliente uuid default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    anterior public.asignaciones_veedor%rowtype;
    vigente uuid;
    instante timestamptz;
begin
    if not actaquito_privado.mi_recinto_coordinado(recinto) then
        raise sqlstate '42501' using message = 'El actor no coordina este recinto';
    end if;
    perform actaquito_privado.bloquear_recinto(recinto);
    if not actaquito_privado.mi_recinto_coordinado(recinto) then
        raise sqlstate '42501' using message = 'El actor ya no coordina este recinto';
    end if;
    if not exists (select 1 from public.mesas_jrv m where m.recinto_codigo = recinto and m.numero = mesa) then
        raise sqlstate '22023' using message = 'Mesa inexistente en el recinto';
    end if;
    if not exists (select 1 from public.usuarios u where u.id = veedor and u.recinto_base = recinto
                   and actaquito_privado.rol_activo(u.id) = 'veedor') then
        raise sqlstate '22023' using message = 'Se requiere un veedor habilitado de este recinto que ya inició sesión con su contraseña';
    end if;

    select a.* into anterior from public.asignaciones_veedor a
        where a.recinto_codigo = recinto and a.mesa_numero = mesa and a.fin is null;
    if anterior.id is distinct from asignacion_saliente then
        raise sqlstate '40001' using message = 'La asignación cambió. Consulte la mesa y vuelva a intentar';
    end if;
    if anterior.veedor_id = veedor then return anterior.id; end if;

    instante := clock_timestamp();
    update public.asignaciones_veedor set fin = instante where id = anterior.id;
    insert into public.asignaciones_veedor (recinto_codigo, mesa_numero, veedor_id, asignado_por, inicio)
    values (recinto, mesa, veedor, actor, instante) returning id into vigente;

    if anterior.id is not null then
        insert into public.reemplazos_veedor (recinto_codigo, mesa_numero, saliente_id, entrante_id, realizado_por, realizado_en)
        values (recinto, mesa, anterior.id, vigente, actor, instante);
    end if;
    return vigente;
end;
$$;

revoke execute on function actaquito_privado.bloquear_recinto(text),
    actaquito_privado.rol_invitado(uuid, text), actaquito_privado.bloquear_correo(text),
    actaquito_privado.vincular_alta_auth()
    from public, anon, authenticated;
revoke execute on function public.activar_cuenta(), public.reservar_invitacion(uuid, text, text, text, text, text, text),
    public.confirmar_invitacion(uuid, boolean), public.gestionar_invitacion(text, text), public.asignar_coordinador(text, uuid),
    public.asignar_veedor(text, smallint, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reservar_invitacion(uuid, text, text, text, text, text, text),
    public.confirmar_invitacion(uuid, boolean), public.gestionar_invitacion(text, text) to service_role;
grant execute on function public.activar_cuenta(), public.asignar_coordinador(text, uuid), public.asignar_veedor(text, smallint, uuid, uuid)
    to authenticated;

commit;
