begin;

alter table public.actas
    add column correccion_latitud double precision,
    add column correccion_longitud double precision,
    add column correccion_precision double precision,
    add column correccion_capturada_en timestamptz;

alter table public.actas_revisiones
    add column correccion_latitud double precision,
    add column correccion_longitud double precision,
    add column correccion_precision double precision,
    add column correccion_capturada_en timestamptz;

create function actaquito_privado.gps_correccion_valido(
    latitud double precision, longitud double precision, precision_metros double precision, capturada_en timestamptz
) returns boolean language sql immutable set search_path = ''
as $$
    select coalesce(latitud between -90 and 90 and longitud between -180 and 180
        and precision_metros > 0 and precision_metros < 'Infinity'::double precision
        and isfinite(capturada_en), false)
$$;

alter table public.actas_revisiones add constraint revision_gps_coherente check (
    (correccion_latitud is null and correccion_longitud is null
        and correccion_precision is null and correccion_capturada_en is null)
    or (version > 1 and actaquito_privado.gps_correccion_valido(
        correccion_latitud, correccion_longitud, correccion_precision, correccion_capturada_en))
);

create or replace function actaquito_privado.registrar_revision_acta()
returns trigger language plpgsql set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if new.version <> 1 or new.autor_id is distinct from auth.uid() then
            raise sqlstate '42501' using message = 'La primera revisión debe corresponder al autor del acta';
        end if;
    elsif new.version <> old.version + 1
        or (new.id, new.recinto_codigo, new.mesa_numero, new.dignidad_codigo, new.autor_id, new.creada_en)
            is distinct from
           (old.id, old.recinto_codigo, old.mesa_numero, old.dignidad_codigo, old.autor_id, old.creada_en) then
        raise sqlstate '22023' using message = 'La revisión debe avanzar una versión y conservar la identidad del acta';
    end if;

    if tg_op = 'UPDATE' and not actaquito_privado.gps_correccion_valido(
        new.correccion_latitud, new.correccion_longitud, new.correccion_precision, new.correccion_capturada_en
    ) then
        raise sqlstate '22023' using message = 'La corrección requiere una ubicación GPS válida';
    end if;

    insert into public.actas_revisiones (
        acta_id, version, operacion_id, actor_id, actor_cedula, votos, blancos, nulos, sufragantes,
        correccion_latitud, correccion_longitud, correccion_precision, correccion_capturada_en
    )
    select new.id, new.version, new.operacion_id, u.id, u.cedula, new.votos, new.blancos, new.nulos, new.sufragantes,
        new.correccion_latitud, new.correccion_longitud, new.correccion_precision, new.correccion_capturada_en
    from public.usuarios u where u.id = auth.uid();
    if not found then
        raise sqlstate '42501' using message = 'El actor de la revisión no está disponible';
    end if;
    return null;
end;
$$;

create function actaquito_privado.guardar_acta_con_gps(
    acta uuid, operacion uuid, recinto text, mesa smallint, dignidad text,
    votos_por_sigla jsonb, blancos numeric, nulos numeric, sufragantes numeric,
    gps_latitud double precision, gps_longitud double precision, gps_precision double precision, gps_capturada_en timestamptz
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    rol text := actaquito_privado.mi_rol();
    anterior public.actas%rowtype;
    repetida public.actas_revisiones%rowtype;
    siguiente integer;
begin
    if not coalesce(rol in ('veedor', 'recinto') and actaquito_privado.ve_mesa(recinto, mesa), false) then
        raise sqlstate '42501' using message = 'No tienes permiso para guardar esta mesa';
    end if;
    -- Serializa con las asignaciones y reemplazos de 2B.
    perform actaquito_privado.bloquear_recinto(recinto);
    rol := actaquito_privado.mi_rol();
    if not coalesce(rol in ('veedor', 'recinto') and actaquito_privado.ve_mesa(recinto, mesa), false) then
        raise sqlstate '42501' using message = 'La asignación de la mesa cambió';
    end if;

    select a.* into anterior from public.actas a
        where a.recinto_codigo = recinto and a.mesa_numero = mesa and a.dignidad_codigo = dignidad;
    if rol = 'veedor' and anterior.id is not null and anterior.autor_id <> actor then
        raise sqlstate '42501' using message = 'La mesa ya tiene un borrador de otro veedor. Consulta al coordinador';
    end if;
    if anterior.id is null and rol <> 'veedor' then
        raise sqlstate '42501' using message = 'Solo el veedor asignado puede iniciar el acta';
    end if;
    if acta is null or operacion is null then
        raise sqlstate '22023' using message = 'Se requieren los identificadores de acta y operación';
    end if;
    if anterior.id is not null and anterior.id <> acta then
        raise sqlstate '23505' using message = 'Ya existe un acta para esta mesa y dignidad';
    end if;
    if not actaquito_privado.cifras_acta_validas(votos_por_sigla, blancos, nulos, sufragantes) then
        raise sqlstate '22023' using message = 'Los votos deben ser enteros no negativos y sumar el total de sufragantes';
    end if;

    select r.* into repetida from public.actas_revisiones r where r.operacion_id = operacion;
    if found then
        if anterior.id is not null and repetida.acta_id = anterior.id and repetida.actor_id = actor
            and repetida.votos = votos_por_sigla and repetida.blancos = blancos
            and repetida.nulos = nulos and repetida.sufragantes = sufragantes
            and (repetida.correccion_latitud, repetida.correccion_longitud, repetida.correccion_precision, repetida.correccion_capturada_en)
                is not distinct from (gps_latitud, gps_longitud, gps_precision, gps_capturada_en) then
            return repetida.version;
        end if;
        raise sqlstate '23505' using message = 'El identificador de operación ya se utilizó';
    end if;

    if anterior.id is not null and not actaquito_privado.gps_correccion_valido(
        gps_latitud, gps_longitud, gps_precision, gps_capturada_en
    ) then
        raise sqlstate '22023' using message = 'La corrección requiere una ubicación GPS válida';
    end if;
    if (select count(*) from public.candidaturas c
        where c.dignidad_codigo = dignidad and votos_por_sigla ? c.organizacion_sigla) <> 5 then
        raise sqlstate '22023' using message = 'Los votos deben corresponder a las cinco candidaturas de la dignidad';
    end if;
    if anterior.id is null then
        insert into public.actas (id, recinto_codigo, mesa_numero, dignidad_codigo, autor_id,
            operacion_id, votos, blancos, nulos, sufragantes)
        values (acta, recinto, mesa, dignidad, actor, operacion, votos_por_sigla, blancos, nulos, sufragantes)
        returning version into siguiente;
    else
        update public.actas a
        set version = anterior.version + 1, operacion_id = operacion, votos = votos_por_sigla,
            blancos = guardar_acta_con_gps.blancos, nulos = guardar_acta_con_gps.nulos,
            sufragantes = guardar_acta_con_gps.sufragantes,
            correccion_latitud = gps_latitud, correccion_longitud = gps_longitud,
            correccion_precision = gps_precision, correccion_capturada_en = gps_capturada_en
        where a.id = anterior.id
        returning a.version into strict siguiente;
    end if;
    return siguiente;
end;
$$;

-- Mantiene altas de borradores y reintentos de operaciones históricas.
create or replace function public.guardar_borrador_acta(
    acta uuid, operacion uuid, recinto text, mesa smallint, dignidad text,
    votos_por_sigla jsonb, blancos numeric, nulos numeric, sufragantes numeric
) returns integer language sql security definer set search_path = ''
as $$
    select actaquito_privado.guardar_acta_con_gps(acta, operacion, recinto, mesa, dignidad,
        votos_por_sigla, blancos, nulos, sufragantes, null, null, null, null)
$$;

create function public.corregir_acta(
    acta uuid, operacion uuid, votos_por_sigla jsonb, blancos numeric, nulos numeric, sufragantes numeric,
    gps_latitud double precision, gps_longitud double precision, gps_precision double precision, gps_capturada_en timestamptz
) returns integer language plpgsql security definer set search_path = ''
as $$
declare
    objetivo public.actas%rowtype;
begin
    select a.* into objetivo from public.actas a where a.id = acta;
    if not found then
        raise sqlstate '42501' using message = 'No tienes permiso para corregir esta acta';
    end if;
    return actaquito_privado.guardar_acta_con_gps(acta, operacion, objetivo.recinto_codigo, objetivo.mesa_numero,
        objetivo.dignidad_codigo, votos_por_sigla, blancos, nulos, sufragantes,
        gps_latitud, gps_longitud, gps_precision, gps_capturada_en);
end;
$$;

create function public.leer_historial_acta(acta uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
    objetivo public.actas%rowtype;
    rol text := actaquito_privado.mi_rol();
begin
    select a.* into objetivo from public.actas a where a.id = acta;
    if not found or not coalesce(rol in ('provincial','recinto','veedor')
        and actaquito_privado.ve_mesa(objetivo.recinto_codigo, objetivo.mesa_numero)
        and (rol <> 'veedor' or objetivo.autor_id = auth.uid()), false) then
        raise sqlstate '42501' using message = 'No tienes permiso para consultar esta acta';
    end if;

    return (
        select coalesce(jsonb_agg(to_jsonb(h) order by h.version), '[]'::jsonb)
        from (
            select r.version, r.recibida_en, u.nombres, u.apellidos,
                   '******' || right(r.actor_cedula, 4) as cedula_enmascarada,
                   case when r.correccion_latitud is not null then jsonb_build_object(
                       'latitud', r.correccion_latitud, 'longitud', r.correccion_longitud,
                       'precision_metros', r.correccion_precision, 'capturada_en', r.correccion_capturada_en
                   ) end as ubicacion,
                   lag(d.cifras) over (order by r.version) as anterior, d.cifras as nuevo
            from public.actas_revisiones r
            join public.usuarios u on u.id = r.actor_id
            cross join lateral (select jsonb_build_object(
                'votos', r.votos, 'blancos', r.blancos, 'nulos', r.nulos, 'sufragantes', r.sufragantes
            ) as cifras) d
            where r.acta_id = acta
        ) h
    );
end;
$$;

revoke execute on function
    actaquito_privado.gps_correccion_valido(double precision,double precision,double precision,timestamptz),
    actaquito_privado.guardar_acta_con_gps(uuid,uuid,text,smallint,text,jsonb,numeric,numeric,numeric,double precision,double precision,double precision,timestamptz),
    public.corregir_acta(uuid,uuid,jsonb,numeric,numeric,numeric,double precision,double precision,double precision,timestamptz),
    public.leer_historial_acta(uuid) from public, anon, authenticated, service_role;
grant execute on function
    public.corregir_acta(uuid,uuid,jsonb,numeric,numeric,numeric,double precision,double precision,double precision,timestamptz),
    public.leer_historial_acta(uuid) to authenticated;

commit;
