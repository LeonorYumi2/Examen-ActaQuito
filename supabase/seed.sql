-- Fuente: docs/supuestos.md (S-01, S-02 y S-08).
-- Datos territoriales de demostración pendientes de verificar según S-01.
-- Antes de una carga definitiva, validar los nombres, coordenadas y parroquias.
-- Los códigos son identificadores internos. Las JRV 001 a 003 son simuladas.
begin;

create temporary table semilla_provincias (codigo, nombre) on commit drop as
values ('PICHINCHA', 'Pichincha');

create temporary table semilla_cantones (codigo, provincia_codigo, nombre) on commit drop as
values ('QUITO', 'PICHINCHA', 'Quito');

create temporary table semilla_parroquias (codigo, canton_codigo, nombre, tipo) on commit drop as
values
    ('INAQUITO', 'QUITO', 'Iñaquito', 'urbana'),
    ('QUITUMBE', 'QUITO', 'Quitumbe', 'urbana'),
    ('LA_MAGDALENA', 'QUITO', 'La Magdalena', 'urbana'),
    ('CALDERON', 'QUITO', 'Calderón', 'rural'),
    ('TUMBACO', 'QUITO', 'Tumbaco', 'rural'),
    ('PIFO', 'QUITO', 'Pifo', 'rural');

create temporary table semilla_recintos (codigo, parroquia_codigo, nombre, latitud, longitud) on commit drop as
values
    ('R01', 'INAQUITO', 'Colegio La Condamine', -0.17261842559297133, -78.4829615893297),
    ('R02', 'INAQUITO', 'Unidad Educativa Fiscal República de Bolivia', -0.18291876659431192, -78.48831391999724),
    ('R03', 'QUITUMBE', 'Unidad Educativa Municipal Quitumbe', -0.28092058299361927, -78.54875903535986),
    ('R04', 'QUITUMBE', 'U.E. Aurelio Bayas', -0.29650345455062216, -78.53182313350888),
    ('R05', 'LA_MAGDALENA', 'Colegio Amazonas', -0.24557049627022853, -78.5267646200163),
    ('R06', 'LA_MAGDALENA', 'Unidad Educativa Particular Fernández Salvador Villavicencio Ponce', -0.2432486595075582, -78.51896865060093),
    ('R07', 'CALDERON', 'Unidad Educativa Nicolás Jiménez', -0.08342352204887239, -78.42269598997954),
    ('R08', 'CALDERON', 'Unidad Educativa Luxemburgo', -0.09444252347955778, -78.45143258933005),
    ('R09', 'TUMBACO', 'Unidad Educativa Tumbaco', -0.22461233844658068, -78.37609062001694),
    ('R10', 'TUMBACO', 'Escuela Roberto Espinoza', -0.2113119957674417, -78.40451540652408),
    ('R11', 'PIFO', 'C.F. Eduardo Salazar Gómez', -0.22732224972003667, -78.34325005070353),
    ('R12', 'PIFO', 'Institución Educativa Fiscal Ricardo Rodríguez', -0.2245982397192964, -78.33664057583717);

create temporary table semilla_mesas_jrv (recinto_codigo, numero) on commit drop as
select recinto.codigo, mesa.numero
from pg_temp.semilla_recintos as recinto
cross join (values (1), (2), (3)) as mesa(numero);

create temporary table semilla_dignidades (codigo, nombre) on commit drop as
values ('ALCALDIA', 'Alcaldía'), ('PREFECTURA', 'Prefectura');

create temporary table semilla_organizaciones_politicas (sigla, nombre, color) on commit drop as
values
    ('MFC', 'Movimiento Futuro Ciudadano', '#1769AA'),
    ('ARP', 'Alianza Renovación Popular', '#169B62'),
    ('MUC', 'Movimiento Unidos por el Cambio', '#E87932'),
    ('FDP', 'Frente Democrático Progreso', '#8054B8'),
    ('MNE', 'Movimiento Nueva Esperanza', '#D84A52');

create temporary table semilla_candidaturas (dignidad_codigo, organizacion_sigla, nombre_candidato, posicion) on commit drop as
values
    ('ALCALDIA', 'MFC', 'Daniel Andrade', 1),
    ('ALCALDIA', 'ARP', 'Valeria Cárdenas', 2),
    ('ALCALDIA', 'MUC', 'Sebastián Molina', 3),
    ('ALCALDIA', 'FDP', 'Natalia Espinosa', 4),
    ('ALCALDIA', 'MNE', 'Ricardo Paredes', 5),
    ('PREFECTURA', 'MFC', 'Gabriela Torres', 1),
    ('PREFECTURA', 'ARP', 'Mauricio Salazar', 2),
    ('PREFECTURA', 'MUC', 'Carolina Herrera', 3),
    ('PREFECTURA', 'FDP', 'Andrés Villacís', 4),
    ('PREFECTURA', 'MNE', 'Daniela Morales', 5);

create temporary table semilla_configuracion_captura (canton_codigo, margen_gps_metros) on commit drop as
values ('QUITO', 200);

-- Mantiene estable el ámbito de la comparación hasta confirmar la transacción.
lock table public.provincias, public.cantones, public.parroquias, public.recintos,
    public.mesas_jrv, public.dignidades, public.organizaciones_politicas,
    public.candidaturas, public.configuracion_captura in share row exclusive mode;

do $validar_precarga$
declare
    catalogo record;
    discrepancia text;
begin
    -- Validar cada tabla antes de cargar las que dependen de ella.
    for catalogo in
        select tabla, columnas, alcance
        from (values
            (1, 'provincias', 'codigo, nombre', 'codigo = ''PICHINCHA'''),
            (2, 'cantones', 'codigo, provincia_codigo, nombre', 'codigo = ''QUITO'''),
            (3, 'parroquias', 'codigo, canton_codigo, nombre, tipo', 'canton_codigo = ''QUITO'' or codigo in (select codigo from pg_temp.semilla_parroquias)'),
            (4, 'recintos', 'codigo, parroquia_codigo, nombre, latitud, longitud', 'parroquia_codigo in (select codigo from public.parroquias where canton_codigo = ''QUITO'') or codigo in (select codigo from pg_temp.semilla_recintos)'),
            (5, 'mesas_jrv', 'recinto_codigo, numero', 'recinto_codigo in (select codigo from pg_temp.semilla_recintos)'),
            (6, 'dignidades', 'codigo, nombre', 'true'),
            (7, 'organizaciones_politicas', 'sigla, nombre, color', 'true'),
            (8, 'candidaturas', 'dignidad_codigo, organizacion_sigla, nombre_candidato, posicion', 'true'),
            (9, 'configuracion_captura', 'canton_codigo, margen_gps_metros', 'canton_codigo = ''QUITO''')
        ) as origen(orden, tabla, columnas, alcance)
        order by orden
    loop
        execute format(
            'insert into public.%I (%s) select %s from pg_temp.%I on conflict do nothing',
            catalogo.tabla, catalogo.columnas, catalogo.columnas, 'semilla_' || catalogo.tabla
        );

        -- Comparar filas completas en ambos sentidos: detecta faltantes,
        -- cambios bajo una clave existente y filas adicionales en el ámbito.
        execute format($comparar$
            with esperadas as (
                select %1$s from pg_temp.%2$I
            ), registradas as (
                select %1$s from public.%3$I where %4$s
            ), faltantes as (
                select * from esperadas except select * from registradas
            ), inesperadas as (
                select * from registradas except select * from esperadas
            )
            select concat_ws('; ',
                (select 'fila esperada ausente: ' || row_to_json(fila)::text
                 from faltantes as fila order by row_to_json(fila)::text limit 1),
                (select 'fila registrada no acordada: ' || row_to_json(fila)::text
                 from inesperadas as fila order by row_to_json(fila)::text limit 1)
            )
        $comparar$, catalogo.columnas, 'semilla_' || catalogo.tabla, catalogo.tabla, catalogo.alcance)
        into discrepancia;

        if discrepancia <> '' then
            raise exception 'Precarga inválida en %: %', catalogo.tabla, discrepancia;
        end if;
    end loop;
end;
$validar_precarga$;

commit;
