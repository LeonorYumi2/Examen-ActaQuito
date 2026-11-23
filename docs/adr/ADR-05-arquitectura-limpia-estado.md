# ADR-05: Arquitectura del código y manejo de estado

## Requerimientos relacionados
RF-13, RF-19, RNF-05, RNF-10, RNF-11

## Contexto
La entrega exige Clean Architecture y su defensa oral. La estructura debe ser clara, mantener la lógica de negocio independiente de React Native y de Supabase, y resolver estado de sesión y rol, estado de cada acta, conexión visible en todas las pantallas y caché de datos remotos.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Organización por funcionalidad (cuentas, actas, recintos, panel) con capas domain, data y presentation, y Zustand con TanStack Query para el estado** | Joel Acosta, Leonor Yumi | Alta cohesión; las dependencias se ven; fácil de explicar y repartir; poco código de estado, con caché y reintentos resueltos e integración con Realtime. | Más carpetas y algo de repetición; dos librerías de estado que combinar. |
| **Tres capas globales con Redux Toolkit** | Diego Camacho | Estructura simple y herramientas de depuración estándar. | Las carpetas mezclan temas al crecer y Redux exige más código repetitivo para el plazo. |
| **Carpetas por tipo de archivo (estilo MVC) con Context API** | Carlos Serrano | Conocida por todos y sin dependencias. | No cumple la restricción de Clean Architecture y el Context provoca renderizados innecesarios sin caché de datos. |

## Decisión
Organización por funcionalidad. El dominio (entidades, casos de uso e interfaces de repositorio) no importa nada de React Native ni de Supabase. Zustand guarda sesión, rol y estado de la interfaz; TanStack Query maneja los datos remotos, usados desde la presentación a través de casos de uso.

## Consecuencias
Se gana testabilidad, facilidad de defensa y posibilidad de cambiar de proveedor. Se asume más código base. Obliga a usar inyección de dependencias, mapeadores entre datos y entidades, claves de consulta definidas y su invalidación cuando llegan cambios de Realtime.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
