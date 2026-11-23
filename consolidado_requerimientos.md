# Documento consolidado de requerimientos y decisiones técnicas
## Examen I - Desarrollo de Aplicaciones Móviles
### Control Electoral para Organización Política

---

## Datos del equipo

| Dato | Detalle |
| :--- | :--- |
| **Integrante 1** | Carlos Sebastián Serrano Félix |
| **Integrante 2** | Joel Adrián Acosta Chipugsi |
| **Integrante 3** | Leonor Elizabeth Yumi López |
| **Integrante 4** | Diego David Camacho Molina |
| **Fecha de la reunión** | 22/11/2026 |
| **Duración de la reunión** | [Minutos] |
| **Enlace del video** | [Enlace con acceso habilitado para los docentes] |

---

## Requerimientos acordados

Cada requerimiento debe identificar claramente la necesidad o problema planteado en el enunciado que le da origen. Pueden agregar todas las filas que consideren necesarias.

Asimismo, antes de la reunión de consenso de su equipo, cada estudiante debió haber elaborado de manera individual sus propios ADR (Architecture Decision Records). Esto permitirá que, durante la reunión, cada integrante participe activamente, presente y fundamente sus decisiones, debata con sus compañeros y, cuando corresponda, refute propuestas alternativas con argumentos técnicos.

El objetivo de este proceso es analizar conjuntamente las distintas alternativas, enriquecer la discusión técnica y seleccionar las mejores decisiones para el desarrollo del producto de software. De esta manera, el análisis realizado por cada estudiante se fortalece con las perspectivas y aportes del resto de los integrantes del equipo, promoviendo una toma de decisiones más sólida y fundamentada.

### Requerimientos funcionales

| Código | Requerimiento | Necesidad que lo origina |
| :--- | :--- | :--- |
| **RF-01** | Inicio de sesión con correo y contraseña. No existe autorregistro: solo ingresa quien fue habilitado por su responsable. La sesión se mantiene abierta hasta que la persona la cierre. | Acceso de los usuarios |
| **RF-02** | Creación jerárquica de cuentas: el coordinador provincial crea a los coordinadores de recinto y cada coordinador de recinto crea a sus veedores. Son obligatorios cédula, nombres y apellidos, teléfono y correo; la cédula se valida al digitarla (10 dígitos, código de provincia y dígito verificador módulo 10) y ni la cédula ni el correo pueden repetirse. | Acceso de los usuarios |
| **RF-03** | El correo de cada persona se verifica antes de que pueda registrar actas, y en su primer acceso el titular define su propia contraseña; desde ese momento nadie más la conoce, ni quien creó la cuenta. | Acceso de los usuarios |
| **RF-04** | Recuperación autónoma de la contraseña por correo, sin intervención de ningún coordinador. | Acceso de los usuarios |
| **RF-05** | El coordinador provincial consulta los recintos de su jurisdicción (cantón, parroquia, nombre, mesas y coordinador asignado o “Sin coordinador”), agrega recintos nuevos sin duplicados y asigna un único coordinador por recinto. | Organización del territorio y del personal |
| **RF-06** | El coordinador de recinto asigna un veedor a cada mesa de su recinto; un veedor puede cubrir varias mesas sin límite y cada mesa tiene un solo veedor a la vez. Ve en una pantalla qué mesas tienen veedor y cuáles faltan. | Organización del territorio y del personal |
| **RF-07** | El coordinador de recinto reemplaza en el momento a un veedor ausente por otro veedor o por una persona nueva (afiliada o no) cuya cuenta crea ahí mismo. El saliente pierde el acceso a la mesa, sus actas conservan su autoría y el cambio queda registrado. | Organización del territorio y del personal |
| **RF-08** | El veedor registra las dos actas de cada mesa (alcaldía y prefectura): votos de las cinco organizaciones, nulos, blancos y total de sufragantes, en el mismo orden del acta física. Existe una sola acta por mesa y dignidad. | La organización y el proceso electoral / Registro de los resultados |
| **RF-09** | Validación inmediata del acta: solo enteros mayores o iguales a cero, ningún valor mayor que el total de sufragantes y votos de las organizaciones + nulos + blancos = total de sufragantes. Si no cuadra, se indica el error y no se permite enviar. | Registro de los resultados |
| **RF-10** | Cada acta exige una fotografía tomada con la cámara de la app, con vista previa para repetirla; la app rechaza las fotos borrosas o ilegibles antes de aceptarlas. | Registro de los resultados |
| **RF-11** | Cada acta guarda la ubicación GPS (latitud, longitud y precisión) y la fecha y hora de captura, obligatorias para enviar. La app compara la ubicación con la del recinto y marca el acta si está fuera del margen. | Registro de los resultados / Seguimiento del escrutinio |
| **RF-12** | El veedor corrige sus actas y el coordinador de recinto corrige cualquier acta de su recinto. Ningún acta se elimina: cada corrección queda en un historial con quién la hizo (cédula), cuándo, desde dónde y los valores anteriores y nuevos. | Registro de los resultados |
| **RF-13** | Cada acta muestra su estado en todo momento: en proceso, guardada en el teléfono (pendiente de envío), enviada o con error, con un mensaje de qué hacer. Todas las pantallas indican si hay conexión y cuántas actas faltan por enviar. | Registro de los resultados |
| **RF-14** | El veedor registra actas sin conexión (valores, foto y ubicación) y la app las envía automáticamente cuando el teléfono recupera la señal. Sus mesas, organizaciones y candidatos se descargan antes de la jornada y una sesión ya iniciada sigue funcionando sin señal. | Conectividad el día de la elección |
| **RF-15** | Panel del coordinador provincial con el avance por recinto (mesas reportadas y pendientes) y el detalle de cada acta: resultados, foto ampliable, ubicación en un mapa con su distancia al recinto, horas de captura y de recepción, veedor e historial. | Seguimiento del escrutinio |
| **RF-16** | Resultados preliminares de alcaldía y prefectura por candidato, por recinto y en total, con porcentaje sobre votos válidos y nulos y blancos por separado, actualizados a medida que llegan las actas. | Seguimiento del escrutinio |
| **RF-17** | Reporte automático de cierres y de errores que impiden completar una tarea (por ejemplo, una foto que no se sube), con dispositivo, versión de Android, versión de la app y pantalla; los reportes ocurridos sin conexión se envían al recuperarla. | Estabilidad de la aplicación |
| **RF-18** | El sistema viene precargado con la provincia y el cantón elegidos, sus parroquias, recintos (con coordenadas) y mesas, las cinco organizaciones con sus candidatos a alcaldía y prefectura, y la cuenta del coordinador provincial. | Restricciones del proyecto |
| **RF-19** | Al iniciar sesión, cada rol entra a su propia pantalla de inicio y menú (coordinador provincial, coordinador de recinto o veedor) y solo ve los datos que le corresponden: el veedor sus mesas y el coordinador de recinto su recinto. | Confidencialidad de la información / rúbrica (flujos diferenciados por rol) |

### Requerimientos no funcionales

| Código | Requerimiento | Necesidad que lo origina |
| :--- | :--- | :--- |
| **RNF-01** | Usabilidad para personas mayores o con poca experiencia: pocos pasos por pantalla, letra y botones grandes, español sencillo y opción de mostrar la contraseña. | Acceso de los usuarios |
| **RNF-02** | Retroalimentación visual inmediata con Lottie y Reanimated para operaciones en proceso, exitosas y fallidas, sin modales genéricos; el botón de envío se bloquea mientras se envía. | Registro de los resultados / rúbrica de diseño |
| **RNF-03** | Seguridad en el servidor: los permisos por rol y territorio (RLS) y las validaciones de cédula y de votos se aplican en la base de datos, aunque la app sea modificada. | Confidencialidad de la información |
| **RNF-04** | Protección de datos: las contraseñas nunca se guardan en claro; la sesión y los datos sensibles del teléfono se guardan cifrados y se borran al cerrar sesión, salvo las actas pendientes de envío. | Acceso de los usuarios / Confidencialidad de la información |
| **RNF-05** | No duplicación: cada acta tiene un identificador único y se registra una sola vez aunque haya cortes de señal, reintentos automáticos o varios toques del botón. | Registro de los resultados |
| **RNF-06** | Durabilidad sin conexión: lo capturado y pendiente no se pierde aunque se cierre la app o se apague el teléfono; una captura interrumpida se puede retomar y los envíos se reintentan solos. | Conectividad el día de la elección |
| **RNF-07** | Evidencia inmutable: la foto y la ubicación originales no cambian al corregir los valores; si se reemplaza una foto, la anterior se conserva en el historial. | Registro de los resultados |
| **RNF-08** | Uso eficiente de la red: las fotos se comprimen sin perder legibilidad antes de enviarlas, para redes rurales débiles. | Conectividad el día de la elección |
| **RNF-09** | Tiempo real: el avance y los resultados del panel provincial se actualizan solos en segundos, sin recargar la pantalla. | Seguimiento del escrutinio |
| **RNF-10** | Estabilidad y compatibilidad: la app funciona sin cerrarse en celulares Android de distintas versiones, incluidos los de gama baja. | Estabilidad de la aplicación |
| **RNF-11** | Condiciones de entrega: React Native con Expo, APK instalable en Android, código en Clean Architecture y diseño con los colores de la organización. | Restricciones del proyecto / rúbrica de diseño |

---

## Supuestos adoptados

Registren aquí las situaciones en que el enunciado no alcanzó para decidir y el supuesto que adoptó el equipo.

| Código | Ambigüedad que resuelve | Supuesto adoptado y justificación |
| :--- | :--- | :--- |
| **S-01** | Qué provincia y cantón usar. | Se establece como territorio de trabajo la provincia de Pichincha, cantón Quito. Para la precarga inicial se seleccionan 12 recintos electorales, distribuidos en seis parroquias urbanas y rurales, con tres mesas JRV simuladas por recinto.<br><br>Los recintos y coordenadas definidos para el proyecto son:<br><br>**Iñaquito (urbana):**<br>1. Colegio La Condamine. Latitud: -0.17261842559297133; longitud: -78.4829615893297.<br>2. Unidad Educativa Fiscal República de Bolivia. Latitud: -0.18291876659431192; longitud: -78.48831391999724.<br><br>**Quitumbe (urbana):**<br>3. Unidad Educativa Municipal Quitumbe. Latitud: -0.28092058299361927; longitud: -78.54875903535986.<br>4. U.E. Aurelio Bayas. Latitud: -0.29650345455062216; longitud: -78.53182313350888.<br><br>**La Magdalena (urbana):**<br>5. Colegio Amazonas. Latitud: -0.24557049627022853; longitud: -78.5267646200163.<br>6. Unidad Educativa Particular Fernández Salvador Villavicencio Ponce. Latitud: -0.2432486595075582; longitud: -78.51896865060093.<br><br>**Calderón (rural):**<br>7. Unidad Educativa Nicolás Jiménez. Latitud: -0.08342352204887239; longitud: -78.42269598997954.<br>8. Unidad Educativa Luxemburgo. Latitud: -0.09444252347955778; longitud: -78.45143258933005.<br><br>**Tumbaco (rural):**<br>9. Unidad Educativa Tumbaco. Latitud: -0.22461233844658068; longitud: -78.37609062001694.<br>10. Escuela Roberto Espinoza. Latitud: -0.2113119957674417; longitud: -78.40451540652408.<br><br>**Pifo (rural):**<br>11. C.F. Eduardo Salazar Gómez. Latitud: -0.22732224972003667; longitud: -78.34325005070353.<br>12. Institución Educativa Fiscal Ricardo Rodríguez. Latitud: -0.2245982397192964; longitud: -78.33664057583717.<br><br>Cada recinto contará con tres mesas de demostración, identificadas con los números 001, 002 y 003. Cada mesa permitirá registrar dos actas de escrutinio: Alcaldía y Prefectura. En total se dispondrá de 36 mesas y 72 actas posibles.<br><br>Los recintos tendrán identificadores únicos y sus coordenadas se utilizarán para comprobar la ubicación de captura de las actas, aplicando el margen inicial de 200 metros establecido en S-08.<br><br>Esta selección permitirá demostrar la gestión territorial, la asignación de veedores, el registro de resultados, el monitoreo provincial y la sincronización sin conexión, sin necesidad de precargar todos los recintos del cantón Quito.<br><br>Las JRV serán simuladas para fines académicos. Los nombres, las coordenadas proporcionadas y su correspondencia con las parroquias deberán verificarse antes de la carga definitiva. |
| **S-02** | Qué organizaciones y candidatos precargar. | Cinco organizaciones y candidatos ficticios, con nombres y colores propios, para no favorecer a partidos reales y cumplir la precarga obligatoria. Se establece la precarga de cinco organizaciones políticas ficticias, cada una con una sigla, un color representativo y dos candidatos, uno para la Alcaldía de Quito y otro para la Prefectura de Pichincha.<br><br>Las organizaciones definidas son:<br>- **Movimiento Futuro Ciudadano (MFC):** color azul (`#1769AA`). Alcaldía: Daniel Andrade. Prefectura: Gabriela Torres.<br>- **Alianza Renovación Popular (ARP):** color verde (`#169B62`). Alcaldía: Valeria Cárdenas. Prefectura: Mauricio Salazar.<br>- **Movimiento Unidos por el Cambio (MUC):** color naranja (`#E87932`). Alcaldía: Sebastián Molina. Prefectura: Carolina Herrera.<br>- **Frente Democrático Progreso (FDP):** color morado (`#8054B8`). Alcaldía: Natalia Espinosa. Prefectura: Andrés Villacís.<br>- **Movimiento Nueva Esperanza (MNE):** color rojo (`#D84A52`). Alcaldía: Ricardo Paredes. Prefectura: Daniela Morales.<br><br>Las cinco organizaciones aparecerán en el mismo orden en los formularios de registro de actas y en los resultados preliminares. Sus colores se utilizarán para mantener una identidad visual coherente en toda la aplicación.<br><br>Se utilizarán organizaciones y candidatos ficticios para mantener la neutralidad política del proyecto. Estos datos se precargarán en la base de datos y estarán disponibles localmente antes de la jornada electoral, permitiendo registrar actas sin conexión.<br><br>Todos los integrantes utilizarán esta misma información como base para sus implementaciones individuales. |
| **S-03** | Quién crea el primer usuario, si el coordinador provincial es quien crea a los demás. | Existe un único coordinador provincial, creado con la carga inicial (semilla) del sistema; desde él se crean los demás accesos. |
| **S-04** | Si una persona puede tener varias cuentas o roles. | Cada persona tiene una sola cuenta (una cédula y un correo) y un solo rol, para que los permisos no se mezclen y la cédula identifique sin dudas a quien reportó cada acta. |
| **S-05** | La verificación del correo choca con el reemplazo inmediato de un veedor nuevo. | Se prioriza la certeza del correo: el veedor nuevo lo verifica antes de registrar actas (toma unos minutos). Se recomienda crear y verificar veedores de reserva antes de la jornada. |
| **S-06** | Qué significa “Exit Poll en tiempo real”. | Es un conteo preliminar calculated solo con las actas recibidas por el servidor y rotulado como “preliminar, no oficial”; no es una encuesta a votantes ni reemplaza al CNE. |
| **S-07** | Cuándo una mesa se considera reportada. | Cuando sus dos actas (alcaldía y prefectura) fueron recibidas por el servidor con foto y ubicación; con una sola acta sigue pendiente. |
| **S-08** | Qué tan cerca del recinto debe registrarse el acta y qué pasa si no hay ubicación. | Margen configurable con valor inicial de 200 m, porque el GPS pierde precisión bajo techo. Un acta fuera del margen se envía marcada para revisión; sin permiso o sin señal GPS se guarda como borrador, pero no se envía. |
| **S-09** | Cómo detectar “números imposibles” sin el padrón de cada mesa. | Solo se valida con los datos del acta (suma igual al total y ningún valor mayor que el total), porque el número de electores por mesa no está disponible. |
| **S-10** | Qué pasa si el veedor y el coordinador corrigen la misma acta, una de ellas sin conexión. | La versión vigente es la última recibida por el servidor (el reloj de un teléfono sin conexión puede estar mal) y todas las versiones quedan en el historial. |
| **S-11** | Qué funciones deben trabajar sin conexión. | Solo registrar y corregir actas y consultar los datos ya descargados. Crear cuentas, reemplazar veedores, administrar recintos y ver el panel requieren conexión. |
| **S-12** | Qué hora es la de referencia, si el reloj del teléfono puede estar mal. | Se guardan dos horas: la de captura (teléfono) y la de recepción (servidor), que es la confiable; el coordinador provincial ve ambas. |

---

## Registro de decisiones técnicas (ADR)

Elaboren una ficha por cada decisión acordada. Copien la estructura de la ficha tantas veces como decisiones tenga el equipo.

### ADR-01: Backend, seguridad en el servidor, historial inmutable y tiempo real

#### Requerimientos relacionados
RF-02, RF-05, RF-06, RF-08, RF-09, RF-12, RF-15, RF-16, RF-18, RF-19, RNF-03, RNF-05, RNF-07, RNF-09, S-01, S-03, S-06, S-07, S-09, S-10, S-12

#### Contexto
La app necesita autenticación, base de datos con permisos por rol y territorio, almacenamiento de fotos, validaciones que se cumplan aunque la app sea modificada, un historial que no se pueda alterar, y resultados que se actualicen en segundos. El equipo no puede administrar servidores y el costo debe ser cero.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Supabase (PostgreSQL con RLS, Auth, Storage, Realtime y Edge Functions)** | Carlos Serrano, Diego Camacho | Un solo servicio gratuito que cubre todo: RLS y restricciones (CHECK, UNIQUE) aplican permisos y validaciones en la base; triggers guardan el historial; los conteos son consultas SQL; Realtime actualiza el panel sin recargar. | No trae sincronización offline y hay que escribirla en la app; el plan gratuito pausa el proyecto tras 1 semana sin actividad y limita la base a 500 MB; las reglas viven en la base y en la app. |
| **Firebase (Firestore, Auth, Storage y Functions)** | Leonor Yumi | Offline nativo en Firestore; escuchas en tiempo real y Crashlytics integrados. | NoSQL: los conteos por candidato y recinto exigen funciones o duplicar datos; los permisos por territorio, las validaciones y el historial inmutable son más difíciles de expresar y probar. |
| **Appwrite** | Joel Acosta | Código abierto, SDK sencillo y permisos por documento. | Menos ejemplos con React Native; sin SQL para agregados; tiempo real, funciones e historial requieren más configuración propia. |

#### Decisión
Supabase. Decisiones que incluye: (1) RLS, restricciones y funciones en PostgreSQL aplican permisos y validaciones de cédula, duplicados y suma de votos, repetidas en el dominio de la app para el aviso inmediato; (2) una tabla de versiones de solo inserción, llenada por trigger y sin permisos de UPDATE ni DELETE, guarda quién, cuándo y los valores anteriores y nuevos, y cada foto reemplazada usa una ruta nueva; (3) la hora de recepción y la versión vigente las define el servidor; (4) Supabase Realtime actualiza el panel, con una consulta de respaldo al volver a primer plano, y los resultados salen de una vista SQL con porcentajes sobre votos válidos y nulos y blancos por separado, rotulados como preliminares.

#### Consecuencias
Se gana seguridad real, datos íntegros, trazabilidad y tiempo real sin infraestructura nueva. Se asume escribir la cola offline en la app, mantener las reglas de validación en dos lugares y depender del plan gratuito (reactivar el proyecto antes de la jornada y de la defensa, y verificar la cuota de conexiones de Realtime). Obliga a diseñar tablas, políticas RLS y migraciones desde el inicio y a probar las políticas por cada rol.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-02: Creación de cuentas, verificación de correo y envío con Resend

#### Requerimientos relacionados
RF-01, RF-02, RF-03, RF-04, RF-07, S-03, S-04, S-05

#### Contexto
Cada coordinador debe crear cuentas de otros sin perder su sesión, sin conocer la contraseña de nadie y sin autorregistro. El correo se verifica antes de registrar actas, el titular define su propia contraseña y la recuperación es autónoma. El correo integrado de Supabase tiene un límite de envío por hora demasiado bajo para crear y verificar varias cuentas en la jornada.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Edge Function con rol de servicio que crea la cuenta y envía la invitación y la recuperación por Resend (SMTP propio en Supabase Auth)** | Diego Camacho, Leonor Yumi, Carlos Serrano, Joel Acosta | Nadie conoce la contraseña (cumple RF-03); sin autorregistro; no cierra la sesión de quien crea; el límite por hora se puede subir con SMTP propio; el plan gratuito de Resend permite 100 correos al día y 3.000 al mes. | Resend exige un dominio verificado (registros DNS) para enviar a cualquier destinatario; sin dominio solo envía al correo de la propia cuenta. Hay que guardar la clave de API como secreto del servidor. |
| **Edge Function con invitación enviada por el correo integrado de Supabase** | Carlos Serrano | No requiere dominio ni cuentas externas; configuración mínima. | Límite por hora muy bajo con el correo integrado: no alcanza para crear y verificar veedores y reemplazos durante la jornada. |
| **Edge Function que crea la cuenta con contraseña temporal entregada por el coordinador** | Joel Acosta | No depende del correo para el primer ingreso. | Quien crea la cuenta conoce la contraseña, lo que contradice RF-03, y debe comunicarla por un canal inseguro. |

#### Decisión
Edge Function con invitación y recuperación enviadas por Resend como SMTP propio. Se descarta crear cuentas con `signUp` desde la app porque cierra la sesión de quien crea y permite el autorregistro (RF-01). La cuenta queda sin verificar y no puede registrar actas hasta que el titular confirme su correo y defina su contraseña.

#### Consecuencias
Se gana cumplimiento de RF-01, RF-02, RF-03 y RF-04 sin el límite horario del correo integrado. Se asume depender de Resend, de un dominio propio con registros DNS (la verificación puede tardar desde minutos hasta unas horas, por lo que debe hacerse con tiempo) y de su cuota de 100 correos al día. Obliga a una pantalla de primer acceso, a probar el correo real antes de la entrega y a crear y verificar veedores de reserva antes de la jornada (S-05).

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-03: Registro sin conexión, sincronización y sesión cifrada en el teléfono

#### Requerimientos relacionados
RF-01, RF-13, RF-14, RNF-04, RNF-05, RNF-06, S-11

#### Contexto
Los recintos rurales pueden no tener señal. Valores, foto y ubicación deben guardarse en el teléfono, sobrevivir al cierre de la app o al apagado y enviarse solos sin duplicarse. La sesión debe seguir abierta y funcionar sin señal, y tanto ella como los datos sensibles se guardan cifrados y se borran al cerrar sesión, salvo las actas pendientes.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **SQLite (expo-sqlite) con patrón outbox y UUID generado en el teléfono; la llave de cifrado de la sesión y los datos sensibles se guarda en expo-secure-store** | Leonor Yumi, Carlos Serrano, Joel Acosta, Diego Camacho | Consultas locales; reintentos idempotentes gracias al UUID; guarda estados y rutas de fotos; la llave queda en el almacén seguro de Android; funciona con Expo. | Hay que programar la cola, los reintentos, el estado de cada acta y un adaptador de cifrado, porque el almacén seguro admite valores pequeños. |
| **WatermelonDB con sincronización por lotes** | Joel Acosta | Sincronización pensada para offline. | Configuración nativa más compleja con Expo, curva de aprendizaje alta para el plazo y la sesión cifrada igual debe resolverse aparte. |
| **AsyncStorage o MMKV con una cola de objetos** | Carlos Serrano | Muy simple de usar. | AsyncStorage no cifra (incumple RNF-04); MMKV con cifrado exige módulo nativo y guardar la llave en un lugar seguro; ambos son poco robustos para fotos, estados y reintentos. |

#### Decisión
SQLite con outbox y llave de cifrado en `expo-secure-store`. Cada acta nace con UUID y estados en proceso, pendiente de envío, enviada o con error (RF-13); NetInfo detecta la señal y un servicio reintenta solo. Mesas, organizaciones y candidatos se descargan antes de la jornada. Al cerrar sesión se borran tokens y cachés y se conserva solo la cola de actas pendientes.

#### Consecuencias
Se gana durabilidad, cero duplicados y sesión protegida. Se asume escribir y probar la lógica de sincronización y el adaptador de cifrado. Obliga a pruebas en modo avión y con cierres forzados, y a limitar lo que funciona sin conexión a lo definido en S-11.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-04: Evidencia del acta: fotografía, ubicación GPS y mapa

#### Requerimientos relacionados
RF-10, RF-11, RF-15, RF-18, RNF-07, RNF-08, RNF-10, S-08, S-11, S-12

#### Contexto
Cada acta exige una foto tomada con la cámara de la app con vista previa, que rechace las borrosas, comprimida para redes rurales; además guarda latitud, longitud, precisión y hora, y la app la compara con la ubicación del recinto (margen de 200 m configurable). El panel provincial muestra en un mapa la ubicación del acta y su distancia al recinto. Debe funcionar en celulares de gama baja.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-camera con vista previa y prueba de nitidez (varianza del Laplaciano sobre una copia reducida), expo-image-manipulator para comprimir, expo-location con distancia Haversine y mapa con WebView, Leaflet y OpenStreetMap** | Carlos Serrano, Leonor Yumi | Solo permite fotos tomadas en la app; rechazo automático de fotos borrosas; sin claves de API de pago ni código nativo propio; el mapa es gratuito y la distancia se calcula también sin conexión; se puede recalcular en el servidor. | El umbral de nitidez debe calibrarse; el mapa necesita internet para cargar Leaflet y los mapas, lo que es aceptable porque el panel requiere conexión (S-11); la política de OpenStreetMap exige atribución y uso ligero. |
| **Selector de imágenes del sistema, expo-location y react-native-maps** | Joel Acosta | Muy simple de programar; mapa nativo fluido. | El selector permite fotos ajenas a la cámara de la app (contra RF-10) y no mide la nitidez; en Android el mapa requiere una clave de API de Google y más configuración nativa. |
| **react-native-vision-camera con análisis de cuadros, geolocalización nativa y mapa de Mapbox** | Diego Camacho | Máximo control y detección de borrosidad en vivo. | Configuración nativa compleja y un token de Mapbox; más riesgo para el APK y peor rendimiento en gama baja. |

#### Decisión
La primera opción. En el WebView se carga el HTML de Leaflet con teselas de OpenStreetMap (con atribución y una URL base definida para que las teselas carguen), y la app envía y recibe mensajes para dibujar el recinto, el acta y la distancia. La foto original y la ubicación capturadas no cambian al corregir valores (RNF-07).

#### Consecuencias
Se gana evidencia legible, menor consumo de datos y un mapa sin costo. Se asume algún falso rechazo si el umbral es estricto y la dependencia de internet del mapa. Obliga a calibrar el umbral con fotos de prueba, a manejar permisos de cámara y GPS denegados (el acta queda en borrador, S-08) y a probar el mapa y la cámara en un celular de gama baja.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-05: Arquitectura del código y manejo de estado

#### Requerimientos relacionados
RF-13, RF-19, RNF-05, RNF-10, RNF-11

#### Contexto
La entrega exige Clean Architecture y su defensa oral. La estructura debe ser clara, mantener la lógica de negocio independiente de React Native y de Supabase, y resolver estado de sesión y rol, estado de cada acta, conexión visible en todas las pantallas y caché de datos remotos.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Organización por funcionalidad (cuentas, actas, recintos, panel) con capas domain, data y presentation, y Zustand con TanStack Query para el estado** | Joel Acosta, Leonor Yumi | Alta cohesión; las dependencias se ven; fácil de explicar y repartir; poco código de estado, con caché y reintentos resueltos e integración con Realtime. | Más carpetas y algo de repetición; dos librerías de estado que combinar. |
| **Tres capas globales con Redux Toolkit** | Diego Camacho | Estructura simple y herramientas de depuración estándar. | Las carpetas mezclan temas al crecer y Redux exige más código repetitivo para el plazo. |
| **Carpetas por tipo de archivo (estilo MVC) con Context API** | Carlos Serrano | Conocida por todos y sin dependencias. | No cumple la restricción de Clean Architecture y el Context provoca renderizados innecesarios sin caché de datos. |

#### Decisión
Organización por funcionalidad. El dominio (entidades, casos de uso e interfaces de repositorio) no importa nada de React Native ni de Supabase. Zustand guarda sesión, rol y estado de la interfaz; TanStack Query maneja los datos remotos, usados desde la presentación a través de casos de uso.

#### Consecuencias
Se gana testabilidad, facilidad de defensa y posibilidad de cambiar de proveedor. Se asume más código base. Obliga a usar inyección de dependencias, mapeadores entre datos y entidades, claves de consulta definidas y su invalidación cuando llegan cambios de Realtime.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-06: Interfaz con Uniwind, Lottie y Reanimated

#### Requerimientos relacionados
RF-13, RF-19, RNF-01, RNF-02, RNF-11, S-02

#### Contexto
La interfaz debe servir a personas mayores o con poca experiencia, dar retroalimentación inmediata con Lottie y Reanimated, tener pantallas de inicio distintas por rol y usar los colores de la organización ficticia, evitando una apariencia genérica.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Uniwind (Tailwind CSS v4 para React Native) con tema propio, lottie-react-native y Reanimated** | Carlos Serrano, Joel Acosta, Leonor Yumi, Diego Camacho | Estilos con clases y tokens de color y tipografía definidos en CSS; se compilan en el build, sin costo en ejecución; soportado en Expo; identidad única con los colores de la organización. | Requiere Tailwind v4 y una versión reciente de Expo; existe una versión Pro de pago y se usa la gratuita, que no ofrece clases de animación, por lo que las animaciones se escriben con Reanimated. |
| **StyleSheet con tema propio** | Leonor Yumi | Sin dependencias y control total. | Más código repetitivo, sin utilidades y más difícil mantener la coherencia visual con poco tiempo. |
| **React Native Paper** | Diego Camacho | Componentes listos y accesibles. | Aspecto Material genérico si no se personaliza mucho, justo lo que se quiere evitar. |

#### Decisión
Uniwind con tema propio. Componentes reutilizables (chips de estado de acta, indicador de conexión y actas pendientes, tarjetas, botón de envío que se bloquea) y animaciones Lottie para proceso, éxito y error y Reanimated para transiciones.

#### Consecuencias
Se gana una interfaz distintiva y coherente en los tres roles, con desarrollo rápido. Se asume una librería joven y mantener sus versiones compatibles con Expo. Obliga a definir una paleta única, letra y botones grandes, la opción de mostrar la contraseña y a evitar los modales genéricos.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-07: Plataforma, generación del APK y reporte de errores

#### Requerimientos relacionados
RF-17, RNF-10, RNF-11

#### Contexto
Hay que entregar React Native con Expo y un APK instalable que funcione en celulares de distintas versiones, incluida la gama baja. La organización debe enterarse de cierres y de errores que impiden completar una tarea (por ejemplo, una foto que no se sube), con dispositivo, versión de Android, versión de la app y pantalla, incluso los ocurridos sin conexión.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo con EAS Build (perfil preview a APK) y Sentry** | Joel Acosta, Leonor Yumi | Compilación en la nube sin Android Studio; Sentry captura cierres y errores manuales con contexto, guarda eventos sin red y los envía después; ambos tienen plan gratuito. | EAS gratuito da hasta 15 builds de Android al mes en cola de baja prioridad, con máximo de 45 minutos por build; Sentry gratuito tiene 1 usuario y 5.000 errores al mes. |
| **React Native CLI con Firebase Crashlytics** | Carlos Serrano | Control nativo total e integración sólida de Crashlytics. | No cumple la condición de usar Expo (RNF-11), exige configuración nativa pesada y no encaja con el backend elegido. |
| **Expo con compilación local (prebuild y Gradle) y Bugsnag** | Diego Camacho | Sin esperar colas ni gastar cuota de builds. | Requiere Android SDK y Java bien configurados en cada equipo; Bugsnag tiene menos ejemplos con Expo y plan gratuito más limitado. |

#### Decisión
Expo con EAS Build y Sentry. Se genera un APK de prueba pronto, se deja la compilación local como respaldo si se agota la cuota y se captura con `captureException` los errores no fatales de subida y sincronización.

#### Consecuencias
Se gana velocidad, menos problemas de entorno y visibilidad inmediata de los fallos. Se asume depender de la nube y de las cuotas gratuitas, por lo que no se desperdiciar simultáneamente builds. Obliga a mantener los paquetes compatibles con la versión de Expo, a provocar un error de prueba para demostrar el reporte y a probar el APK en un celular real de gama baja.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-08: Navegación con Expo Router

#### Requerimientos relacionados
RF-01, RF-03, RF-04, RF-14, RF-19, RNF-01, RNF-10, RNF-11, S-11

#### Contexto
Cada rol (coordinador provincial, coordinador de recinto y veedor) entra a su propia pantalla de inicio y menú. La sesión se mantiene abierta, el primer acceso y la recuperación de contraseña llegan desde un enlace del correo y la navegación debe seguir funcionando sin señal. Los flujos deben tener pocos pasos para personas con poca experiencia.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo Router (rutas por archivos sobre React Navigation)** | Joel Acosta, Diego Camacho | Es el enfoque estándar de Expo; grupos de rutas por rol y redirecciones según sesión y rol; los enlaces del correo abren la pantalla correcta mediante el esquema de la app; rutas tipadas; poca configuración. | Las pantallas deben vivir en la carpeta app y esto se debe conciliar con Clean Architecture; las reglas de acceso por ruta mejoran la experiencia, pero no reemplazan la seguridad del servidor. |
| **React Navigation con configuración manual** | Carlos Serrano | Control total de los navegadores y mucha documentación. | Más código de configuración y de enlaces profundos manuales, sin ventaja clara para este proyecto. |
| **react-native-navigation (Wix)** | Leonor Yumi | Navegación nativa con buen rendimiento. | Configuración nativa compleja y poca afinidad con el flujo de Expo y EAS Build. |

#### Decisión
Expo Router. Grupos de rutas: autenticación (inicio de sesión, primer acceso y recuperación), coordinador provincial, coordinador de recinto y veedor, cada uno con sus pestañas inferiores. El diseño raíz lee la sesión y el rol desde Zustand y redirige a la pantalla de inicio que corresponde. Los archivos de la carpeta app son delgados y delegan en la capa de presentación de cada funcionalidad (ADR-05).

#### Consecuencias
Se gana una estructura de navegación clara por rol, enlaces profundos para la invitación y la recuperación, y menos código de configuración. Se asume depender de las convenciones de Expo Router. Obliga a definir el esquema de la app, a probar los enlaces del correo en un celular real y a no confiar en la navegación como único control de acceso, porque los permisos reales los aplica RLS (ADR-01).

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

### ADR-09: Formularios y validación con React Hook Form y Zod

#### Requerimientos relacionados
RF-02, RF-03, RF-04, RF-05, RF-07, RF-08, RF-09, RF-12, RNF-01, RNF-03, RNF-10, S-09

#### Contexto
La app tiene varios formularios: inicio de sesión, creación de cuentas (cédula con módulo 10, correo, teléfono), contraseña del primer acceso, recintos nuevos y el acta, con muchos campos numéricos que deben validarse al digitar (enteros mayores o iguales a cero, ningún valor mayor que el total de sufragantes y suma exacta). Debe funcionar fluido en celulares de gama baja y mostrar mensajes en español sencillo.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **React Hook Form con Zod (zodResolver)** | Joel Acosta, Diego Camacho, Carlos Serrano, Leonor Yumi | Un esquema por formulario con tipos y reglas cruzadas (por ejemplo, la suma del acta); validación al cambiar cada campo; pocos renderizados por usar campos no controlados; ambas son gratuitas y de código abierto. | Son dos librerías; los campos de React Native se conectan con Controller; las reglas deben repetirse en la base de datos (RNF-03). |
| **Formik con Yup** | Joel Acosta | Muy conocidos y con mucha documentación. | Más renderizados por formulario, algo preocupante en gama baja, y tipado menos directo que con Zod. |
| **Validación manual con useState y funciones propias** | Carlos Serrano | Sin dependencias. | Mucho código repetido y propenso a errores en el acta, que tiene muchos campos y reglas cruzadas. |

#### Decisión
React Hook Form con Zod. Los esquemas se escriben en el dominio de cada funcionalidad como reglas puras, sin dependencias de React Native (cédula, correo, teléfono y el acta con sus tres reglas de suma y topes), y la presentación los conecta con `zodResolver`. La validación corre al cambiar cada campo, los mensajes están en español sencillo y el botón de envío se bloquea mientras el formulario sea inválido o se esté enviando.

#### Consecuencias
Se gana aviso inmediato de errores (RF-09), una sola fuente de reglas en la app y formularios ágiles. Se asume mantener las mismas reglas en la base de datos como segunda barrera (ADR-01). Obliga a escribir pruebas de los esquemas, en especial el módulo 10 de la cédula y la suma del acta, y a usar los mismos mensajes en toda la app.

#### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---
