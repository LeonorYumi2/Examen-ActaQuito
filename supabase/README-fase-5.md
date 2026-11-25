# Backend de evidencia de actas

La migración 00500 requiere 00100 a 00400 y Storage de Supabase. Crea el bucket privado
actas-evidencia, las reservas internas, el registro inmutable de evidencia recibida y la vista
mesas_actas_reportadas. Las migraciones anteriores conservan sus contratos y sus objetos.

## Protocolo para el servicio de envío pendiente

1. Validar la sesión del usuario y operar con su JWT al llamar guardar_borrador_acta
   y reservar_evidencia_acta. Conservar el UUID del acta, el UUID de la operación de
   cifras, la versión devuelta y el UUID independiente de la evidencia en la futura
   cola local. Una reserva corresponde a una revisión que escribió el veedor titular
   y cuya mesa sigue asignada. La reserva compara todos los datos ante un reintento.
2. Calcular SHA-256 de los bytes JPEG de la toma y reservar con esa huella, latitud,
   longitud, precisión y ambas horas de captura. El servidor obtiene mesa, dignidad
   y autor del acta y recalcula Haversine con el margen del cantón. Conserva la
   distancia y el margen usados al reservar. Una ubicación fuera del margen queda
   marcada para revisión. Las horas del dispositivo sirven como dato de captura.
3. Cargar y leer el objeto exclusivamente mediante la API de Storage y con una
   credencial de servidor. La ruta se toma de la reserva, nunca de un valor libre
   de la petición. Utilizar carga sin sobrescritura. Si la ruta ya existe, leer y
   comprobar sus bytes. Validar el JPEG real, sus límites de tamaño y decodificación,
   y calcular de nuevo SHA-256 a partir del objeto almacenado. Los metadatos MIME
   sirven como control adicional. El servicio debe autenticar al remitente antes
   de cargar y mantener el secreto administrativo fuera de la aplicación móvil.
4. Solo entonces llamar confirmar_evidencia_acta desde el servidor. Comprueba el
   vínculo, la huella, la existencia del objeto y la asignación actual. En reintentos
   ya confirmados devuelve el identificador original. La reserva sola no acredita
   la recepción. La prueba territorial comprueba la distancia declarada a partir
   de los datos recibidos. El origen físico de un GPS de teléfono no queda atestado.
5. Leer el avance con mesas_actas_reportadas. Hay una fila por mesa visible al
   usuario únicamente cuando ambas dignidades tienen evidencia confirmada. El campo
   estado de actas pertenece al contrato anterior de borradores. La señal de
   recepción de evidencia es la existencia de actas_evidencias.

El servicio de carga, la validación de bytes y el endpoint de descarga siguen
pendientes. La política restrictiva de Storage mantiene bloqueados los accesos
directos de los JWT móviles. Para entregar una URL de lectura de vida corta,
primero comprobar el acceso al acta con el JWT del solicitante y obtener la ruta
confirmada de la fila autorizada. Conservar todas las fotos confirmadas sin
sobrescribirlas ni borrarlas. El flujo futuro de sustitución de foto necesita una
ruta nueva y su propio historial. La corrección de cifras de 00400 conserva la foto,
la ubicación y la referencia a la versión original.

Una nueva toma previa a la confirmación usa otro UUID. El servicio futuro debe
limitar peticiones y limpiar reservas y objetos abandonados sin afectar evidencia
confirmada. El envío definitivo también requiere probar conflictos offline, deduplicar
reintentos con sus UUID persistidos y conciliar actas locales con borradores previos
del servidor.

## Prueba y aplicación

Ejecutar supabase/tests/evidencia.sql con psql en una instancia desechable con
00100 a 00500 y la semilla de catálogos. El script simula Auth y escribe filas
ficticias de Storage dentro de una transacción que termina con ROLLBACK. La prueba
del objeto real mediante Storage API y las sesiones Auth reales debe realizarse
por separado.

Cuando se autorice la aplicación, ejecutar el archivo completo
migrations/20261125000500_preparar_storage_evidencia.sql una vez desde SQL Editor
en el proyecto con 00100 a 00400. Verificar el bucket privado, las políticas y
que mesas_actas_reportadas esté vacía antes de confirmar la primera evidencia.
