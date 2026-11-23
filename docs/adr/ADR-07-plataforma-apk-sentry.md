# ADR-07: Plataforma, generación del APK y reporte de errores

## Requerimientos relacionados
RF-17, RNF-10, RNF-11

## Contexto
Hay que entregar React Native con Expo y un APK instalable que funcione en celulares de distintas versiones, incluida la gama baja. La organización debe enterarse de cierres y de errores que impiden completar una tarea (por ejemplo, una foto que no se sube), con dispositivo, versión de Android, versión de la app y pantalla, incluso los ocurridos sin conexión.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo con EAS Build (perfil preview a APK) y Sentry** | Joel Acosta, Leonor Yumi | Compilación en la nube sin Android Studio; Sentry captura cierres y errores manuales con contexto, guarda eventos sin red y los envía después; ambos tienen plan gratuito. | EAS gratuito da hasta 15 builds de Android al mes en cola de baja prioridad, con máximo de 45 minutos por build; Sentry gratuito tiene 1 usuario y 5.000 errores al mes. |
| **React Native CLI con Firebase Crashlytics** | Carlos Serrano | Control nativo total e integración sólida de Crashlytics. | No cumple la condición de usar Expo (RNF-11), exige configuración nativa pesada y no encaja con el backend elegido. |
| **Expo con compilación local (prebuild y Gradle) y Bugsnag** | Diego Camacho | Sin esperar colas ni gastar cuota de builds. | Requiere Android SDK y Java bien configurados en cada equipo; Bugsnag tiene menos ejemplos con Expo y plan gratuito más limitado. |

## Decisión
Expo con EAS Build y Sentry. Se genera un APK de prueba pronto, se deja la compilación local como respaldo si se agota la cuota y se captura con `captureException` los errores no fatales de subida y sincronización.

## Consecuencias
Se gana velocidad, menos problemas de entorno y visibilidad inmediata de los fallos. Se asume depender de la nube y de las cuotas gratuitas, por lo que no se desperdiciar simultáneamente builds. Obliga a mantener los paquetes compatibles con la versión de Expo, a provocar un error de prueba para demostrar el reporte y a probar el APK en un celular real de gama baja.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
