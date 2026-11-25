begin;

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('actas-evidencia', 'actas-evidencia', false, array['image/jpeg']);

-- Los objetos solo se gestionan desde el backend de confianza.
create policy actas_evidencia_bloqueada
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id is distinct from 'actas-evidencia')
with check (bucket_id is distinct from 'actas-evidencia');

create table actaquito_privado.reservas_evidencia (
    operacion_id uuid primary key,
    acta_id uuid not null references public.actas(id),
    version integer not null,
    actor_id uuid not null references public.usuarios(id),
    ruta text not null unique,
    sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    latitud double precision not null check (latitud between -90 and 90),
    longitud double precision not null check (longitud between -180 and 180),
    precision_metros double precision not null check (precision_metros > 0 and precision_metros < 'Infinity'),
    capturada_en timestamptz not null check (isfinite(capturada_en)),
    gps_capturado_en timestamptz not null check (isfinite(gps_capturado_en)),
    distancia_metros double precision not null check (distancia_metros between 0 and 20015087),
    margen_metros integer not null check (margen_metros > 0),
    foreign key (acta_id, version) references public.actas_revisiones(acta_id, version)
);

-- Esta fila existe exclusivamente después de la confirmación del backend de confianza.
create table public.actas_evidencias (
    acta_id uuid primary key references public.actas(id),
    operacion_id uuid not null unique references actaquito_privado.reservas_evidencia(operacion_id),
    version integer not null,
    actor_id uuid not null references public.usuarios(id),
    ruta text not null unique,
    sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    latitud double precision not null check (latitud between -90 and 90),
    longitud double precision not null check (longitud between -180 and 180),
    precision_metros double precision not null check (precision_metros > 0 and precision_metros < 'Infinity'),
    capturada_en timestamptz not null check (isfinite(capturada_en)),
    gps_capturado_en timestamptz not null check (isfinite(gps_capturado_en)),
    distancia_metros double precision not null check (distancia_metros between 0 and 20015087),
    margen_metros integer not null check (margen_metros > 0),
    fuera_margen boolean generated always as (distancia_metros > margen_metros) stored,
    recibida_en timestamptz not null default clock_timestamp(),
    foreign key (acta_id, version) references public.actas_revisiones(acta_id, version)
);

alter table actaquito_privado.reservas_evidencia enable row level security;
alter table public.actas_evidencias enable row level security;
revoke all on actaquito_privado.reservas_evidencia, public.actas_evidencias
    from public, anon, authenticated, service_role;
grant select on public.actas_evidencias to authenticated;

create trigger actas_evidencias_inmutables before update or delete or truncate on public.actas_evidencias
for each statement execute function actaquito_privado.impedir_cambiar_revision_acta();

create policy actas_evidencias_lectura on public.actas_evidencias for select to authenticated
using (exists (select 1 from public.actas a where a.id = actas_evidencias.acta_id));

create view public.mesas_actas_reportadas with (security_invoker = true) as
select a.recinto_codigo, a.mesa_numero
from public.actas a
join public.actas_evidencias e on e.acta_id = a.id
group by a.recinto_codigo, a.mesa_numero
having bool_or(a.dignidad_codigo = 'ALCALDIA') and bool_or(a.dignidad_codigo = 'PREFECTURA');

revoke all on public.mesas_actas_reportadas from public, anon, authenticated, service_role;
grant select on public.mesas_actas_reportadas to authenticated;

create function actaquito_privado.distancia_evidencia(
    latitud_acta double precision, longitud_acta double precision,
    latitud_recinto double precision, longitud_recinto double precision
) returns double precision language sql immutable strict set search_path = ''
as $$
    select 2 * 6371000 * asin(sqrt(least(1::double precision,
        sin(radians(latitud_recinto - latitud_acta) / 2) ^ 2
        + cos(radians(latitud_acta)) * cos(radians(latitud_recinto))
        * sin(radians(longitud_recinto - longitud_acta) / 2) ^ 2)))
$$;

create function public.reservar_evidencia_acta(
    acta uuid, revision integer, operacion uuid, huella text,
    latitud double precision, longitud double precision, precision_metros double precision,
    capturada_en timestamptz, gps_capturado_en timestamptz
) returns text language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    objetivo public.actas%rowtype;
    previa actaquito_privado.reservas_evidencia%rowtype;
    distancia double precision;
    margen integer;
    objeto text;
begin
    if acta is null or revision is null or revision <= 0 or operacion is null or huella is null
       or huella !~ '^[0-9a-f]{64}$' or latitud is null or latitud not between -90 and 90
       or longitud is null or longitud not between -180 and 180
       or precision_metros is null or not (precision_metros > 0 and precision_metros < 'Infinity')
       or capturada_en is null or not isfinite(capturada_en)
       or gps_capturado_en is null or not isfinite(gps_capturado_en) then
        raise sqlstate '22023' using message = 'Se requieren foto, ubicación y horas de captura válidas';
    end if;
    select a.* into objetivo from public.actas a where a.id = acta;
    if not coalesce(actaquito_privado.mi_rol() = 'veedor' and objetivo.autor_id = actor
         and actaquito_privado.ve_mesa(objetivo.recinto_codigo, objetivo.mesa_numero), false) then
        raise sqlstate '42501' using message = 'No puedes registrar evidencia para esta acta';
    end if;
    perform actaquito_privado.bloquear_recinto(objetivo.recinto_codigo);
    if not coalesce(actaquito_privado.mi_rol() = 'veedor'
        and actaquito_privado.ve_mesa(objetivo.recinto_codigo, objetivo.mesa_numero), false) then
        raise sqlstate '42501' using message = 'La asignación de la mesa cambió';
    end if;

    select e.* into previa from actaquito_privado.reservas_evidencia e where e.operacion_id = operacion;
    if found then
        if (previa.acta_id, previa.version, previa.actor_id, previa.sha256, previa.latitud, previa.longitud,
            previa.precision_metros, previa.capturada_en, previa.gps_capturado_en) is not distinct from
           (acta, revision, actor, huella, latitud, longitud, precision_metros, capturada_en, gps_capturado_en) then
            return previa.ruta;
        end if;
        raise sqlstate '23505' using message = 'El identificador de operación ya se utilizó';
    end if;
    if exists (select 1 from public.actas_evidencias e where e.acta_id = acta) then
        raise sqlstate '23505' using message = 'El acta ya tiene evidencia confirmada';
    end if;
    if not exists (select 1 from public.actas_revisiones ar
        where ar.acta_id = acta and ar.version = revision and ar.actor_id = actor) then
        raise sqlstate '22023' using message = 'La revisión no corresponde a una captura de este veedor';
    end if;

    select actaquito_privado.distancia_evidencia(reservar_evidencia_acta.latitud, reservar_evidencia_acta.longitud,
               r.latitud::double precision, r.longitud::double precision),
           c.margen_gps_metros
    into distancia, margen
    from public.recintos r
    join public.parroquias p on p.codigo = r.parroquia_codigo
    join public.configuracion_captura c on c.canton_codigo = p.canton_codigo
    where r.codigo = objetivo.recinto_codigo;
    if not found then
        raise sqlstate '22023' using message = 'El recinto no tiene margen GPS configurado';
    end if;

    objeto := acta::text || '/' || operacion::text || '.jpg';
    insert into actaquito_privado.reservas_evidencia (
        operacion_id, acta_id, version, actor_id, ruta, sha256, latitud, longitud, precision_metros,
        capturada_en, gps_capturado_en, distancia_metros, margen_metros
    ) values (operacion, acta, revision, actor, objeto, huella, latitud, longitud, precision_metros,
        capturada_en, gps_capturado_en, distancia, margen);
    return objeto;
end;
$$;

-- El servidor llama después de descargar y verificar el JPEG y calcular su SHA-256.
create function public.confirmar_evidencia_acta(operacion uuid, huella_verificada text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
    reserva actaquito_privado.reservas_evidencia%rowtype;
    objetivo public.actas%rowtype;
begin
    select e.* into reserva from actaquito_privado.reservas_evidencia e where e.operacion_id = operacion;
    if not found or reserva.sha256 is distinct from huella_verificada then
        raise sqlstate '22023' using message = 'La evidencia no coincide con la reserva';
    end if;
    select a.* into strict objetivo from public.actas a where a.id = reserva.acta_id;
    perform actaquito_privado.bloquear_recinto(objetivo.recinto_codigo);

    if exists (select 1 from public.actas_evidencias e where e.operacion_id = operacion) then
        return reserva.acta_id;
    end if;
    if exists (select 1 from public.actas_evidencias e where e.acta_id = reserva.acta_id) then
        raise sqlstate '23505' using message = 'El acta ya tiene evidencia confirmada';
    end if;
    if actaquito_privado.rol_activo(reserva.actor_id) is distinct from 'veedor'
       or objetivo.autor_id is distinct from reserva.actor_id
       or not exists (select 1 from public.asignaciones_veedor av where av.fin is null
          and av.veedor_id = reserva.actor_id and av.recinto_codigo = objetivo.recinto_codigo
          and av.mesa_numero = objetivo.mesa_numero) then
        raise sqlstate '42501' using message = 'El veedor ya no tiene acceso a la mesa';
    end if;
    if not exists (select 1 from storage.objects o
        where o.bucket_id = 'actas-evidencia' and o.name = reserva.ruta
          and o.metadata ->> 'mimetype' = 'image/jpeg') then
        raise sqlstate '22023' using message = 'La fotografía reservada no está disponible';
    end if;

    insert into public.actas_evidencias (
        acta_id, operacion_id, version, actor_id, ruta, sha256, latitud, longitud, precision_metros,
        capturada_en, gps_capturado_en, distancia_metros, margen_metros
    ) values (reserva.acta_id, reserva.operacion_id, reserva.version, reserva.actor_id, reserva.ruta, reserva.sha256,
        reserva.latitud, reserva.longitud, reserva.precision_metros, reserva.capturada_en, reserva.gps_capturado_en,
        reserva.distancia_metros, reserva.margen_metros);
    return reserva.acta_id;
end;
$$;

revoke execute on function actaquito_privado.distancia_evidencia(double precision, double precision, double precision, double precision),
    public.reservar_evidencia_acta(uuid, integer, uuid, text, double precision, double precision, double precision, timestamptz, timestamptz),
    public.confirmar_evidencia_acta(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.reservar_evidencia_acta(
    uuid, integer, uuid, text, double precision, double precision, double precision, timestamptz, timestamptz
) to authenticated;
grant execute on function public.confirmar_evidencia_acta(uuid, text) to service_role;

commit;
