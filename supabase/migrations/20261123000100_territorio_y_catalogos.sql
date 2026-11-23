begin;

create table public.provincias (
    codigo text primary key check (btrim(codigo) <> ''),
    nombre text not null unique check (btrim(nombre) <> '')
);

create table public.cantones (
    codigo text primary key check (btrim(codigo) <> ''),
    provincia_codigo text not null references public.provincias (codigo),
    nombre text not null check (btrim(nombre) <> ''),
    unique (provincia_codigo, nombre)
);

create table public.parroquias (
    codigo text primary key check (btrim(codigo) <> ''),
    canton_codigo text not null references public.cantones (codigo),
    nombre text not null check (btrim(nombre) <> ''),
    tipo text not null check (tipo in ('urbana', 'rural')),
    unique (canton_codigo, nombre)
);

create table public.recintos (
    codigo text primary key check (btrim(codigo) <> ''),
    parroquia_codigo text not null references public.parroquias (codigo),
    nombre text not null check (btrim(nombre) <> ''),
    latitud numeric not null check (latitud between -90 and 90),
    longitud numeric not null check (longitud between -180 and 180)
);

create unique index recintos_parroquia_nombre_normalizado_uidx
    on public.recintos (parroquia_codigo, lower(regexp_replace(btrim(nombre), '[[:space:]]+', ' ', 'g')));

create table public.mesas_jrv (
    recinto_codigo text not null references public.recintos (codigo),
    numero smallint not null check (numero > 0),
    primary key (recinto_codigo, numero)
);

create table public.dignidades (
    codigo text primary key check (codigo in ('ALCALDIA', 'PREFECTURA')),
    nombre text not null unique,
    check (
        (codigo = 'ALCALDIA' and nombre = 'Alcaldía')
        or (codigo = 'PREFECTURA' and nombre = 'Prefectura')
    )
);

create table public.organizaciones_politicas (
    sigla text primary key check (sigla ~ '^[A-Z]+$'),
    nombre text not null unique check (btrim(nombre) <> ''),
    color text not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.candidaturas (
    dignidad_codigo text not null references public.dignidades (codigo),
    organizacion_sigla text not null references public.organizaciones_politicas (sigla),
    nombre_candidato text not null check (btrim(nombre_candidato) <> ''),
    posicion smallint not null check (posicion between 1 and 5),
    primary key (dignidad_codigo, organizacion_sigla),
    unique (dignidad_codigo, posicion)
);

create table public.configuracion_captura (
    canton_codigo text primary key references public.cantones (codigo),
    margen_gps_metros integer not null default 200 check (margen_gps_metros > 0)
);

alter table public.provincias enable row level security;
alter table public.cantones enable row level security;
alter table public.parroquias enable row level security;
alter table public.recintos enable row level security;
alter table public.mesas_jrv enable row level security;
alter table public.dignidades enable row level security;
alter table public.organizaciones_politicas enable row level security;
alter table public.candidaturas enable row level security;
alter table public.configuracion_captura enable row level security;

revoke all privileges on table
    public.provincias,
    public.cantones,
    public.parroquias,
    public.recintos,
    public.mesas_jrv,
    public.dignidades,
    public.organizaciones_politicas,
    public.candidaturas,
    public.configuracion_captura
from public, anon, authenticated;

commit;