# ADR-02: Creación de cuentas, verificación de correo y envío con Resend

## Requerimientos relacionados
RF-01, RF-02, RF-03, RF-04, RF-07, S-03, S-04, S-05

## Contexto
Cada coordinador debe crear cuentas de otros sin perder su sesión, sin conocer la contraseña de nadie y sin autorregistro. El correo se verifica antes de registrar actas, el titular define su propia contraseña y la recuperación es autónoma. El correo integrado de Supabase tiene un límite de envío por hora demasiado bajo para crear y verificar varias cuentas en la jornada.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Edge Function con rol de servicio que crea la cuenta y envía la invitación y la recuperación por Resend (SMTP propio en Supabase Auth)** | Diego Camacho, Leonor Yumi, Carlos Serrano, Joel Acosta | Nadie conoce la contraseña (cumple RF-03); sin autorregistro; no cierra la sesión de quien crea; el límite por hora se puede subir con SMTP propio; el plan gratuito de Resend permite 100 correos al día y 3.000 al mes. | Resend exige un dominio verificado (registros DNS) para enviar a cualquier destinatario; sin dominio solo envía al correo de la propia cuenta. Hay que guardar la clave de API como secreto del servidor. |
| **Edge Function con invitación enviada por el correo integrado de Supabase** | Carlos Serrano | No requiere dominio ni cuentas externas; configuración mínima. | Límite por hora muy bajo con el correo integrado: no alcanza para crear y verificar veedores y reemplazos durante la jornada. |
| **Edge Function que crea la cuenta con contraseña temporal entregada por el coordinador** | Joel Acosta | No depende del correo para el primer ingreso. | Quien crea la cuenta conoce la contraseña, lo que contradice RF-03, y debe comunicarla por un canal inseguro. |

## Decisión
Edge Function con invitación y recuperación enviadas por Resend como SMTP propio. Se descarta crear cuentas con `signUp` desde la app porque cierra la sesión de quien crea y permite el autorregistro (RF-01). La cuenta queda sin verificar y no puede registrar actas hasta que el titular confirme su correo y defina su contraseña.

## Consecuencias
Se gana cumplimiento de RF-01, RF-02, RF-03 y RF-04 sin el límite horario del correo integrado. Se asume depender de Resend, de un dominio propio con registros DNS (la verificación puede tardar desde minutos hasta unas horas, por lo que debe hacerse con tiempo) y de su cuota de 100 correos al día. Obliga a una pantalla de primer acceso, a probar el correo real antes de la entrega y a crear y verificar veedores de reserva antes de la jornada (S-05).

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
