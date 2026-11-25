# Sincronización offline de actas

El servicio arranca desde src/bootstrap.ts. NetInfo y el estado de la app
despiertan la cola cuando hay una cuenta operativa y la app está en primer plano.
Cada solicitud autenticada usa el JWT verificado para la misma cuenta. Las RPC y
la Edge Function conservan la comprobación de asignación y de alcance del servidor.

## Conexión de la interfaz

Llamar los contratos de src/features/actas/data/enviar-borrador.ts con el usuario
de la sesión, la mesa y la dignidad. La pantalla actual bloquea el registro offline.
Sustituir esa salida por el registro con catálogo local cuando el usuario tiene
acceso operativo offline y precarga disponible. Mantener los paneles y la
administración sujetos a conexión según S-11.

- cargarCatalogoOffline(usuario) devuelve mesas, candidaturas en orden,
  organizaciones con color cuando está disponible, coordenadas del recinto,
  margen y últimas cifras de las actas visibles al precargar.
- cargarRegistroOffline(referencia) abre la combinación guardada de esa mesa y
  dignidad. Si no hay catálogo autorizado en el teléfono, pedir al usuario que
  vuelva a conectarse para precargar. Conectar una vez antes de la jornada.
- guardarCapturaLocal(referencia, borrador) guarda la captura aunque haya campos
  vacíos. Mantener estable el UUID del acta y persistir foto y ubicación conforme
  se capturan. Al recuperar la pantalla, reutilizar el UUID y la foto guardados.
- encolarBorradorLocal(referencia, siglas) prepara el envío de la última captura
  guardada, con las cinco siglas de esa dignidad. Es la acción explícita de
  envío, funciona también en modo avión y devuelve un estado local. Sin foto o
  GPS utilizable, conservar el borrador y pedir la evidencia antes de encolar.
  Una medición válida fuera del margen puede avanzar al control del servidor.
- enviarBorradorLocal conserva el contrato de confirmación del primer envío.
  Si queda pendiente, usar el estado persistido sin mostrarlo como enviado.
- detalleSincronizacionBorrador y suscribirSincronizacionBorrador permiten
  renderizar pendiente, sincronizando, sincronizado, rechazado y
  requiere-intervencion. Leer de nuevo tras un evento. Tras reiniciar, un
  sincronizando interrumpido se muestra como pendiente hasta que se recupere.
- encolarCorreccionActa(referencia, actaId, campos, siglas) prepara una revisión
  de un acta conocida. Consultar estadoCorreccionActa y usar la misma suscripción.
  El coordinador corrige con las cifras descargadas de su recinto. La corrección
  añade una revisión vía 00400 y preserva la evidencia original.
- reactivarEnvioBorrador(referencia, tipo) permite retomar tras recuperar la
  sesión o agotar el presupuesto de reintentos. Los rechazos de alcance y los
  conflictos de identidad del acta necesitan revisión por el operador.
- useConexionActas y contarEnviosPendientes permiten presentar conectividad y
  pendientes. Para el avance oficial, consultar mesas_actas_reportadas.
  Un recibo de acta individual o de corrección no declara reportada la mesa.

## Garantías y validaciones pendientes

La captura encolada es una instantánea cifrada distinta del borrador editable.
Se congela antes de cualquier llamada de red. Los reintentos reutilizan los UUID,
la revisión, las cifras, el JPEG y la ubicación de esa instantánea. Si se pierde
la respuesta del servidor, 00400 y 00500 permiten repetir la misma operación.
Un UUID de acta distinto para una mesa y dignidad ya ocupadas pide intervención.
Si la misma acta recibe correcciones, la última versión recibida por el servidor
prevalece y el trigger conserva las anteriores.

El servicio se reanuda al volver a primer plano o abrir la app. Android debe
probarse en modo avión, cierre forzado, recuperación de foto y catálogo,
reconexión, cambio de cuenta, revocación y pérdida de red durante ambos pasos.
Al cerrar sesión se purga el catálogo y las capturas confirmadas sin edición
pendiente. Los borradores y las operaciones no confirmadas quedan cifrados para
la cuenta original. Los UUID y los estados se conservan al cerrar el proceso.

Quedan pendientes la conexión visual, las pruebas con Android y Supabase reales,
la conciliación de un UUID de acta diferente entre dos dispositivos y la
sustitución asistida de una toma con rechazo definitivo. 00400 registra quién y
cuándo corrigió, pero no admite la ubicación propia de la corrección exigida por
RF-12. Implementarla requiere un cambio posterior en el backend. Esta fase
preserva la ubicación original al corregir cifras.
