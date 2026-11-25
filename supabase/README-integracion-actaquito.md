# Integración de invitaciones, asignaciones y evidencia

## Contratos para presentación

Los formularios pueden importar identidadInvitacion, asignacionCoordinador y
asignacionVeedor desde src/features/users/domain/gestion-usuarios. La cédula
aplica el mismo módulo 10 que 00200, incluido el código 30. El servidor conserva
la validación de unicidad y ámbito.

- invitarCoordinador(identidad): el provincial invita. Devuelve usuarioId.
- invitarVeedor(identidad, recinto): el coordinador del recinto invita. Devuelve usuarioId.
- asignarCoordinador({ recinto, coordinador }): devuelve asignacionId.
- asignarVeedor({ recinto, mesa, veedor, asignacionSaliente }): devuelve asignacionId.
  AsignacionSaliente es null si no hay asignación vigente. Para reemplazar, pasar
  el id de la asignación que la interfaz acaba de consultar. Ante asignacion_cambio,
  refrescar los datos antes de pedir una nueva confirmación.

Las funciones de gestión están en src/features/users/data/gestion-usuarios.
El resultado usuarioId identifica el perfil creado o conciliado. La persona debe
aceptar el correo, establecer su contraseña e iniciar sesión. Solo entonces 00300
permite asignarla. Si todavía no ha activado la cuenta, mostrar el mensaje
asignacion_invalida y conservar la asignación anterior. Habilitado por sí solo
no informa si se completó la activación. El reenvío administrativo conserva el
procedimiento de README-fase-2b.md.

Para un veedor, guardar primero los valores y la evidencia mediante el flujo
local existente. Después, llamar enviarBorradorLocal({ usuario, mesa, dignidad },
siglas) y consultar estadoEnvioBorrador con la misma referencia. Ambos contratos
están en src/features/actas/data/enviar-borrador. Pasar el id del usuario de la
sesión y las cinco siglas de la dignidad. Proteger el botón mientras la promesa
está activa y mostrar la confirmación solo al recibir confirmada: true. Ese
resultado corresponde a un acta. Para el avance de la mesa, consultar
mesas_actas_reportadas, que exige confirmación de las dos dignidades.

El primer intento guarda en SQLite cifrado una instantánea independiente del
borrador editable, los dos UUID, la revisión devuelta por 00400 y, finalmente,
la confirmación. Un reintento continúa esa instantánea, incluso después de cerrar
la aplicación. Si el usuario cambia el borrador mientras hay un envío pendiente,
la interfaz debe explicar que el reintento corresponde a la captura anterior.
Todavía falta un flujo explícito para sustituir una captura pendiente con errores
definitivos y conciliar conflictos con borradores que ya existen en otro teléfono.

## Orden de despliegue autorizado

1. En Dashboard verificar autorregistro deshabilitado, confirmación de correo,
   Gmail SMTP y redirecciones exactas actaquito://auth/confirm y
   actaquito://auth/reset-password.
2. En SQL Editor aplicar el archivo completo
   migrations/20261125000500_preparar_storage_evidencia.sql una sola vez.
   Confirmar que actas-evidencia sea privado y que mesas_actas_reportadas exista.
   Las migraciones 00100 a 00400 ya están aplicadas.
3. En el entorno de funciones verificar SUPABASE_URL, SUPABASE_ANON_KEY y
   SUPABASE_SERVICE_ROLE_KEY, que Supabase aporta en el entorno alojado.
   Configurar el secreto ACTAQUITO_AUTH_REDIRECT_URL como actaquito://auth/confirm.
   La contraseña de aplicación de Gmail permanece en Dashboard Auth SMTP.
4. Desde la raíz del repositorio, ejecutar:
   supabase functions deploy invitar-usuario --project-ref <REF>
   supabase functions deploy enviar-evidencia-acta --project-ref <REF>
   Las dos funciones comprueban el JWT explícitamente con Supabase Auth.
5. Probar con cuentas autorizadas en un entorno de ensayo. Invitar al coordinador,
   validar el correo en Android, fijar su contraseña, iniciar sesión y asignarle
   un recinto. Repetir con un veedor del recinto y asignarle una mesa. Intentar
   asignación antes de activar, una fuera del ámbito y otra con un id saliente
   desactualizado.
6. Guardar dos borradores con JPEG y GPS reales de la misma mesa. Enviar una
   dignidad y comprobar que la mesa siga pendiente. Tras enviar la otra,
   verificar una sola fila reportada, ambas revisiones vinculadas y el bucket
   privado. Repetir la misma operación y verificar que conserve el mismo objeto.

## Dependencias pendientes

Los ensayos con Gmail, entrega de deep links, JWT emitidos y bytes reales de
Storage requieren Supabase y un dispositivo. La cola automática por conectividad,
la conciliación entre dispositivos, la limpieza de objetos abandonados y la
descarga autorizada de fotos quedan pendientes. El Haversine comprueba el ámbito
a partir de los datos recibidos y no acredita por sí mismo el origen físico del GPS.
