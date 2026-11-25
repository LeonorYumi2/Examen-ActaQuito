# Guía de defensa de ActaQuito

Guía de estudio basada en el código y los documentos del repositorio. La referencia acordada es el [consolidado de requerimientos](../consolidado_requerimientos.md) y los [nueve ADR](./adr/).

## 1. Qué problema resuelve

ActaQuito ayuda a una organización política a organizar veedores por recinto y mesa, registrar las actas de Alcaldía y Prefectura, guardar la fotografía y ubicación de cada registro, y consultar el avance y resultados preliminares. También contempla trabajar sin conexión y enviar después las capturas pendientes.

Los resultados son **preliminares**: se calculan con las actas recibidas por el servidor y no reemplazan los resultados oficiales del CNE. El alcance territorial y los datos de demostración se describen en los [supuestos](./supuestos.md).

## 2. Cómo está organizada

El proyecto se organiza por funcionalidad y capas, como propone el ADR-05:

- **Presentación:** pantallas y componentes React Native. Las rutas viven en `src/app/` y delegan en pantallas de cada funcionalidad.
- **Dominio:** reglas y tipos de negocio, por ejemplo, validar las cifras de un acta y evaluar una ubicación GPS.
- **Datos:** adaptadores que guardan en SQLite o consultan Supabase mediante repositorios y RPC.

Flujo típico:

1. El veedor completa el formulario en [RegistroActasScreen.tsx](../src/features/actas/presentation/RegistroActasScreen.tsx).
2. React Hook Form y Zod conectan la pantalla con el esquema de [registro.ts](../src/features/actas/domain/registro.ts).
3. La lógica decide si guardar un borrador local o encolar un envío.
4. [borradores-locales.ts](../src/features/actas/data/borradores-locales.ts) persiste el contenido cifrado en SQLite; el procesador de [enviar-borrador.ts](../src/features/actas/data/enviar-borrador.ts) administra la cola.
5. Cuando corresponde, los repositorios llaman a Supabase y a las Edge Functions; el servidor vuelve a validar permisos y datos.

No todas las funcionalidades tienen el mismo nivel de integración. La separación por carpetas es visible, pero un archivo organizado en capas no demuestra por sí solo que el flujo esté terminado o probado.

## 3. Roles y asignaciones

| Rol | Responsabilidad prevista | Evidencia y límite actual |
|---|---|---|
| Coordinador provincial | Administra recintos y asigna coordinadores de recinto; consulta seguimiento territorial y resultados. | El servidor contiene `asignar_coordinador` y las pantallas provinciales consultan el monitoreo. Requiere validar en staging la asignación y el alcance RLS. |
| Coordinador de recinto | Invita veedores y debe asignarlos a mesas de su recinto; revisa las actas del recinto. | El RPC `asignar_veedor` valida rol, recinto, mesa y cuenta activa. La pantalla actual muestra quién está asignado, pero no se encontró una acción conectada para asignar o reemplazar; esa parte está en implementación. |
| Veedor | Registra Alcaldía y Prefectura para sus mesas asignadas. | La captura local y la sincronización inicial restringen el envío al rol veedor. La disponibilidad real depende de una asignación vigente y de permisos del servidor. |

El RPC de asignación de veedor cierra la asignación anterior y registra el reemplazo cuando corresponde. No presentar esa regla de base de datos como una pantalla terminada: el flujo visual de asignación aún debe conectarse y probarse.

La navegación y `Stack.Protected` separan rutas por rol en [\_layout.tsx](../src/app/_layout.tsx); los destinos canónicos están en [routes.ts](../src/features/auth/presentation/routes.ts). La navegación mejora la experiencia, pero **no sustituye RLS**.

## 4. Registro de un acta

El formulario registra cinco candidaturas, votos blancos, nulos y total de sufragantes. El dominio exige enteros no negativos, que ningún valor individual exceda el total y que la suma de votos, blancos y nulos sea igual al total. Se valida en la app; el servidor debe aplicar su propia validación como segunda barrera.

Para el veedor, el flujo contempla:

1. Elegir mesa y dignidad.
2. Guardar un borrador mientras se completa.
3. Tomar la foto desde la cámara de la aplicación.
4. Obtener GPS y guardar su precisión y hora de captura.
5. Enviar o dejar el registro pendiente para sincronización.

El botón de envío exige una foto y una lectura GPS utilizable. Una ubicación **fuera** del margen no se rechaza automáticamente: queda señalada para revisión. Una lectura imprecisa no permite enviar; se puede conservar el borrador local y volver a medir.

## 5. Foto, GPS y mapa

La captura usa `CameraView`. La imagen se reduce para medir nitidez con varianza del Laplaciano y luego se comprime como JPEG. El umbral actual es 120 y el propio código indica que debe calibrarse con actas físicas y dispositivos reales. Ver [evidencia.ts](../src/features/actas/domain/evidencia.ts), [captura-nativa.ts](../src/features/actas/data/captura-nativa.ts) y [CapturaEvidencia.tsx](../src/features/actas/presentation/components/CapturaEvidencia.tsx).

La ubicación se calcula con distancia Haversine respecto al recinto. El margen viene de `configuracion_captura`; el supuesto S-08 fija 200 m como valor inicial configurable, no como constante universal. Se descartan lecturas GPS simuladas, inválidas o sin precisión utilizable. Cámara y GPS requieren pruebas en Android; una prueba de lógica no valida permisos, calidad fotográfica ni precisión en interiores.

El panel provincial usa Leaflet y teselas de OpenStreetMap dentro de un WebView, con atribución. Necesita conectividad para cargar librería y teselas. Su integración visible debe verificarse en el APK y con la configuración del mapa vigente; no se debe afirmar que fue probado por el mero hecho de que exista el HTML.

## 6. SQLite, cifrado y sincronización

El ADR-03 define SQLite, una outbox y UUID para reintentos sin duplicar operaciones. El código cifra el contenido de borradores y colas con AES a través de Expo Crypto y guarda la llave en SecureStore. La tabla SQLite conserva también una columna `identidad` usada como clave; esa identidad no es el BLOB cifrado. Conviene tener presente esta diferencia al explicar qué dato queda cifrado.

NetInfo y el estado de la aplicación activan el procesador cuando hay conexión y sesión válida. Los envíos conservan el UUID y guardan estado de progreso, error o intervención. El catálogo se precarga para el flujo offline previsto.

La lógica y sus pruebas simuladas no demuestran durabilidad en un teléfono. Para defenderlo hay que mostrar: guardar, cerrar forzosamente la app, reiniciar, abrir en modo avión, comprobar que el borrador sigue, reconectar y observar una sola confirmación. También se debe comprobar qué datos quedan disponibles sin señal; no todas las tareas administrativas están diseñadas para modo offline.

## 7. Seguridad, invitaciones y evidencia remota

- **Auth e invitaciones:** el diseño evita el autorregistro; el responsable invita y la persona confirma su correo y define su contraseña. La Edge Function de invitación valida el JWT y el método de autenticación. La configuración SMTP y el envío real deben comprobarse en un entorno autorizado; no se incluyen credenciales en esta guía.
- **RLS y roles:** PostgreSQL debe ser la autoridad para permisos por usuario, rol y territorio. Las rutas protegidas del cliente no son un control de seguridad suficiente.
- **Edge Functions:** el repositorio contiene `invitar-usuario`, `enviar-evidencia-acta` y `descargar-evidencia-acta`. El equipo informó que están desplegadas, pero esta documentación no verificó endpoints ni configuración remota.
- **Storage:** el bucket `actas-evidencia` está diseñado para ser privado. El envío reserva la operación, carga la imagen y confirma la huella en el servidor; la descarga pasa por una función que valida la sesión y el acceso.
- **JWT:** las pruebas con JWT simulados no sustituyen una prueba de cada rol con tokens reales en staging.

Las migraciones documentan la intención del servidor. La afirmación de que las migraciones 00100–00700 están aplicadas es información comunicada por el equipo, no una verificación del estado remoto.

## 8. Resultados, Realtime y correcciones

La migración de monitoreo crea vistas de resultados preliminares y una señal territorial para Realtime. La señal notifica que hay cambios; el cliente vuelve a consultar el RPC de monitoreo, en vez de publicar cifras o fotografías directamente en el evento. Al volver la app a primer plano se contempla refrescar la consulta. Véanse [la migración de monitoreo](../supabase/migrations/20261125000600_resultados_realtime_y_mapa.sql), [useSeguimientoElectoral.ts](../src/features/monitoreo/presentation/hooks/useSeguimientoElectoral.ts) y [repositorio-monitoreo-electoral.ts](../src/features/monitoreo/data/repositorio-monitoreo-electoral.ts).

Para correcciones, el código de datos incluye captura GPS, cola local, RPC y lectura de historial. La migración 00700 conserva revisiones y ubicación de cada corrección. Sin embargo, en el snapshot revisado, la pantalla de actas importa `DetalleActaModal` pero no lo representa; tampoco se encontró un consumidor visual conectado a la acción de encolar correcciones. Por eso:

- **RF-12 es parcial:** hay piezas de servidor y datos para corrección con GPS e historial, pero el recorrido de usuario no está integrado.
- **RF-15 es parcial:** el modal aislado contiene vista de detalle e imagen ampliable, pero no está conectado a una acción de la pantalla en el código revisado. La ampliación no se debe presentar como una función disponible en la app hasta conectarla y probarla.

Referencias: [migración de correcciones](../supabase/migrations/20261125000700_correcciones_gps_e_historial.sql), [repositorio-detalle-acta.ts](../src/features/actas/data/repositorio-detalle-acta.ts), [RegistroActasScreen.tsx](../src/features/actas/presentation/RegistroActasScreen.tsx) y [DetalleActaModal.tsx](../src/features/actas/presentation/components/DetalleActaModal.tsx).

## 9. Qué está completo, parcial o pendiente

Estos estados describen la evidencia inspeccionada, no una certificación de producción.

| Área | Estado estricto | Qué se puede decir en la defensa |
|---|---|---|
| Validación de cifras y formularios | Implementada en el dominio y presentación; las pruebas locales cubren lógica. | “La app comprueba la suma y los topes; el servidor debe repetir las reglas.” |
| Foto y GPS de captura | Implementación en código; calibración y Android pendientes. | “El flujo está implementado, pero falta demostrarlo en el dispositivo final.” |
| SQLite cifrado y outbox | Lógica implementada y suites locales simuladas; prueba de persistencia real pendiente. | “Hay una cola local cifrada para el contenido; no voy a afirmar que el ciclo Android ya está validado.” |
| Invitaciones y activación | Código y Edge Functions en el repositorio; correo/JWT remoto no verificados aquí. | “El proyecto informa despliegue; falta evidencia de un flujo real de staging.” |
| Asignación JRV | RPC y lectura de asignaciones existen; acción de asignación UI no se encontró en pantalla. | “La regla del servidor existe; la interfaz de asignación está pendiente.” |
| Resultados y mapa | Código de vistas, RPC, Realtime y WebView; dependencias remotas y dispositivo pendientes. | “La integración está desarrollada, pero requiere prueba con sesión real, conexión y Android.” |
| Corrección e historial GPS | Migración y repositorio; flujo UI no conectado. | “La base está preparada, no presentar como recorrido funcional completo.” |
| Fotografía ampliable | Componente de detalle tiene la vista; no se encontró montado. | “La UI está aislada; RF-15 sigue parcial.” |
| ADR-06 | Reanimated presente; Lottie en uso limitado; Uniwind/Tailwind no están integrados. | “Cumplimiento parcial: falta Uniwind y comprobar retroalimentación de carga, éxito y error.” |
| APK y Sentry | Perfil EAS `preview` produce APK; Sentry está en el código, pero la captura nativa está desactivada. | “Existe configuración de build; falta probar APK, DSN y reporte extremo a extremo.” |

## 10. Los nueve ADR en palabras sencillas

1. **[ADR-01](./adr/ADR-01-backend-supabase.md): Supabase, seguridad, historial y tiempo real.** La base de datos valida permisos y reglas; el historial no se sobrescribe y Realtime avisa al panel.
2. **[ADR-02](./adr/ADR-02-cuentas-gmail-smtp.md): cuentas e invitaciones por correo.** No hay autorregistro; la persona invitada verifica el correo y crea su contraseña.
3. **[ADR-03](./adr/ADR-03-offline-sqlite.md): trabajo sin conexión.** SQLite, cifrado, outbox y UUID permiten guardar y reintentar sin duplicar.
4. **[ADR-04](./adr/ADR-04-evidencia-camara-gps-mapa.md): cámara, GPS y mapa.** La app captura foto, mide ubicación y usa Leaflet/OpenStreetMap para el panel.
5. **[ADR-05](./adr/ADR-05-arquitectura-limpia-estado.md): Clean Architecture y estado.** Se separan reglas de negocio, acceso a datos y presentación.
6. **[ADR-06](./adr/ADR-06-interfaz-uniwind-lottie-reanimated.md): interfaz y animación.** La decisión aprobada pide Uniwind, Lottie y Reanimated; el cumplimiento observado es parcial porque falta Uniwind.
7. **[ADR-07](./adr/ADR-07-plataforma-apk-sentry.md): APK y telemetría.** Se eligió EAS Build y Sentry; el perfil APK existe, pero falta validar el build y la captura nativa está desactivada.
8. **[ADR-08](./adr/ADR-08-navegacion-expo-router.md): navegación por archivos.** Expo Router separa pantallas por rol y enlaza autenticación; RLS sigue siendo la protección real.
9. **[ADR-09](./adr/ADR-09-formularios-react-hook-form-zod.md): formularios y reglas.** React Hook Form y Zod validan datos y muestran errores comprensibles.

## 11. Recorrido de demostración honesto

Preparar cuentas y datos ficticios en un entorno de staging, no en producción. Tener red, cámara y ubicación habilitadas; comprobar antes que el APK abre y que las cuentas pueden iniciar sesión.

1. Iniciar sesión como coordinador provincial y mostrar su ámbito territorial.
2. Mostrar la asignación de un coordinador de recinto, solo si ya está preparada y se validó con JWT real.
3. Iniciar sesión como coordinador de recinto y mostrar veedores y estado de mesas. Si la acción de asignar JRV sigue sin interfaz, explicarlo; no simular un botón funcional.
4. Mostrar invitación y activación de un veedor solo si el correo de prueba llega y el usuario completa la verificación.
5. Iniciar sesión como veedor asignado y abrir una mesa.
6. Registrar un acta de Alcaldía con cifras de prueba que sumen correctamente; mostrar el rechazo de una suma incorrecta.
7. Repetir para Prefectura si el tiempo lo permite.
8. Tomar foto y GPS en el dispositivo de prueba; mostrar el estado de evidencia y explicar que las pruebas del umbral requieren calibración.
9. Probar el guardado offline y la sincronización solo si se verificó previamente el modo avión y el reinicio del APK.
10. Volver al panel provincial para mostrar resultados y mapa si el entorno remoto y Realtime están disponibles.
11. Para historial, corrección GPS y ampliación de foto, explicar el estado parcial salvo que la UI haya sido integrada y probada antes de la defensa.

## 12. Preguntas probables del profesor

1. **¿Qué problema resuelve la app?** Organiza los roles territoriales y registra actas con evidencia para dar seguimiento al escrutinio interno.
2. **¿Los resultados son oficiales?** No. Son preliminares y dependen de las actas recibidas; no reemplazan al CNE.
3. **¿Qué significa Clean Architecture aquí?** Las reglas, como validar cifras, viven en el dominio; los repositorios conectan con SQLite o Supabase; las pantallas presentan el flujo.
4. **¿Cómo se guarda un acta?** La pantalla valida con Zod, luego guarda un borrador local o llama al servidor mediante el repositorio.
5. **¿Qué diferencia hay entre los tres roles?** El provincial administra el territorio y ve el panel; recinto administra su recinto; el veedor registra actas de sus mesas.
6. **¿Cómo evitan el autorregistro?** El modelo usa invitaciones jerárquicas; la cuenta se activa con verificación de correo y contraseña definida por su titular.
7. **¿Expo Router protege los datos?** No por sí solo. Es una protección de navegación; las políticas RLS y las funciones del servidor deben autorizar cada operación.
8. **¿Cómo se valida el acta?** Cada cifra debe ser entera y no negativa, no exceder sufragantes, y la suma de votos, blancos y nulos debe coincidir con el total.
9. **¿Qué pasa sin internet?** La captura prevista se guarda cifrada en SQLite y queda en la outbox para reintento; administración y panel requieren conexión.
10. **¿Cómo evitan duplicar un envío?** Se conserva un UUID de operación y se reutiliza en reintentos; el servidor aplica restricciones e idempotencia.
11. **¿Cómo verifican la ubicación?** Se compara la distancia Haversine con el margen configurado del recinto y se guarda precisión y hora de captura.
12. **¿Qué ocurre si está fuera del margen?** El código la marca para revisión; el supuesto no indica que se rechace automáticamente.
13. **¿Cómo funciona Realtime?** El servidor publica una señal territorial; el cliente vuelve a consultar el monitoreo autorizado.
14. **¿Cómo se conserva el historial?** La migración añade RPC y revisiones con valores anteriores/nuevos y GPS de corrección; la integración visual todavía debe terminarse.
15. **¿Qué falta demostrar antes de entregar?** Asignación JRV desde UI, corrección/historial integrado, fotografía ampliable integrada, pruebas JWT/RLS remotas y el flujo Android en el APK final.

