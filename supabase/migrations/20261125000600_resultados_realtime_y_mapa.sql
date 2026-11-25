begin;

-- Bloquear la instalación si la publicación efectiva ya expone tablas de actas.
do $$
begin
    if not exists (
        select 1 from pg_catalog.pg_publication
        where pubname = 'supabase_realtime' and not puballtables and pubinsert and pubupdate
    ) then
        raise exception 'Se requiere supabase_realtime selectiva con INSERT y UPDATE habilitados';
    end if;
    if exists (
        select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and ((schemaname = 'public' and tablename in ('actas', 'actas_revisiones', 'actas_evidencias'))
            or (schemaname = 'actaquito_privado' and tablename = 'reservas_evidencia'))
    ) then
        raise exception 'Supabase Realtime ya incluye tablas de actas o evidencias. Revisar la publicación antes de instalar 00600';
    end if;
end;
$$;

-- Una fila por acta con evidencia confirmada. La revisión de cifras puede avanzar.
create view public.actas_confirmadas_monitoreo with (security_invoker = true) as
select a.id as acta_id, a.recinto_codigo, a.mesa_numero, a.dignidad_codigo,
       r.version, r.votos, r.blancos, r.nulos, r.sufragantes,
       r.recibida_en as revision_recibida_en, e.latitud, e.longitud, e.precision_metros,
       e.distancia_metros, e.margen_metros, e.fuera_margen, e.capturada_en, e.recibida_en
from public.actas a
join public.actas_evidencias e on e.acta_id = a.id
cross join lateral (
    select ar.version, ar.votos, ar.blancos, ar.nulos, ar.sufragantes, ar.recibida_en
    from public.actas_revisiones ar
    where ar.acta_id = a.id
    order by ar.version desc
    limit 1
) r
where (select actaquito_privado.mi_rol()) in ('provincial', 'recinto');

create view public.resultados_preliminares with (security_invoker = true) as
with ambitos as (
    select r.codigo as recinto_codigo
    from public.recintos r
    where (select actaquito_privado.mi_rol()) in ('provincial', 'recinto')
    union all
    select null::text
    where (select actaquito_privado.mi_rol()) in ('provincial', 'recinto')
), actas_ambito as (
    select g.recinto_codigo, a.dignidad_codigo, a.votos, a.blancos, a.nulos, a.sufragantes
    from public.actas_confirmadas_monitoreo a
    cross join lateral (values (a.recinto_codigo), (null::text)) g(recinto_codigo)
), totales as (
    select recinto_codigo, dignidad_codigo, count(*) as actas_confirmadas,
           sum(blancos) as blancos, sum(nulos) as nulos, sum(sufragantes) as sufragantes,
           sum(sufragantes::bigint - blancos - nulos) as votos_validos
    from actas_ambito
    group by recinto_codigo, dignidad_codigo
), votos_candidatura as (
    select a.recinto_codigo, a.dignidad_codigo, v.key as sigla, sum(v.value::numeric) as votos
    from actas_ambito a
    cross join lateral jsonb_each_text(a.votos) v
    group by a.recinto_codigo, a.dignidad_codigo, v.key
)
select am.recinto_codigo, d.codigo as dignidad_codigo,
       coalesce(t.actas_confirmadas, 0) as actas_confirmadas,
       coalesce(t.blancos, 0) as blancos, coalesce(t.nulos, 0) as nulos,
       coalesce(t.sufragantes, 0) as sufragantes, coalesce(t.votos_validos, 0) as votos_validos,
       coalesce(c.filas, '[]'::jsonb) as candidaturas
from ambitos am
cross join public.dignidades d
left join totales t on t.recinto_codigo is not distinct from am.recinto_codigo and t.dignidad_codigo = d.codigo
left join lateral (
    select jsonb_agg(jsonb_build_object(
        'sigla', o.sigla, 'organizacion', o.nombre, 'color', o.color,
        'candidato', ca.nombre_candidato, 'posicion', ca.posicion, 'votos', coalesce(v.votos, 0),
        'porcentaje_votos_validos', round(100.0 * coalesce(v.votos, 0) / nullif(t.votos_validos, 0), 2)
    ) order by ca.posicion) as filas
    from public.candidaturas ca
    join public.organizaciones_politicas o on o.sigla = ca.organizacion_sigla
    left join votos_candidatura v on v.recinto_codigo is not distinct from am.recinto_codigo
        and v.dignidad_codigo = ca.dignidad_codigo and v.sigla = ca.organizacion_sigla
    where ca.dignidad_codigo = d.codigo
) c on true;

create view public.mapa_recintos_electoral with (security_invoker = true) as
select r.codigo, r.nombre, p.codigo as parroquia_codigo, p.nombre as parroquia,
       r.latitud, r.longitud, m.total_mesas, m.mesas_reportadas,
       m.total_mesas - m.mesas_reportadas as mesas_pendientes,
       coalesce(m.mesas, '[]'::jsonb) as mesas
from public.recintos r
join public.parroquias p on p.codigo = r.parroquia_codigo
cross join lateral (
    select count(*) as total_mesas, count(rep.mesa_numero) as mesas_reportadas,
           jsonb_agg(jsonb_build_object('numero', j.numero, 'reportada', rep.mesa_numero is not null)
                     order by j.numero) as mesas
    from public.mesas_jrv j
    left join public.mesas_actas_reportadas rep
        on (rep.recinto_codigo, rep.mesa_numero) = (j.recinto_codigo, j.numero)
    where j.recinto_codigo = r.codigo
) m
where (select actaquito_privado.mi_rol()) in ('provincial', 'recinto');

revoke all on public.actas_confirmadas_monitoreo, public.resultados_preliminares, public.mapa_recintos_electoral
    from public, anon, authenticated, service_role;
grant select on public.actas_confirmadas_monitoreo, public.resultados_preliminares, public.mapa_recintos_electoral
    to authenticated;

-- Una misma instantánea MVCC para resultados, avance y ubicaciones.
create function public.leer_monitoreo_electoral()
returns jsonb language sql stable security invoker set search_path = ''
as $$
    select jsonb_build_object(
        'resultados', coalesce((select jsonb_agg(r order by r.recinto_codigo nulls first, r.dignidad_codigo)
                                from public.resultados_preliminares r), '[]'::jsonb),
        'recintos', coalesce((select jsonb_agg(m order by m.nombre, m.codigo)
                              from public.mapa_recintos_electoral m), '[]'::jsonb),
        'actas', coalesce((select jsonb_agg(to_jsonb(a) - array['votos','blancos','nulos','sufragantes']
                                          order by a.recinto_codigo, a.mesa_numero, a.dignidad_codigo)
                           from public.actas_confirmadas_monitoreo a), '[]'::jsonb)
    )
$$;
revoke execute on function public.leer_monitoreo_electoral() from public, anon, authenticated, service_role;
grant execute on function public.leer_monitoreo_electoral() to authenticated;

-- Publicar solamente una señal territorial. Nunca se emiten votos, fotos ni GPS por el canal.
create table public.senal_monitoreo_electoral (
    recinto_codigo text primary key references public.recintos(codigo),
    revision bigint not null default 1 check (revision > 0)
);
alter table public.senal_monitoreo_electoral enable row level security;
revoke all on public.senal_monitoreo_electoral from public, anon, authenticated, service_role;
grant select on public.senal_monitoreo_electoral to authenticated;
create policy senal_monitoreo_lectura on public.senal_monitoreo_electoral
for select to authenticated using (
    (select actaquito_privado.mi_rol()) in ('provincial', 'recinto')
    and actaquito_privado.ve_recinto(recinto_codigo)
);

create function actaquito_privado.notificar_monitoreo_electoral()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    -- Una revisión de un borrador sin evidencia aún no afecta resultados.
    if tg_table_name = 'actas_revisiones' and not exists (
        select 1 from public.actas_evidencias e where e.acta_id = new.acta_id
    ) then
        return null;
    end if;

    insert into public.senal_monitoreo_electoral as s (recinto_codigo)
    select a.recinto_codigo from public.actas a where a.id = new.acta_id
    on conflict (recinto_codigo) do update set revision = s.revision + 1;
    return null;
end;
$$;

revoke execute on function actaquito_privado.notificar_monitoreo_electoral()
    from public, anon, authenticated, service_role;

create trigger evidencia_notificar_monitoreo after insert on public.actas_evidencias
for each row execute function actaquito_privado.notificar_monitoreo_electoral();

create trigger revision_notificar_monitoreo after insert on public.actas_revisiones
for each row execute function actaquito_privado.notificar_monitoreo_electoral();

-- Postgres Changes no aplica RLS a DELETE. La señal se conserva y solo cambia su revisión.
create trigger senal_monitoreo_sin_borrado before delete or truncate on public.senal_monitoreo_electoral
for each statement execute function actaquito_privado.impedir_cambiar_revision_acta();

alter publication supabase_realtime add table public.senal_monitoreo_electoral;

commit;
