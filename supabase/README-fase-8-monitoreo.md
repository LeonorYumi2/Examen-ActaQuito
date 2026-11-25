# Seguimiento electoral y mapa

## Datos y permisos

00600 añade tres vistas con security_invoker y la función de lectura
leer_monitoreo_electoral. El cliente obtiene resultados, recintos, avance y
puntos de actas en una misma instantánea. El provincial lee su jurisdicción
y el coordinador sus recintos vigentes. El veedor mantiene su flujo de captura.
El total con recinto_codigo nulo se refiere al ámbito visible del usuario.

La vista de resultados solo suma la última revisión de cada acta con evidencia
confirmada. El porcentaje por candidatura usa votos válidos como denominador.
Si no hay votos válidos, el porcentaje es null. Blancos, nulos y sufragantes
se presentan por separado. S-09 carece de padrón por mesa, así que no hay
porcentaje de participación. Una sola dignidad confirmada aporta a su resultado.
La mesa se reporta al confirmar ambas dignidades, según S-07 y la vista de 00500.

La publicación supabase_realtime recibe solo senal_monitoreo_electoral. Es una
señal territorial por recinto que incrementa su revisión al confirmar evidencia
o corregir un acta ya confirmada. RLS limita la recepción. El contenido electoral
se obtiene por la función de lectura.

## Contratos para Antigravity

Importar useSeguimientoElectoral de
src/features/monitoreo/presentation/hooks/useSeguimientoElectoral. Devuelve
datos, error, cargando, actualizando y actualizar. Puede deshabilitarse cuando
la pantalla no está enfocada. Comparte caché y un canal por cuenta entre
consumidores. Agrupa señales, espera a que termine una lectura en curso y
consulta de nuevo al conectar el canal o volver a primer plano. El botón puede
usar actualizar si Realtime falla. El canal se retira al cerrar sesión o salir
el último consumidor.

Para mapa, usar documentoMapaElectoral con una URL HTTPS pública del proyecto
como baseUrl del WebView. Después de mapa-listo, inyectar actualizarMapaElectoral
con datos.recintos y datos.actas. Repetir cuando se actualice la instantánea sin
recrear el WebView. leerMensajeMapa valida los mensajes de selección. Resolver
el código de recinto o UUID de acta contra la instantánea actual antes de abrir
un detalle. El documento usa Leaflet 1.9.4 con integridad de CDN y teselas HTTPS
de OpenStreetMap. Mantener visible la atribución y configurar un User-Agent
identificable de ActaQuito en el WebView. Conservar el caché HTTP de teselas y
permitir que el enlace de atribución se abra de forma externa. Las credenciales
quedan fuera del documento. La integración visual del WebView y su dependencia
nativa quedan a cargo de presentación.

## Aplicación y pruebas reales

Aplicar únicamente 00600 completa en SQL Editor cuando se autorice. Exige
00100 a 00500 y la publicación supabase_realtime del proyecto. Confirmar que
pg_publication_tables incluya public.senal_monitoreo_electoral y que
leer_monitoreo_electoral se consulte con JWT de usuario. En un entorno de
prueba, confirmar una dignidad y comprobar el resultado y la mesa pendiente.
Confirmar la segunda y comprobar que se reporte una sola mesa. Corregir
cifras y verificar el total vigente y el historial. Probar reconexión,
salida del panel y cierre de sesión con usuarios de los tres roles.

Verificar Leaflet, atribución, selección y mensaje cuando no se pueda
cargar el mapa en Android real. La descarga autorizada de la fotografía para
RF-15 requiere un endpoint de servidor posterior. La participación porcentual
requiere un padrón oficial por mesa.

## Auditoría de 00600

La publicación debe ser selectiva y tener INSERT y UPDATE habilitados. Si
supabase_realtime ya incluye actas, actas_revisiones, actas_evidencias o
reservas_evidencia, la migración se revierte y pide revisar esa configuración.
00600 no cambia las tablas ya publicadas. Protege la señal contra DELETE y
TRUNCATE porque Postgres Changes no aplica RLS a eventos DELETE.

| ADR | Alcance auditado |
| --- | --- |
| 01 | RLS territorial, lectura con permisos del invocante, historial vigente, votos válidos y señales Realtime. |
| 02 | La consulta emplea las sesiones existentes. El aprovisionamiento queda fuera de 00600. |
| 03 | La consulta consume evidencia confirmada. La cola local y sus reintentos conservan su contrato. |
| 04 | El mapa toma recintos de 2A y ubicación de 00500. La ubicación original se mantiene al corregir cifras. |
| 05 | El repositorio y el hook pueden usar una sola instantánea del servidor. |
| 06 | La rotulación de resultados preliminares y los estados visuales corresponden a la interfaz. |
| 07 | La APK de prueba y la instrumentación Sentry quedan fuera del DDL. |
| 08 | La instalación no depende de cambios en rutas o navegación. |
| 09 | PostgreSQL conserva las validaciones de cifras de 00400 y la app mantiene sus esquemas. |

### Consultas de verificación posteriores

En SQL Editor, comprobar la publicación, RLS, los grants y las funciones.

```sql
select p.puballtables, p.pubinsert, p.pubupdate, pt.schemaname, pt.tablename
from pg_publication p
left join pg_publication_tables pt using (pubname)
where p.pubname = 'supabase_realtime'
order by pt.schemaname, pt.tablename;

select c.relname, c.relrowsecurity, c.reloptions,
       has_table_privilege('anon', c.oid, 'SELECT') as lectura_anon,
       has_table_privilege('authenticated', c.oid, 'SELECT') as lectura_auth,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as escritura_auth
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('actas_confirmadas_monitoreo', 'resultados_preliminares',
                    'mapa_recintos_electoral', 'senal_monitoreo_electoral');

select p.oid::regprocedure as funcion, p.prosecdef as security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as ejecuta_anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as ejecuta_auth,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as ejecuta_servicio
from pg_proc p
where p.oid in (
  to_regprocedure('public.leer_monitoreo_electoral()'),
  to_regprocedure('actaquito_privado.notificar_monitoreo_electoral()')
);
```

Se espera una publicación selectiva, la señal entre sus tablas y ninguna de las
tablas de actas o evidencias mencionadas arriba. La señal debe tener RLS y las
tres vistas security_invoker. Solo authenticated ejecuta la RPC de lectura
entre los roles consultados. El trigger privilegiado tiene search_path vacío
y carece de EXECUTE para los tres roles consultados. Ambas funciones fijan
search_path.

Con una sesión autorizada, usar la RPC desde la app o PostgREST y contrastar su
respuesta con estas consultas en el mismo ámbito. SQL Editor sin contexto de
sesión de usuario comprueba estructura, pero no sustituye la prueba de RLS.

```sql
select dignidad_codigo, actas_confirmadas, votos_validos, blancos, nulos, sufragantes
from public.resultados_preliminares
where recinto_codigo is null
order by dignidad_codigo;

select codigo, parroquia, latitud, longitud, total_mesas, mesas_reportadas, mesas_pendientes
from public.mapa_recintos_electoral
order by codigo;

select public.leer_monitoreo_electoral();
```

Para RF-15 y RF-16, verificar primero una dignidad confirmada, luego ambas y,
por último, una corrección. Comparar la vista con la semilla para los recintos
iniciales y verificar el total de 36 mesas. Probar la recepción WebSocket con
un JWT provincial, uno de recinto ajeno y uno de veedor. La comparación local
de coordenadas verifica su proyección desde la semilla. La aceptación de la
cartografía y del WebView se verifica en Android.
