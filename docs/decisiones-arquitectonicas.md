# Registro de Decisiones Arquitectónicas (ADR) - Consolidado

Documento derivado fielmente de la línea base obligatoria: `consolidado_requerimientos.md`.

---

## ADR-01: Backend, seguridad en el servidor, historial inmutable y tiempo real

### Requerimientos relacionados
RF-02, RF-05, RF-06, RF-08, RF-09, RF-12, RF-15, RF-16, RF-18, RF-19, RNF-03, RNF-05, RNF-07, RNF-09, S-01, S-03, S-06, S-07, S-09, S-10, S-12

### Contexto
La app necesita autenticación, base de datos con permisos por rol y territorio, almacenamiento de fotos, validaciones que se cumplan aunque la app sea modificada, un historial que no se pueda alterar, y resultados que se actualicen en segundos. El equipo no puede administrar servidores y el costo debe ser cero.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Supabase (PostgreSQL con RLS, Auth, Storage, Realtime y Edge Functions)** | Carlos Serrano, Diego Camacho | Un solo servicio gratuito que cubre todo: RLS y restricciones (CHECK, UNIQUE) aplican permisos y validaciones en la base; triggers guardan el historial; los conteos son consultas SQL; Realtime actualiza el panel sin recargar. | No trae sincronización offline y hay que escribirla en la app; el plan gratuito pausa el proyecto tras 1 semana sin actividad y limita la base a 500 MB; las reglas viven en la base y en la app. |
| **Firebase (Firestore, Auth, Storage y Functions)** | Leonor Yumi | Offline nativo en Firestore; escuchas en tiempo real y Crashlytics integrados. | NoSQL: los conteos por candidato y recinto exigen funciones o duplicar datos; los permisos por territorio, las validaciones y el historial inmutable son más difíciles de expresar y probar. |
| **Appwrite** | Joel Acosta | Código abierto, SDK sencillo y permisos por documento. | Menos ejemplos con React Native; sin SQL para agregados; tiempo real, funciones e historial requieren más configuración propia. |

### Decisión
Supabase. Decisiones que incluye: (1) RLS, restricciones y funciones en PostgreSQL aplican permisos y validaciones de cédula, duplicados y suma de votos, repetidas en el dominio de la app para el aviso inmediato; (2) una tabla de versiones de solo inserción, llenada por trigger y sin permisos de UPDATE ni DELETE, guarda quién, cuándo y los valores anteriores y nuevos, y cada foto reemplazada usa una ruta nueva; (3) la hora de recepción y la versión vigente las define el servidor; (4) Supabase Realtime actualiza el panel, con una consulta de respaldo al volver a primer plano, y los resultados salen de una vista SQL con porcentajes sobre votos válidos y nulos y blancos por separado, rotulados como preliminares.

### Consecuencias
Se gana seguridad real, datos íntegros, trazabilidad y tiempo real sin infraestructura nueva. Se asume escribir la cola offline en la app, mantener las reglas de validación en dos lugares y depender del plan gratuito (reactivar el proyecto antes de la jornada y de la defensa, y verificar la cuota de conexiones de Realtime). Obliga a diseñar tablas, políticas RLS y migraciones desde el inicio y a probar las políticas por cada rol.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-02: Creación de cuentas, verificación de correo y envío con Resend

### Requerimientos relacionados
RF-01, RF-02, RF-03, RF-04, RF-07, S-03, S-04, S-05

### Contexto
Cada coordinador debe crear cuentas de otros sin perder su sesión, sin conocer la contraseña de nadie y sin autorregistro. El correo se verifica antes de registrar actas, el titular define su propia contraseña y la recuperación es autónoma. El correo integrado de Supabase tiene un límite de envío por hora demasiado bajo para crear y verificar varias cuentas en la jornada.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Edge Function con rol de servicio que crea la cuenta y envía la invitación y la recuperación por Resend (SMTP propio en Supabase Auth)** | Diego Camacho, Leonor Yumi, Carlos Serrano, Joel Acosta | Nadie conoce la contraseña (cumple RF-03); sin autorregistro; no cierra la sesión de quien crea; el límite por hora se puede subir con SMTP propio; el plan gratuito de Resend permite 100 correos al día y 3.000 al mes. | Resend exige un dominio verificado (registros DNS) para enviar a cualquier destinatario; sin dominio solo envía al correo de la propia cuenta. Hay que guardar la clave de API como secreto del servidor. |
| **Edge Function con invitación enviada por el correo integrado de Supabase** | Carlos Serrano | No requiere dominio ni cuentas externas; configuración mínima. | Límite por hora muy bajo con el correo integrado: no alcanza para crear y verificar veedores y reemplazos durante la jornada. |
| **Edge Function que crea la cuenta con contraseña temporal entregada por el coordinador** | Joel Acosta | No depende del correo para el primer ingreso. | Quien crea la cuenta conoce la contraseña, lo que contradice RF-03, y debe comunicarla por un canal inseguro. |

### Decisión
Edge Function con invitación y recuperación enviadas por Resend como SMTP propio. Se descarta crear cuentas con `signUp` desde la app porque cierra la sesión de quien crea y permite el autorregistro (RF-01). La cuenta queda sin verificar y no puede registrar actas hasta que el titular confirme su correo y defina su contraseña.

### Consecuencias
Se gana cumplimiento de RF-01, RF-02, RF-03 y RF-04 sin el límite horario del correo integrado. Se asume depender de Resend, de un dominio propio con registros DNS (la verificación puede tardar desde minutos hasta unas horas, por lo que debe hacerse con tiempo) y de su cuota de 100 correos al día. Obliga a una pantalla de primer acceso, a probar el correo real antes de la entrega y a crear y verificar veedores de reserva antes de la jornada (S-05).

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-03: Registro sin conexión, sincronización y sesión cifrada en el teléfono

### Requerimientos relacionados
RF-01, RF-13, RF-14, RNF-04, RNF-05, RNF-06, S-11

### Contexto
Los recintos rurales pueden no tener señal. Valores, foto y ubicación deben guardarse en el teléfono, sobrevivir al cierre de la app o al apagado y enviarse solos sin duplicarse. La sesión debe seguir abierta y funcionar sin señal, y tanto ella como los datos sensibles se guardan cifrados y se borran al cerrar sesión, salvo las actas pendientes.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **SQLite (expo-sqlite) con patrón outbox y UUID generado en el teléfono; la llave de cifrado de la sesión y los datos sensibles se guarda en expo-secure-store** | Leonor Yumi, Carlos Serrano, Joel Acosta, Diego Camacho | Consultas locales; reintentos idempotentes gracias al UUID; guarda estados y rutas de fotos; la llave queda en el almacén seguro de Android; funciona con Expo. | Hay que programar la cola, los reintentos, el estado de cada acta y un adaptador de cifrado, porque el almacén seguro admite valores pequeños. |
| **WatermelonDB con sincronización por lotes** | Joel Acosta | Sincronización pensada para offline. | Configuración nativa más compleja con Expo, curva de aprendizaje alta para el plazo y la sesión cifrada igual debe resolverse aparte. |
| **AsyncStorage o MMKV con una cola de objetos** | Carlos Serrano | Muy simple de usar. | AsyncStorage no cifra (incumple RNF-04); MMKV con cifrado exige módulo nativo y guardar la llave en un lugar seguro; ambos son poco robustos para fotos, estados y reintentos. |

### Decisión
SQLite con outbox y llave de cifrado en `expo-secure-store`. Cada acta nace con UUID y estados en proceso, pendiente de envío, enviada o con error (RF-13); NetInfo detecta la señal y un servicio reintenta solo. Mesas, organizaciones y candidatos se descargan antes de la jornada. Al cerrar sesión se borran tokens y cachés y se conserva solo la cola de actas pendientes.

### Consecuencias
Se gana durabilidad, cero duplicados y sesión protegida. Se asume escribir y probar la lógica de sincronización y el adaptador de cifrado. Obliga a pruebas en modo avión y con cierres forzados, y a limitar lo que funciona sin conexión a lo definido en S-11.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-04: Evidencia del acta: fotografía, ubicación GPS y mapa

### Requerimientos relacionados
RF-10, RF-11, RF-15, RF-18, RNF-07, RNF-08, RNF-10, S-08, S-11, S-12

### Contexto
Cada acta exige una foto tomada con la cámara de la app con vista previa, que rechace las borrosas, comprimida para redes rurales; además guarda latitud, longitud, precisión y hora, y la app la compara con la ubicación del recinto (margen de 200 m configurable). El panel provincial muestra en un mapa la ubicación del acta y su distancia al recinto. Debe funcionar en celulares de gama baja.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-camera con vista previa y prueba de nitidez (varianza del Laplaciano sobre una copia reducida), expo-image-manipulator para comprimir, expo-location con distancia Haversine y mapa con WebView, Leaflet y OpenStreetMap** | Carlos Serrano, Leonor Yumi | Solo permite fotos tomadas en la app; rechazo automático de fotos borrosas; sin claves de API de pago ni código nativo propio; el mapa es gratuito y la distancia se calcula también sin conexión; se puede recalcular en el servidor. | El umbral de nitidez debe calibrarse; el mapa necesita internet para cargar Leaflet y los mapas, lo que es aceptable porque el panel requiere conexión (S-11); la política de OpenStreetMap exige atribución y uso ligero. |
| **Selector de imágenes del sistema, expo-location y react-native-maps** | Joel Acosta | Muy simple de programar; mapa nativo fluido. | El selector permite fotos ajenas a la cámara de la app (contra RF-10) y no mide la nitidez; en Android el mapa requiere una clave de API de Google y más configuración nativa. |
| **react-native-vision-camera con análisis de cuadros, geolocalización nativa y mapa de Mapbox** | Diego Camacho | Máximo control y detección de borrosidad en vivo. | Configuración nativa compleja y un token de Mapbox; más riesgo para el APK y peor rendimiento en gama baja. |

### Decisión
La primera opción. En el WebView se carga el HTML de Leaflet con teselas de OpenStreetMap (con atribución y una URL base definida para que las teselas carguen), y la app envía y recibe mensajes para dibujar el recinto, el acta y la distancia. La foto original y la ubicación capturadas no cambian al corregir valores (RNF-07).

### Consecuencias
Se gana evidencia legible, menor consumo de datos y un mapa sin costo. Se asume algún falso rechazo si el umbral es estricto y la dependencia de internet del mapa. Obliga a calibrar el umbral con fotos de prueba, a manejar permisos de cámara y GPS denegados (el acta queda en borrador, S-08) y a probar el mapa y la cámara en un celular de gama baja.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-05: Arquitectura del código y manejo de estado

### Requerimientos relacionados
RF-13, RF-19, RNF-05, RNF-10, RNF-11

### Contexto
La entrega exige Clean Architecture y su defensa oral. La estructura debe ser clara, mantener la lógica de negocio independiente de React Native y de Supabase, y resolver estado de sesión y rol, estado de cada acta, conexión visible en todas las pantallas y caché de datos remotos.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Organización por funcionalidad (cuentas, actas, recintos, panel) con capas domain, data y presentation, y Zustand con TanStack Query para el estado** | Joel Acosta, Leonor Yumi | Alta cohesión; las dependencias se ven; fácil de explicar y repartir; poco código de estado, con caché y reintentos resueltos e integración con Realtime. | Más carpetas y algo de repetición; dos librerías de estado que combinar. |
| **Tres capas globales con Redux Toolkit** | Diego Camacho | Estructura simple y herramientas de depuración estándar. | Las carpetas mezclan temas al crecer y Redux exige más código repetitivo para el plazo. |
| **Carpetas por tipo de archivo (estilo MVC) con Context API** | Carlos Serrano | Conocida por todos y sin dependencias. | No cumple la restricción de Clean Architecture y el Context provoca renderizados innecesarios sin caché de datos. |

### Decisión
Organización por funcionalidad. El dominio (entidades, casos de uso e interfaces de repositorio) no importa nada de React Native ni de Supabase. Zustand guarda sesión, rol y estado de la interfaz; TanStack Query maneja los datos remotos, usados desde la presentación a través de casos de uso.

### Consecuencias
Se gana testabilidad, facilidad de defensa y posibilidad de cambiar de proveedor. Se asume más código base. Obliga a usar inyección de dependencias, mapeadores entre datos y entidades, claves de consulta definidas y su invalidación cuando llegan cambios de Realtime.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-06: Interfaz con Uniwind, Lottie y Reanimated

### Requerimientos relacionados
RF-13, RF-19, RNF-01, RNF-02, RNF-11, S-02

### Contexto
La interfaz debe servir a personas mayores o con poca experiencia, dar retroalimentación inmediata con Lottie y Reanimated, tener pantallas de inicio distintas por rol y usar los colores de la organización ficticia, evitando una apariencia genérica.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Uniwind (Tailwind CSS v4 para React Native) con tema propio, lottie-react-native y Reanimated** | Carlos Serrano, Joel Acosta, Leonor Yumi, Diego Camacho | Estilos con clases y tokens de color y tipografía definidos en CSS; se compilan en el build, sin costo en ejecución; soportado en Expo; identidad única con los colores de la organización. | Requiere Tailwind v4 y una versión reciente de Expo; existe una versión Pro de pago y se usa la gratuita, que no ofrece clases de animación, por lo que las animaciones se escriben con Reanimated. |
| **StyleSheet con tema propio** | Leonor Yumi | Sin dependencias y control total. | Más código repetitivo, sin utilidades y más difícil mantener la coherencia visual con poco tiempo. |
| **React Native Paper** | Diego Camacho | Componentes listos y accesibles. | Aspecto Material genérico si no se personaliza mucho, justo lo que se quiere evitar. |

### Decisión
Uniwind con tema propio. Componentes reutilizables (chips de estado de acta, indicador de conexión y actas pendientes, tarjetas, botón de envío que se bloquea) y animaciones Lottie para proceso, éxito y error y Reanimated para transiciones.

### Consecuencias
Se gana una interfaz distintiva y coherente en los tres roles, con desarrollo rápido. Se asume una librería joven y mantener sus versiones compatibles con Expo. Obliga a definir una paleta única, letra y botones grandes, la opción de mostrar la contraseña y a evitar los modales genéricos.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-07: Plataforma, generación del APK y reporte de errores

### Requerimientos relacionados
RF-17, RNF-10, RNF-11

### Contexto
Hay que entregar React Native con Expo y un APK instalable que funcione en celulares de distintas versiones, incluida la gama baja. La organización debe enterarse de cierres y de errores que impiden completar una tarea (por ejemplo, una foto que no se sube), con dispositivo, versión de Android, versión de la app y pantalla, incluso los ocurridos sin conexión.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo con EAS Build (perfil preview a APK) y Sentry** | Joel Acosta, Leonor Yumi | Compilación en la nube sin Android Studio; Sentry captura cierres y errores manuales con contexto, guarda eventos sin red y los envía después; ambos tienen plan gratuito. | EAS gratuito da hasta 15 builds de Android al mes en cola de baja prioridad, con máximo de 45 minutos por build; Sentry gratuito tiene 1 usuario y 5.000 errores al mes. |
| **React Native CLI con Firebase Crashlytics** | Carlos Serrano | Control nativo total e integración sólida de Crashlytics. | No cumple la condición de usar Expo (RNF-11), exige configuración nativa pesada y no encaja con el backend elegido. |
| **Expo con compilación local (prebuild y Gradle) y Bugsnag** | Diego Camacho | Sin esperar colas ni gastar cuota de builds. | Requiere Android SDK y Java bien configurados en cada equipo; Bugsnag tiene menos ejemplos con Expo y plan gratuito más limitado. |

### Decisión
Expo con EAS Build y Sentry. Se genera un APK de prueba pronto, se deja la compilación local como respaldo si se agota la cuota y se captura con `captureException` los errores no fatales de subida y sincronización.

### Consecuencias
Se gana velocidad, menos problemas de entorno y visibilidad inmediata de los fallos. Se asume depender de la nube y de las cuotas gratuitas, por lo que no se desperdiciar simultáneamente builds. Obliga a mantener los paquetes compatibles con la versión de Expo, a provocar un error de prueba para demostrar el reporte y a probar el APK en un celular real de gama baja.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-08: Navegación con Expo Router

### Requerimientos relacionados
RF-01, RF-03, RF-04, RF-14, RF-19, RNF-01, RNF-10, RNF-11, S-11

### Contexto
Cada rol (coordinador provincial, coordinador de recinto y veedor) entra a su propia pantalla de inicio y menú. La sesión se mantiene abierta, el primer acceso y la recuperación de contraseña llegan desde un enlace del correo y la navegación debe seguir funcionando sin señal. Los flujos deben tener pocos pasos para personas con poca experiencia.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo Router (rutas por archivos sobre React Navigation)** | Joel Acosta, Diego Camacho | Es el enfoque estándar de Expo; grupos de rutas por rol y redirecciones según sesión y rol; los enlaces del correo abren la pantalla correcta mediante el esquema de la app; rutas tipadas; poca configuración. | Las pantallas deben vivir en la carpeta app y esto se debe conciliar con Clean Architecture; las reglas de acceso por ruta mejoran la experiencia, pero no reemplazan la seguridad del servidor. |
| **React Navigation con configuración manual** | Carlos Serrano | Control total de los navegadores y mucha documentación. | Más código de configuración y de enlaces profundos manuales, sin ventaja clara para este proyecto. |
| **react-native-navigation (Wix)** | Leonor Yumi | Navegación nativa con buen rendimiento. | Configuración nativa compleja y poca afinidad con el flujo de Expo y EAS Build. |

### Decisión
Expo Router. Grupos de rutas: autenticación (inicio de sesión, primer acceso y recuperación), coordinador provincial, coordinador de recinto y veedor, cada uno con sus pestañas inferiores. El diseño raíz lee la sesión y el rol desde Zustand y redirige a la pantalla de inicio que corresponde. Los archivos de la carpeta app son delgados y delegan en la capa de presentación de cada funcionalidad (ADR-05).

### Consecuencias
Se gana una estructura de navegación clara por rol, enlaces profundos para la invitación y la recuperación, y menos código de configuración. Se asume depender de las convenciones de Expo Router. Obliga a definir el esquema de la app, a probar los enlaces del correo en un celular real y a no confiar en la navegación como único control de acceso, porque los permisos reales los aplica RLS (ADR-01).

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]

---

## ADR-09: Formularios y validación con React Hook Form y Zod

### Requerimientos relacionados
RF-02, RF-03, RF-04, RF-05, RF-07, RF-08, RF-09, RF-12, RNF-01, RNF-03, RNF-10, S-09

### Contexto
La app tiene varios formularios: inicio de sesión, creación de cuentas (cédula con módulo 10, correo, teléfono), contraseña del primer acceso, recintos nuevos y el acta, con muchos campos numéricos que deben validarse al digitar (enteros mayores o iguales a cero, ningún valor mayor que el total de sufragantes y suma exacta). Debe funcionar fluido en celulares de gama baja y mostrar mensajes en español sencillo.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **React Hook Form con Zod (zodResolver)** | Joel Acosta, Diego Camacho, Carlos Serrano, Leonor Yumi | Un esquema por formulario con tipos y reglas cruzadas (por ejemplo, la suma del acta); validación al cambiar cada campo; pocos renderizados por usar campos no controlados; ambas son gratuitas y de código abierto. | Son dos librerías; los campos de React Native se conectan con Controller; las reglas deben repetirse en la base de datos (RNF-03). |
| **Formik con Yup** | Joel Acosta | Muy conocidos y con mucha documentación. | Más renderizados por formulario, algo preocupante en gama baja, y tipado menos directo que con Zod. |
| **Validación manual con useState y funciones propias** | Carlos Serrano | Sin dependencias. | Mucho código repetido y propenso a errores en el acta, que tiene muchos campos y reglas cruzadas. |

### Decisión
React Hook Form con Zod. Los esquemas se escriben en el dominio de cada funcionalidad como reglas puras, sin dependencias de React Native (cédula, correo, teléfono y el acta con sus tres reglas de suma y topes), y la presentación los conecta con `zodResolver`. La validación corre al cambiar cada campo, los mensajes están en español sencillo y el botón de envío se bloquea mientras el formulario sea inválido o se esté enviando.

### Consecuencias
Se gana aviso inmediato de errores (RF-09), una sola fuente de reglas en la app y formularios ágiles. Se asume mantener las mismas reglas en la base de datos como segunda barrera (ADR-01). Obliga a escribir pruebas de los esquemas, en especial el módulo 10 de la cédula y la suma del acta, y a usar los mismos mensajes en toda la app.

### Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
