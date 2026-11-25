# ADR-02: Creación de cuentas, verificación de correo y envío con Gmail SMTP

## Requerimientos relacionados
RF-01, RF-02, RF-03, RF-04, RF-07, S-03, S-04, S-05

## Contexto
Cada coordinador debe crear cuentas de otros sin perder su sesión, sin conocer la contraseña de nadie y sin autorregistro. El correo se verifica antes de registrar actas, el titular define su propia contraseña y la recuperación es autónoma. El correo integrado de Supabase tiene un límite de envío por hora demasiado bajo para crear y verificar varias cuentas en la jornada.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| **Edge Function con rol de servicio que crea la cuenta y envía la invitación y la recuperación por Gmail SMTP (SMTP propio en Supabase Auth)** | Diego Camacho, Leonor Yumi, Carlos Serrano, Joel Acosta | Nadie conoce la contraseña (cumple RF-03); sin autorregistro; no cierra la sesión de quien crea; gratuito y sin dominio propio ni registros DNS; envía a cualquier destinatario; al activar SMTP propio en Supabase Auth sube el límite a 30 correos por hora y se puede ajustar; el límite de Gmail gratuito (500 destinatarios por día) cubre de sobra las 49 cuentas, las reservas y las recuperaciones. | El remitente es la dirección de Gmail, no un dominio de la organización; la entrega puede caer en spam y Google puede bloquear envíos que considere sospechosos; exige verificación en dos pasos y una contraseña de aplicación, que se guarda solo como secreto de Supabase Auth; el límite de 500 por día se comparte con cualquier otro correo de esa cuenta. |
| **Edge Function con invitación y recuperación enviadas por Resend como SMTP propio (descartada)** | Diego Camacho, Leonor Yumi | Mejor entrega y remitente con dominio propio; el plan gratuito permite 100 correos al día y 3.000 al mes. | Resend exige un dominio verificado (registros DNS) para enviar a cualquier destinatario; sin dominio solo envía al correo de la propia cuenta, y el equipo no cuenta con un dominio; la verificación puede tardar horas; hay que guardar la clave de API como secreto del servidor. |
| **Edge Function con invitación enviada por Brevo (SMTP smtp-relay.brevo.com, puerto 587)** | Joel Acosta | Plan gratuito de 300 correos al día; permite verificar un único remitente (por ejemplo, un Gmail) sin comprar dominio; se conecta a Supabase Auth como SMTP propio con el mismo procedimiento. | Las cuentas nuevas pasan por una validación de Brevo que puede demorar; sin autenticar un dominio la entrega es peor; agrega un proveedor externo más y otra credencial que cuidar. Queda como plan B si Gmail bloqueara el envío. |

## Decisión
Edge Function con invitación y recuperación enviadas por Gmail SMTP como servidor SMTP propio de Supabase Auth. Se descarta crear cuentas con signUp desde la app porque cierra la sesión de quien crea y permite el autorregistro (RF-01). La cuenta queda sin verificar y no puede registrar actas hasta que el titular confirme su correo y defina su contraseña.

## Justificación técnica
Supabase Auth conserva el envío de enlaces y su verificación. La Edge Function autoriza el alta jerárquica e inicia la invitación. Gmail SMTP permite usar el remitente disponible sin comprar un dominio, mientras que Brevo queda como respaldo si Gmail bloquea el envío.

## Consecuencias
Se gana cumplimiento de RF-01, RF-02, RF-03 y RF-04 sin el límite horario del correo integrado. Se asume depender de Gmail, de sus políticas de envío y de su cuota de 500 destinatarios diarios. Obliga a configurar la verificación en dos pasos y una contraseña de aplicación de Gmail, probar el correo real antes de la entrega y crear y verificar veedores de reserva antes de la jornada (S-05).

## Minuto del video
35:17 38:00 observacion: nueva decisión del recurso con Gmail SMTP en nuevo video
