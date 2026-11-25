begin;

create schema actaquito_privado;
revoke all on schema actaquito_privado from public;
grant usage on schema actaquito_privado to authenticated;

create function actaquito_privado.cedula_valida(valor text)
returns boolean language plpgsql immutable strict set search_path = ''
as $$
declare
    suma integer := 0;
    digito integer;
begin
    if valor !~ '^[0-9]{10}$' then return false; end if;
    if (left(valor, 2)::integer not between 1 and 24 and left(valor, 2) <> '30')
        or substr(valor, 3, 1)::integer > 5 then return false; end if;
    for posicion in 1..9 loop
        digito := substr(valor, posicion, 1)::integer;
        if posicion % 2 = 1 then
            digito := digito * 2;
            if digito > 9 then digito := digito - 9; end if;
        end if;
        suma := suma + digito;
    end loop;
    return (10 - suma % 10) % 10 = right(valor, 1)::integer;
end;
$$;
revoke all on function actaquito_privado.cedula_valida(text) from public;

create table public.roles (
    codigo text primary key check (codigo in ('provincial', 'recinto', 'veedor'))
);
insert into public.roles values ('provincial'), ('recinto'), ('veedor');

create table public.usuarios (
    id uuid primary key references auth.users (id),
    rol text not null references public.roles (codigo),
    cedula text not null unique check (actaquito_privado.cedula_valida(cedula)),
    correo text not null unique check (correo = lower(btrim(correo)) and correo ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    nombres text not null check (length(btrim(nombres)) between 1 and 120),
    apellidos text not null check (length(btrim(apellidos)) between 1 and 120),
    telefono text not null check (telefono ~ '^[+0-9() -]{7,30}$' and length(regexp_replace(telefono, '[^0-9]', '', 'g')) >= 7),
    recinto_base text references public.recintos (codigo),
    creado_por uuid references public.usuarios (id),
    creado_en timestamptz not null default clock_timestamp(),
    habilitado boolean not null default true,
    check ((rol = 'veedor') = (recinto_base is not null)),
    check ((rol = 'provincial') = (creado_por is null)),
    unique (id, rol),
    unique (id, recinto_base)
);
create unique index usuarios_provincial_unico on public.usuarios (rol) where rol = 'provincial';
create index usuarios_recinto_base_idx on public.usuarios (recinto_base) where recinto_base is not null;

create table public.asignaciones_coordinador (
    id uuid primary key default gen_random_uuid(),
    recinto_codigo text not null references public.recintos (codigo),
    coordinador_id uuid not null,
    rol_coordinador text not null default 'recinto' check (rol_coordinador = 'recinto'),
    asignado_por uuid not null references public.usuarios (id),
    inicio timestamptz not null default clock_timestamp(),
    fin timestamptz check (fin >= inicio),
    foreign key (coordinador_id, rol_coordinador) references public.usuarios (id, rol)
);
create unique index coordinador_vigente_recinto on public.asignaciones_coordinador (recinto_codigo) where fin is null;
create index coordinador_vigente_usuario on public.asignaciones_coordinador (coordinador_id, recinto_codigo) where fin is null;

create table public.asignaciones_veedor (
    id uuid primary key default gen_random_uuid(),
    recinto_codigo text not null,
    mesa_numero smallint not null,
    veedor_id uuid not null,
    asignado_por uuid not null references public.usuarios (id),
    inicio timestamptz not null default clock_timestamp(),
    fin timestamptz check (fin >= inicio),
    foreign key (recinto_codigo, mesa_numero) references public.mesas_jrv (recinto_codigo, numero),
    foreign key (veedor_id, recinto_codigo) references public.usuarios (id, recinto_base),
    unique (id, recinto_codigo, mesa_numero)
);
create unique index veedor_vigente_mesa on public.asignaciones_veedor (recinto_codigo, mesa_numero) where fin is null;
create index veedor_vigente_usuario on public.asignaciones_veedor (veedor_id, recinto_codigo, mesa_numero) where fin is null;

create table public.reemplazos_veedor (
    id uuid primary key default gen_random_uuid(),
    recinto_codigo text not null,
    mesa_numero smallint not null,
    saliente_id uuid not null unique,
    entrante_id uuid not null unique,
    realizado_por uuid not null references public.usuarios (id),
    realizado_en timestamptz not null,
    check (saliente_id <> entrante_id),
    foreign key (saliente_id, recinto_codigo, mesa_numero) references public.asignaciones_veedor (id, recinto_codigo, mesa_numero),
    foreign key (entrante_id, recinto_codigo, mesa_numero) references public.asignaciones_veedor (id, recinto_codigo, mesa_numero)
);

create table actaquito_privado.invitaciones (
    id uuid primary key default gen_random_uuid(),
    correo text not null unique check (correo = lower(btrim(correo)) and length(correo) <= 254 and correo ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    cedula text not null unique check (actaquito_privado.cedula_valida(cedula)),
    nombres text not null check (length(btrim(nombres)) between 1 and 120),
    apellidos text not null check (length(btrim(apellidos)) between 1 and 120),
    telefono text not null check (telefono ~ '^[+0-9() -]{7,30}$' and length(regexp_replace(telefono, '[^0-9]', '', 'g')) >= 7),
    recinto_base text references public.recintos (codigo),
    rol text not null references public.roles (codigo),
    actor_id uuid references public.usuarios (id),
    auth_id uuid unique references auth.users (id),
    usuario_id uuid unique references public.usuarios (id),
    primer_ingreso_password_en timestamptz,
    check (primer_ingreso_password_en is null or auth_id is not null),
    check (usuario_id is null or (auth_id is not null and usuario_id = auth_id)),
    check ((rol = 'veedor') = (recinto_base is not null)),
    check ((rol = 'provincial') = (actor_id is null))
);
create unique index invitacion_provincial_unica on actaquito_privado.invitaciones (rol) where rol = 'provincial';

create function actaquito_privado.rol_activo(persona uuid)
returns text language sql stable security definer set search_path = ''
as $$
    select u.rol from public.usuarios u join auth.users a on a.id = u.id
    join actaquito_privado.invitaciones i on i.usuario_id = u.id
    where u.id = persona and u.habilitado and u.correo = lower(a.email)
        and i.primer_ingreso_password_en is not null
        and a.email_confirmed_at is not null and nullif(a.encrypted_password, '') is not null
        and (a.banned_until is null or a.banned_until <= now())
$$;

create function actaquito_privado.en_provincia(recinto text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (select 1 from public.recintos r
        join public.parroquias p on p.codigo = r.parroquia_codigo
        join public.cantones c on c.codigo = p.canton_codigo
        where r.codigo = recinto and c.provincia_codigo = 'PICHINCHA')
$$;

create function actaquito_privado.coordina(persona uuid, recinto text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select actaquito_privado.rol_activo(persona) is not distinct from 'recinto'
        and exists (select 1 from public.asignaciones_coordinador a
            where a.coordinador_id = persona and a.recinto_codigo = recinto and a.fin is null)
$$;

-- Una sesión de invitación o recuperación puede cambiar la contraseña en
-- Auth. El acceso operativo requiere una sesión iniciada con la contraseña.
create function actaquito_privado.mi_rol()
returns text language sql stable security definer set search_path = ''
as $$
    select actaquito_privado.rol_activo(auth.uid())
    where (auth.jwt() -> 'amr') @> '[{"method":"password"}]'::jsonb
$$;

create function actaquito_privado.parroquia_en_provincia(parroquia text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.parroquias p join public.cantones c on c.codigo = p.canton_codigo
        where p.codigo = parroquia and c.provincia_codigo = 'PICHINCHA'
    )
$$;

create function actaquito_privado.ve_mesa(recinto text, mesa smallint)
returns boolean language sql stable security definer set search_path = ''
as $$
    select (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.en_provincia(recinto))
        or (actaquito_privado.mi_rol() = 'recinto' and actaquito_privado.coordina(auth.uid(), recinto))
        or (actaquito_privado.mi_rol() = 'veedor' and exists (
            select 1 from public.asignaciones_veedor a where a.veedor_id = auth.uid()
                and a.recinto_codigo = recinto and a.mesa_numero = mesa and a.fin is null
        ))
$$;

create function actaquito_privado.ve_recinto(recinto text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.en_provincia(recinto))
        or (actaquito_privado.mi_rol() = 'recinto' and actaquito_privado.coordina(auth.uid(), recinto))
        or (actaquito_privado.mi_rol() = 'veedor' and exists (
            select 1 from public.asignaciones_veedor a
            where a.veedor_id = auth.uid() and a.recinto_codigo = recinto and a.fin is null
        ))
$$;

create function actaquito_privado.mi_recinto_coordinado(recinto text)
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(actaquito_privado.mi_rol() = 'recinto' and actaquito_privado.coordina(auth.uid(), recinto), false) $$;

revoke execute on all functions in schema actaquito_privado from public, anon, authenticated;
grant execute on function actaquito_privado.mi_rol(), actaquito_privado.ve_recinto(text),
    actaquito_privado.ve_mesa(text, smallint), actaquito_privado.mi_recinto_coordinado(text),
    actaquito_privado.en_provincia(text), actaquito_privado.parroquia_en_provincia(text) to authenticated;

alter table public.roles enable row level security;
alter table public.usuarios enable row level security;
alter table public.asignaciones_coordinador enable row level security;
alter table public.asignaciones_veedor enable row level security;
alter table public.reemplazos_veedor enable row level security;
alter table actaquito_privado.invitaciones enable row level security;

revoke all on public.roles, public.usuarios, public.asignaciones_coordinador,
    public.asignaciones_veedor, public.reemplazos_veedor from public, anon, authenticated;
grant select on public.roles, public.asignaciones_coordinador, public.asignaciones_veedor,
    public.reemplazos_veedor to authenticated;
grant select (id, rol, nombres, apellidos, recinto_base, habilitado) on public.usuarios to authenticated;
grant select on public.provincias, public.cantones, public.parroquias, public.recintos, public.mesas_jrv,
    public.dignidades, public.organizaciones_politicas, public.candidaturas, public.configuracion_captura to authenticated;
grant insert on public.recintos to authenticated;

create policy roles_activos on public.roles for select to authenticated using (actaquito_privado.mi_rol() is not null);
create policy perfiles_acotados on public.usuarios for select to authenticated using (
    (id = (select auth.uid()) and actaquito_privado.mi_rol() is not null)
    or (rol = 'recinto' and actaquito_privado.mi_rol() = 'provincial')
    or (rol = 'veedor' and actaquito_privado.mi_recinto_coordinado(recinto_base))
);
create policy coordinaciones_acotadas on public.asignaciones_coordinador for select to authenticated using (
    (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.en_provincia(recinto_codigo))
    or (fin is null and actaquito_privado.mi_recinto_coordinado(recinto_codigo))
);
create policy asignaciones_acotadas on public.asignaciones_veedor for select to authenticated using (
    (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.en_provincia(recinto_codigo))
    or actaquito_privado.mi_recinto_coordinado(recinto_codigo)
    or (fin is null and veedor_id = (select auth.uid()) and actaquito_privado.mi_rol() = 'veedor')
);
create policy reemplazos_acotados on public.reemplazos_veedor for select to authenticated using (
    (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.en_provincia(recinto_codigo))
    or actaquito_privado.mi_recinto_coordinado(recinto_codigo)
);
create policy recintos_acotados on public.recintos for select to authenticated using (
    (actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.parroquia_en_provincia(parroquia_codigo))
    or actaquito_privado.ve_recinto(codigo)
);
create policy mesas_acotadas on public.mesas_jrv for select to authenticated using (actaquito_privado.ve_mesa(recinto_codigo, numero));
create policy parroquias_acotadas on public.parroquias for select to authenticated using (
    (actaquito_privado.mi_rol() = 'provincial' and exists (
        select 1 from public.cantones c where c.codigo = canton_codigo and c.provincia_codigo = 'PICHINCHA'
    )) or exists (select 1 from public.recintos r where r.parroquia_codigo = parroquias.codigo)
);
-- Resolver ancestros sin referencias circulares entre políticas RLS.
create function actaquito_privado.ve_canton(canton text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select (actaquito_privado.mi_rol() = 'provincial' and exists (
        select 1 from public.cantones c where c.codigo = canton and c.provincia_codigo = 'PICHINCHA'
    )) or exists (
        select 1 from public.recintos r join public.parroquias p on p.codigo = r.parroquia_codigo
        where p.canton_codigo = canton and actaquito_privado.ve_recinto(r.codigo)
    )
$$;
revoke all on function actaquito_privado.ve_canton(text) from public, anon, authenticated;
grant execute on function actaquito_privado.ve_canton(text) to authenticated;
create policy cantones_acotados on public.cantones for select to authenticated using (actaquito_privado.ve_canton(codigo));
create policy provincias_acotadas on public.provincias for select to authenticated using (
    (codigo = 'PICHINCHA' and actaquito_privado.mi_rol() = 'provincial')
    or exists (select 1 from public.cantones c where c.provincia_codigo = provincias.codigo)
);
create policy recinto_alta_provincial on public.recintos for insert to authenticated with check (
    actaquito_privado.mi_rol() = 'provincial' and actaquito_privado.parroquia_en_provincia(parroquia_codigo)
);
create policy captura_acotada on public.configuracion_captura for select to authenticated using (actaquito_privado.ve_canton(canton_codigo));
create policy dignidades_activas on public.dignidades for select to authenticated using (actaquito_privado.mi_rol() is not null);
create policy organizaciones_activas on public.organizaciones_politicas for select to authenticated using (actaquito_privado.mi_rol() is not null);
create policy candidaturas_activas on public.candidaturas for select to authenticated using (actaquito_privado.mi_rol() is not null);

commit;
