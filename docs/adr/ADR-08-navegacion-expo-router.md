# ADR-08: Navegación con Expo Router

## Requerimientos relacionados
RF-01, RF-03, RF-04, RF-14, RF-19, RNF-01, RNF-10, RNF-11, S-11

## Contexto
Cada rol (coordinador provincial, coordinador de recinto y veedor) entra a su propia pantalla de inicio y menú. La sesión se mantiene abierta, el primer acceso y la recuperación de contraseña llegan desde un enlace del correo y la navegación debe seguir funcionando sin señal. Los flujos deben tener pocos pasos para personas con poca experiencia.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Expo Router (rutas por archivos sobre React Navigation)** | Joel Acosta, Diego Camacho | Es el enfoque estándar de Expo; grupos de rutas por rol y redirecciones según sesión y rol; los enlaces del correo abren la pantalla correcta mediante el esquema de la app; rutas tipadas; poca configuración. | Las pantallas deben vivir en la carpeta app y esto se debe conciliar con Clean Architecture; las reglas de acceso por ruta mejoran la experiencia, pero no reemplazan la seguridad del servidor. |
| **React Navigation con configuración manual** | Carlos Serrano | Control total de los navegadores y mucha documentación. | Más código de configuración y de enlaces profundos manuales, sin ventaja clara para este proyecto. |
| **react-native-navigation (Wix)** | Leonor Yumi | Navegación nativa con buen rendimiento. | Configuración nativa compleja y poca afinidad con el flujo de Expo y EAS Build. |

## Decisión
Expo Router. Grupos de rutas: autenticación (inicio de sesión, primer acceso y recuperación), coordinador provincial, coordinador de recinto y veedor, cada uno con sus pestañas inferiores. El diseño raíz lee la sesión y el rol desde Zustand y redirige a la pantalla de inicio que corresponde. Los archivos de la carpeta app son delgados y delegan en la capa de presentación de cada funcionalidad (ADR-05).

## Consecuencias
Se gana una estructura de navegación clara por rol, enlaces profundos para la invitación y la recuperación, y menos código de configuración. Se asume depender de las convenciones de Expo Router. Obliga a definir el esquema de la app, a probar los enlaces del correo en un celular real y a no confiar en la navegación como único control de acceso, porque los permisos reales los aplica RLS (ADR-01).

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
