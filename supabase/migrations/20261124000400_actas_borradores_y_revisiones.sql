begin;

create function actaquito_privado.cifras_acta_validas(votos jsonb, blancos numeric, nulos numeric, total numeric)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
    voto jsonb;
    cantidad numeric;
    suma numeric := blancos + nulos;
begin
    if jsonb_typeof(votos) is distinct from 'object' or blancos is null or nulos is null or total is null
        or total not between 0 and 2147483647 or trunc(total) <> total
        or blancos not between 0 and total or trunc(blancos) <> blancos
        or nulos not between 0 and total or trunc(nulos) <> nulos then
        return false;
    end if;
    if (select count(*) from jsonb_object_keys(votos)) <> 5 then return false; end if;
    for voto in select value from jsonb_each(votos)
    loop
        if jsonb_typeof(voto) <> 'number' then return false; end if;
        cantidad := voto::numeric;
        if cantidad not between 0 and total or trunc(cantidad) <> cantidad then return false; end if;
        suma := suma + cantidad;
    end loop;
    return suma = total;
end;
$$;

create table public.actas (
    id uuid primary key,
    recinto_codigo text not null,
    mesa_numero smallint not null,
    dignidad_codigo text not null references public.dignidades (codigo),
    autor_id uuid not null references public.usuarios (id),
    estado text not null default 'borrador' check (estado = 'borrador'),
    creada_en timestamptz not null default clock_timestamp(),
    foreign key (recinto_codigo, mesa_numero) references public.mesas_jrv (recinto_codigo, numero),
    unique (recinto_codigo, mesa_numero, dignidad_codigo)
);

create table public.actas_revisiones (
    acta_id uuid not null references public.actas (id),
    version integer not null check (version > 0),
    operacion_id uuid not null unique,
    actor_id uuid not null references public.usuarios (id),
    actor_cedula text not null,
    recibida_en timestamptz not null default clock_timestamp(),
    votos jsonb not null,
    blancos integer not null,
    nulos integer not null,
    sufragantes integer not null,
    primary key (acta_id, version),
    check (actaquito_privado.cifras_acta_validas(votos, blancos, nulos, sufragantes))
);

create function actaquito_privado.impedir_cambiar_revision_acta()
returns trigger language plpgsql set search_path = ''
as $$
begin
    raise sqlstate '42501' using message = 'El historial de actas es de solo inserción';
end;
$$;
create trigger actas_revisiones_inmutables before update or delete or truncate on public.actas_revisiones
for each statement execute function actaquito_privado.impedir_cambiar_revision_acta();

alter table public.actas enable row level security;
alter table public.actas_revisiones enable row level security;
revoke all on public.actas, public.actas_revisiones from public, anon, authenticated;
grant select on public.actas to authenticated;
grant select (acta_id, version, operacion_id, actor_id, recibida_en, votos, blancos, nulos, sufragantes)
    on public.actas_revisiones to authenticated;

create policy actas_lectura on public.actas for select to authenticated using (
    actaquito_privado.ve_mesa(recinto_codigo, mesa_numero)
    and (actaquito_privado.mi_rol() <> 'veedor' or autor_id = (select auth.uid()))
);
create policy actas_revisiones_lectura on public.actas_revisiones for select to authenticated using (
    exists (select 1 from public.actas a where a.id = acta_id)
);

create function public.guardar_borrador_acta(
    acta uuid, operacion uuid, recinto text, mesa smallint, dignidad text,
    votos_por_sigla jsonb, blancos numeric, nulos numeric, sufragantes numeric
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
            and repetida.nulos = nulos and repetida.sufragantes = sufragantes then
            return repetida.version;
        end if;
        raise sqlstate '23505' using message = 'El identificador de operación ya se utilizó';
    end if;

    if (select count(*) from public.candidaturas c
        where c.dignidad_codigo = dignidad and votos_por_sigla ? c.organizacion_sigla) <> 5 then
        raise sqlstate '22023' using message = 'Los votos deben corresponder a las cinco candidaturas de la dignidad';
    end if;
    if anterior.id is null then
        insert into public.actas (id, recinto_codigo, mesa_numero, dignidad_codigo, autor_id)
        values (acta, recinto, mesa, dignidad, actor);
    end if;
    select coalesce(max(r.version), 0) + 1 into siguiente
        from public.actas_revisiones r where r.acta_id = acta;
    insert into public.actas_revisiones (acta_id, version, operacion_id, actor_id, actor_cedula, votos, blancos, nulos, sufragantes)
    select acta, siguiente, operacion, actor, u.cedula, votos_por_sigla, blancos, nulos, sufragantes
    from public.usuarios u where u.id = actor;
    return siguiente;
end;
$$;

revoke execute on function actaquito_privado.cifras_acta_validas(jsonb, numeric, numeric, numeric),
    actaquito_privado.impedir_cambiar_revision_acta() from public, anon, authenticated;
revoke execute on function public.guardar_borrador_acta(uuid, uuid, text, smallint, text, jsonb, numeric, numeric, numeric)
    from public, anon, authenticated;
grant execute on function public.guardar_borrador_acta(uuid, uuid, text, smallint, text, jsonb, numeric, numeric, numeric)
    to authenticated;

commit;
