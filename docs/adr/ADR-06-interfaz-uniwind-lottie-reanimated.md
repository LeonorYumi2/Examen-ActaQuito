# ADR-06: Interfaz con Uniwind, Lottie y Reanimated

## Requerimientos relacionados
RF-13, RF-19, RNF-01, RNF-02, RNF-11, S-02

## Contexto
La interfaz debe servir a personas mayores o con poca experiencia, dar retroalimentación inmediata con Lottie y Reanimated, tener pantallas de inicio distintas por rol y usar los colores de la organización ficticia, evitando una apariencia genérica.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Uniwind (Tailwind CSS v4 para React Native) con tema propio, lottie-react-native y Reanimated** | Carlos Serrano, Joel Acosta, Leonor Yumi, Diego Camacho | Estilos con clases y tokens de color y tipografía definidos en CSS; se compilan en el build, sin costo en ejecución; soportado en Expo; identidad única con los colores de la organización. | Requiere Tailwind v4 y una versión reciente de Expo; existe una versión Pro de pago y se usa la gratuita, que no ofrece clases de animación, por lo que las animaciones se escriben con Reanimated. |
| **StyleSheet con tema propio** | Leonor Yumi | Sin dependencias y control total. | Más código repetitivo, sin utilidades y más difícil mantener la coherencia visual con poco tiempo. |
| **React Native Paper** | Diego Camacho | Componentes listos y accesibles. | Aspecto Material genérico si no se personaliza mucho, justo lo que se quiere evitar. |

## Decisión
Uniwind con tema propio. Componentes reutilizables (chips de estado de acta, indicador de conexión y actas pendientes, tarjetas, botón de envío que se bloquea) y animaciones Lottie para proceso, éxito y error y Reanimated para transiciones.

## Consecuencias
Se gana una interfaz distintiva y coherente en los tres roles, con desarrollo rápido. Se asume una librería joven y mantener sus versiones compatibles con Expo. Obliga a definir una paleta única, letra y botones grandes, la opción de mostrar la contraseña y a evitar los modales genéricos.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
