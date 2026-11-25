# Checklist de pruebas finales de ActaQuito

Este checklist separa lo que puede comprobarse con código local de lo que necesita un teléfono Android o un proyecto Supabase de prueba. Una prueba con mocks no demuestra permisos, correo, Storage, Realtime ni funcionamiento remoto.

## 1. Reglas de seguridad para las pruebas

- [ ] Usar un proyecto y cuentas de **staging** autorizados; no hacer pruebas de escritura en producción.
- [ ] Usar identidades, fotos y cifras ficticias. No pegar JWT, contraseñas ni secretos en capturas o informes.
- [ ] No probar correos enviando invitaciones a personas que no hayan aceptado participar.
- [ ] No ejecutar las suites SQL contra una base real. Los archivos SQL están diseñados para una base PostgreSQL desechable y terminan con `ROLLBACK`.
- [ ] Registrar versión del commit/build, modelo de Android, versión del sistema, rol y resultado observado.

## 2. Estado que debe revalidarse antes de la defensa

En una ejecución local anterior se reportaron TypeScript correcto, Expo Doctor 21/21 y 73 pruebas locales pasando; ESLint quedó en 12 errores y 30 advertencias. El repositorio ha tenido cambios concurrentes desde entonces: estos números son históricos, no un certificado del snapshot que se presentará.

- [ ] En un árbol estable, ejecutar `npx tsc --noEmit`.
- [ ] Ejecutar `npx expo lint` y anotar errores y advertencias, no solo el código de salida.
- [ ] Ejecutar `npx expo-doctor`.
- [ ] Ejecutar las pruebas locales descritas abajo y guardar salida sin datos secretos.
- [ ] No generar el APK hasta revisar fallos de TypeScript y errores de lint que afecten hooks o renderizado.

## 3. Pruebas automáticas locales

Estas pruebas no necesitan un servicio Supabase remoto si se ejecutan según sus comandos locales.

| Suite del repositorio | Qué cubre a nivel local | Límite |
|---|---|---|
| [test-auth.mjs](../scripts/test-auth.mjs) | Reglas de flujo de autenticación presentes en el dominio. | No valida credenciales ni enlaces de correo reales. |
| [test-actas.mjs](../scripts/test-actas.mjs) | Esquema y reglas de cifras del acta. | No valida rechazo por restricciones del servidor remoto. |
| [test-evidencia-actas.mjs](../scripts/test-evidencia-actas.mjs) | Cálculo y decisiones de evidencia en lógica aislada. | No calibra cámara ni GPS en Android real. |
| [test-sincronizacion-actas.mjs](../scripts/test-sincronizacion-actas.mjs) | Estados y reintentos de la cola simulada. | No demuestra persistencia tras reinicio ni envío real. |
| [test-monitoreo-electoral.mjs](../scripts/test-monitoreo-electoral.mjs) | Reglas locales para datos de monitoreo. | No prueba el canal Realtime de Supabase. |
| [test-dashboard-provincial.mjs](../scripts/test-dashboard-provincial.mjs) | Lógica de datos del dashboard. | No prueba WebView, teselas ni interacción en teléfono. |
| [test-integracion-actaquito.mjs](../scripts/test-integracion-actaquito.mjs) | Integración de módulos con dependencias simuladas. | No prueba la integración de servicios reales. |
| [test-telemetria-privacidad.mjs](../scripts/test-telemetria-privacidad.mjs) | Sanitización de eventos antes de Sentry. | No prueba envío a Sentry ni cierre nativo. |
| [invitaciones.test.mjs](../supabase/tests/invitaciones.test.mjs) | Funciones de invitación con cliente/RPC simulados. | No prueba Gmail SMTP, JWT real ni Edge Function desplegada. |
| [envio-evidencia.test.mts](../supabase/tests/envio-evidencia.test.mts), [jwt-edge.test.mts](../supabase/tests/jwt-edge.test.mts) y pruebas de descarga | Casos de envío, autorización y descarga mediante dobles de prueba. | No prueba Storage, credenciales ni red remota. |

Comandos reportados en la revisión anterior:

```powershell
node --test scripts/test-auth.mjs scripts/test-actas.mjs scripts/test-evidencia-actas.mjs scripts/test-sincronizacion-actas.mjs scripts/test-monitoreo-electoral.mjs scripts/test-dashboard-provincial.mjs scripts/test-integracion-actaquito.mjs scripts/test-telemetria-privacidad.mjs
node --experimental-vm-modules --test supabase/tests/invitaciones.test.mjs
deno test --cached-only --no-check --no-lock supabase/tests/envio-evidencia.test.mts supabase/tests/jwt-edge.test.mts supabase/functions/_shared/descarga-evidencia.test.mts
```

No instalar paquetes para esta lista sin autorización.

## 4. Smoke test de navegación — Expo Go

Expo Go es apropiado para un primer recorrido de UI y navegación cuando los módulos usados están disponibles en la versión de Expo Go correspondiente. El APK de desarrollo/preview es necesario para validar la configuración nativa final y permisos reales. No tratar una sesión de Expo Go como prueba de APK.

- [ ] Abrir la ruta raíz `/` desde un arranque limpio.
- [ ] Confirmar que no aparece “Unmatched Route”.
- [ ] Sin sesión, comprobar que se muestra autenticación.
- [ ] Iniciar sesión con cada rol de staging y comprobar su ruta inicial canónica: provincial, recinto y veedor.
- [ ] Confirmar que una cuenta no puede abrir visualmente las pestañas de otro rol.
- [ ] Cerrar sesión y comprobar que la app vuelve al acceso.
- [ ] Verificar el enlace de confirmación/recuperación solo con enlaces emitidos para cuentas de prueba.
- [ ] Comprobar que errores de red no se convierten en una pantalla vacía ni en una confirmación falsa.

**No basta:** que Expo Router o `Stack.Protected` oculte una ruta. La autorización se prueba también en el servidor con JWT reales.

## 5. Recorrido funcional con Android APK

Instalar el APK de `preview` en un dispositivo real de prueba. El perfil actual declara distribución interna y `buildType: apk` en [eas.json](../eas.json); la generación debe ejecutarse por el responsable en el flujo autorizado de EAS.

### Acceso y jerarquía

- [ ] Provincial: iniciar sesión y revisar recinto, cantón/parroquia y coordinador asignado.
- [ ] Crear un coordinador de recinto de prueba, confirmar que llega el correo, abrir el enlace en Android y definir su contraseña.
- [ ] Recinto: iniciar sesión con la cuenta activada.
- [ ] Invitar un veedor de prueba y completar confirmación/activación.
- [ ] Asignar el veedor a una JRV del mismo recinto y comprobar el acceso a esa mesa.
- [ ] Confirmar desde una segunda sesión/rol que el veedor no puede operar fuera de su asignación.
- [ ] Probar reemplazo de veedor solo cuando la UI esté implementada; verificar que la asignación anterior termina y queda trazabilidad.

**Bloqueo conocido:** la RPC `asignar_veedor` existe, pero en la pantalla de recinto revisada solo se muestra la asignación; no se encontró acción de asignar/reemplazar conectada. No marcar este paso como aprobado hasta que Antigravity integre la interfaz.

### Actas y validación

- [ ] Abrir una mesa asignada y registrar Alcaldía con las cinco candidaturas.
- [ ] Probar un campo vacío, decimal, negativo y una cifra mayor que sufragantes; el formulario debe impedir continuar con mensaje entendible.
- [ ] Probar una suma incorrecta; debe impedir enviar.
- [ ] Corregir la suma y guardar borrador.
- [ ] Repetir para Prefectura.
- [ ] Confirmar que no se crea una segunda acta al tocar dos veces ni al reintentar.

### Foto y GPS

- [ ] Denegar permiso de cámara: se informa el motivo y no se simula una foto.
- [ ] Permitir cámara, tomar foto, ver previsualización y repetir.
- [ ] Probar una foto nítida y otra deliberadamente borrosa; anotar falsos rechazos/aceptaciones para calibrar el umbral.
- [ ] Denegar GPS: el acta debe quedar como borrador, no enviar.
- [ ] Permitir GPS preciso y medir en el recinto; registrar precisión y hora.
- [ ] Probar lectura fuera del margen e imprecisa. Confirmar el mensaje y que la ubicación fuera de margen se marca para revisión.
- [ ] Comprobar que el margen aplicado viene de la configuración del recinto/cantón (200 m iniciales según S-08), no asumir que es un valor fijo.

### Offline y reanudación

- [ ] Con sesión y catálogo previamente cargados, activar modo avión.
- [ ] Completar o editar un acta y guardar; forzar cierre de la app y abrir nuevamente.
- [ ] Confirmar que el borrador y la evidencia persisten y que el estado sigue pendiente.
- [ ] Desactivar modo avión y esperar sincronización.
- [ ] Comprobar una sola operación confirmada en el servidor, con el mismo UUID y sin pérdida de foto/GPS.
- [ ] Probar sesión expirada y recuperación de conexión; el usuario debe recibir un estado y acción clara.
- [ ] Comprobar que no se borran pendientes al cerrar sesión y que la limpieza de datos no elimina una operación sin confirmar.

No marcar offline completo por probar un mock en Node. Se requiere dispositivo, reinicio de app y conectividad controlada.

## 6. Pruebas Supabase staging con JWT reales

Usar cuentas reales de prueba para cada rol y observar tanto la interfaz como las respuestas protegidas. Nunca usar `service_role` desde la app.

- [ ] Iniciar sesión con cada rol y verificar que el JWT corresponde al usuario esperado.
- [ ] Provincial puede consultar su ámbito; coordinador solo su recinto; veedor solo sus actas asignadas.
- [ ] Intentar leer datos de otro recinto y ejecutar una RPC no autorizada; el servidor debe denegar aunque se invoque fuera de la UI.
- [ ] Verificar invitación, activación por correo y cambio de contraseña con SMTP real de staging.
- [ ] Enviar JPEG de prueba y confirmar la operación; la ruta no debe ser pública.
- [ ] Sin permisos, intentar descargar una foto de otra acta: debe denegarse.
- [ ] Verificar que la descarga autorizada sirve la imagen y que la huella/metadata corresponden a la evidencia.
- [ ] Confirmar que el canal Realtime notifica al rol autorizado y que la carga posterior vuelve a consultar el RPC.
- [ ] Confirmar que no se envían votos, datos de persona ni foto en el payload de la señal territorial.
- [ ] Consultar resultados y porcentajes para Alcaldía y Prefectura; comprobar que aparecen como preliminares.
- [ ] Verificar mapa, coordenadas, mesas pendientes/reportadas y distancia desde un Android conectado.

El equipo informa que las migraciones 00100–00700 y tres Edge Functions se aplicaron/desplegaron. Anotar la fecha y evidencia del entorno usado: el repositorio por sí solo no prueba ese estado remoto.

## 7. Pruebas SQL en base desechable

Las suites SQL están en [supabase/tests](../supabase/tests/). Se deben correr únicamente contra una base local desechable que incluya Auth y Storage simulados, tras confirmar que la URL y credenciales no apuntan a un proyecto remoto.

- [ ] `actas.sql`: restricciones y operaciones de actas.
- [ ] `evidencia.sql`: reserva/confirmación y permisos de evidencias.
- [ ] `fase_2b.sql`: reglas de la fase indicada por la suite.
- [ ] `dashboard_provincial.sql`: alcance del dashboard.
- [ ] `monitoreo.sql`: vistas, señal y RLS de resultados/mapa.
- [ ] `correcciones_gps.sql`: UUID, idempotencia, ubicación de corrección, historial inmutable, permisos y aislamiento territorial.
- [ ] Confirmar que cada suite termina con rollback y guardar resultado de la base desechable.

Estas suites ejercitan contratos de PostgreSQL con JWT de prueba simulados; no reemplazan la prueba con JWT reales del apartado anterior.

## 8. Correcciones e historial — condición de aprobación

- [ ] Confirmar que el coordinador de recinto puede abrir el detalle de un acta de su recinto.
- [ ] Confirmar que el veedor puede corregir únicamente un acta propia/autorizada.
- [ ] Capturar GPS en la corrección y guardar hora/precisión.
- [ ] Corregir cifras dos veces y comprobar versiones, actor, valores anteriores/nuevos y ubicaciones.
- [ ] Intentar alterar/eliminar una revisión por un rol de cliente: el servidor debe denegar.
- [ ] Reintentar una misma corrección con el mismo UUID: no debe duplicar revisión.
- [ ] Probar el flujo de corrección offline y sincronización.
- [ ] Abrir el detalle, descargar foto, ampliarla, cerrar y confirmar que no queda visible en otra acta.

**Estado a la fecha de inspección:** migración, RPC y repositorio están presentes; la pantalla de detalle se encuentra en un componente que no se vio montado desde la pantalla de actas, y no se encontró un flujo UI que encole correcciones. Mantener este bloque como **pendiente** hasta comprobar la integración en el APK.

## 9. APK, accesibilidad y telemetría

- [ ] Instalar el APK en al menos un Android real y probar cámara, GPS, almacenamiento, navegación, teclado numérico, enlaces y modo avión.
- [ ] Probar en pantalla pequeña y, si está disponible, en un dispositivo de gama baja.
- [ ] Revisar botones, estados de carga, éxito, error y mensajes; todos deben ejecutar una acción real o estar claramente deshabilitados.
- [ ] Confirmar que EAS genera un APK instalable y que la instalación/actualización se documenta.
- [ ] Verificar DSN de Sentry solo en el entorno de build autorizado y enviar un error controlado de prueba.
- [ ] No declarar “cierres nativos capturados”: `enableNativeCrashHandling` está desactivado actualmente en `src/telemetria.ts`.
- [ ] No habilitar captura nativa solo para la demostración sin revisar privacidad y consentimiento.
- [ ] Confirmar que el evento no contiene cédula, correo, cifras, foto, GPS exacto ni breadcrumbs privados.

## 10. Aprobación antes de defensa

No declarar lista la presentación mientras alguno de estos puntos críticos esté pendiente:

- [ ] La app arranca desde `/` y las tres rutas por rol funcionan en el APK.
- [ ] El registro de ambas dignidades valida cifras y no duplica envíos.
- [ ] Cámara y GPS se probaron en el dispositivo final.
- [ ] Se demostró persistencia offline tras cierre forzado y sincronización sin duplicados.
- [ ] RLS y Storage se probaron con JWT reales en staging.
- [ ] El mapa y Realtime se probaron conectados.
- [ ] El equipo explica con honestidad que la asignación JRV, corrección/historial y fotografía ampliable siguen parciales si su UI no está integrada.
- [ ] Se comparte únicamente evidencia de cuentas y datos de prueba, sin secretos ni datos personales reales.

