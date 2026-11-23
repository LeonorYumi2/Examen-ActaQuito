# ADR-09: Formularios y validación con React Hook Form y Zod

## Requerimientos relacionados
RF-02, RF-03, RF-04, RF-05, RF-07, RF-08, RF-09, RF-12, RNF-01, RNF-03, RNF-10, S-09

## Contexto
La app tiene varios formularios: inicio de sesión, creación de cuentas (cédula con módulo 10, correo, teléfono), contraseña del primer acceso, recintos nuevos y el acta, con muchos campos numéricos que deben validarse al digitar (enteros mayores o iguales a cero, ningún valor mayor que el total de sufragantes y suma exacta). Debe funcionar fluido en celulares de gama baja y mostrar mensajes en español sencillo.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **React Hook Form con Zod (zodResolver)** | Joel Acosta, Diego Camacho, Carlos Serrano, Leonor Yumi | Un esquema por formulario con tipos y reglas cruzadas (por ejemplo, la suma del acta); validación al cambiar cada campo; pocos renderizados por usar campos no controlados; ambas son gratuitas y de código abierto. | Son dos librerías; los campos de React Native se conectan con Controller; las reglas deben repetirse en la base de datos (RNF-03). |
| **Formik con Yup** | Joel Acosta | Muy conocidos y con mucha documentación. | Más renderizados por formulario, algo preocupante en gama baja, y tipado menos directo que con Zod. |
| **Validación manual con useState y funciones propias** | Carlos Serrano | Sin dependencias. | Mucho código repetido y propenso a errores en el acta, que tiene muchos campos y reglas cruzadas. |

## Decisión
React Hook Form con Zod. Los esquemas se escriben en el dominio de cada funcionalidad como reglas puras, sin dependencias de React Native (cédula, correo, teléfono y el acta con sus tres reglas de suma y topes), y la presentación los conecta con `zodResolver`. La validación corre al cambiar cada campo, los mensajes están en español sencillo y el botón de envío se bloquea mientras el formulario sea inválido o se esté enviando.

## Consecuencias
Se gana aviso inmediato de errores (RF-09), una sola fuente de reglas en la app y formularios ágiles. Se asume mantener las mismas reglas en la base de datos como segunda barrera (ADR-01). Obliga a escribir pruebas de los esquemas, en especial el módulo 10 de la cédula y la suma del acta, y a usar los mismos mensajes en toda la app.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
