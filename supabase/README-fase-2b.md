# Fase 2B · Usuarios, roles y autenticación

El backend aplica RF-01 a RF-07, RF-19, RNF-03, RNF-04 y S-03 a S-05. Las migraciones 2B dependen del esquema de la fase 2A. El cliente futuro consumirá Auth y estos contratos por adaptadores de infraestructura. El dominio móvil conservará sus entidades y casos de uso sin dependencias de Supabase.

## Verificación local

Usar un proyecto Supabase local desechable. La configuración local incluida deshabilita el autorregistro y exige confirmación de correo. Definir la URL de redirección de prueba en `additional_redirect_urls`. Mantener deshabilitados el acceso anónimo y los proveedores de inicio de sesión ajenos al flujo aprobado.

1. Usar una instancia local de prueba con la fase 2A ya disponible. Aplicar solo las dos nuevas migraciones 2B. Verificar la instancia destino antes de usar cualquier comando de aplicación.
2. Para una comprobación transaccional de SQL y RLS, ejecutar `psql "<URL_POSTGRES_LOCAL>" -X -v ON_ERROR_STOP=1 -f supabase/tests/fase_2b.sql` sobre la base de prueba ya preparada. Las identidades de prueba y sus cambios se revierten al terminar. Esta prueba simula los estados internos de Auth. Ejecutar además `node --experimental-vm-modules --test supabase/tests/invitaciones.test.mjs` con Node 24 para probar el flujo de la Edge Function con el SDK simulado.
3. Servir `invitar-usuario` con las variables del entorno local y probar los correos en el buzón local de Supabase. La función valida el token de acceso con Auth en cada solicitud. `supabase functions serve invitar-usuario` usa el punto de entrada de `config.toml`. La comprobación de JWT la realiza la función con Auth, en lugar del verificador legado del gateway.
4. Ejecutar el aprovisionamiento inicial y aceptar la invitación. Con el JWT de invitación, comprobar que la Edge Function devuelve 403 y que la Data API no devuelve filas operativas. Establecer la contraseña, cerrar esa sesión e iniciar otra con `signInWithPassword`. Repetir las comprobaciones y forzar una renovación de la sesión con `refreshSession`. Invitar un coordinador, asignarle un recinto e invitar dos veedores. Probar `INSERT` de recinto con devolución, cambios de mesa, acceso cruzado y reemplazos con una cuenta pendiente.
5. Probar autorregistro denegado, recuperación de contraseña, duplicados y rechazo de campos de rol o actor. Usar una invitación pendiente o vencida para probar el reenvío y confirmar que el UUID de Auth y el del perfil siguen siendo los mismos. Simular un fallo SMTP antes del alta y una respuesta perdida después del alta. Probar el procedimiento administrativo de abajo en ambos casos. Validar la entrega con Resend en un entorno de prueba autorizado.

## Aprovisionamiento del provincial

Ejecutar el script `scripts/aprovisionar-provincial.mts` desde un entorno administrativo de confianza, apuntando inicialmente a Supabase local. Inyectar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `ACTAQUITO_AUTH_REDIRECT_URL` desde el entorno seguro. Pasar por entrada estándar un objeto JSON con `correo`, `cedula`, `nombres`, `apellidos` y `telefono`. Los datos reales los proporciona el operador. No guardar un archivo con datos personales o secretos en el repositorio.

```sh
deno run --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ACTAQUITO_AUTH_REDIRECT_URL --allow-net=127.0.0.1:54321 supabase/scripts/aprovisionar-provincial.mts
```

El comando permite el host y puerto locales por defecto. Ajustar el permiso de red al host exacto de la instancia de prueba cuando difiera. La semilla 2A queda separada. El script invoca la misma reserva e invitación que la Edge Function con la variante operativa que crea un único provincial. Repetir con los mismos datos permite recuperar una reserva idéntica. Para un error persistente o una invitación expirada, usar el procedimiento administrativo siguiente. La sustitución de una identidad provincial confirmada requiere un procedimiento acordado.

## Reenviar o corregir una invitación

Usar las mismas variables del entorno administrativo del aprovisionamiento. El script recibe el correo por entrada estándar y la operación como argumento. En los ejemplos, el permiso de red apunta a Supabase local.

```sh
deno run --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ACTAQUITO_AUTH_REDIRECT_URL --allow-net=127.0.0.1:54321 supabase/scripts/gestionar-invitacion.mts reenviar
deno run --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ACTAQUITO_AUTH_REDIRECT_URL --allow-net=127.0.0.1:54321 supabase/scripts/gestionar-invitacion.mts cancelar
```

- `reenviar` reutiliza la reserva y pide a Auth una nueva invitación mientras el correo esté pendiente. Si el correo ya está confirmado, concilia el perfil cuando corresponda y remite al titular a recuperación. Un perfil existente por sí solo no demuestra que el proveedor haya entregado el mensaje.
- `cancelar` libera los datos solo cuando no hay una identidad de Auth para la reserva ni para su correo. Si se corrigieron los datos, se crea después una nueva invitación desde el flujo original. No eliminar filas manualmente de Auth. El alta de Auth y la cancelación comparten un bloqueo por correo, y el identificador anterior no sirve para un alta tardía.
- Si cambia el coordinador que solicitó una invitación, el operador puede conciliar una identidad desde este script, conservando el recinto y el autor originales de la reserva. La conciliación no asigna mesas ni cambia el rol. Si Auth tiene una identidad ajena a la reserva o el correo no coincide, el script requiere revisión administrativa.
- Confirmar que el proyecto de prueba permite crear el trigger 2B sobre `auth.users`. El trigger registra el UUID de Auth al crear la identidad y evita reutilizar una reserva cancelada. El resto del proceso consume el UUID privado y el estado vigente de Auth.

## Contrato de cuentas y correo

- `POST invitar-usuario` recibe un JWT del solicitante y los cinco campos de identidad. El provincial omite `recinto` al invitar coordinadores. Un coordinador incluye el código del recinto que administra al invitar veedores. El cliente nunca indica rol, actor, contraseña ni URL de retorno.
- El endpoint devuelve `usuarioId` cuando queda enlazado el perfil. Un reintento idéntico puede recuperar el perfil aunque se haya perdido la respuesta. Un perfil creado confirma el aprovisionamiento, mientras la entrega del correo se comprueba en Auth y el proveedor SMTP. Una invitación enviada no otorga permisos antes de verificar el correo y fijar la contraseña.
- Para el primer acceso, la redirección permitida procesa el enlace de invitación y establece la sesión mediante Auth. El titular define su contraseña con `auth.updateUser({ password })`. Auth conserva el hash. La sesión de enlace sirve para fijar la contraseña. Después, iniciar sesión con `auth.signInWithPassword({ email, password })` y consultar el perfil. Los permisos operativos exigen `amr` con método `password`, además de la cuenta activa. El modo de enlace, la plantilla y el intercambio de sesión deben verificarse de extremo a extremo en la integración móvil.
- La recuperación inicia con `auth.resetPasswordForEmail(correo, { redirectTo })`, usando una redirección permitida. Al abrir el enlace de recuperación y establecer la sesión, el titular usa `auth.updateUser({ password })` y vuelve a iniciar sesión con la contraseña nueva. El cliente debe dar una respuesta genérica para evitar enumerar cuentas.
- Configurar el SMTP de Resend en Supabase Auth con un dominio verificado, un remitente autorizado y la credencial de Resend en los secretos del proveedor. Configurar las redirecciones de invitación y recuperación en la lista de URL permitidas. Verificar que las plantillas y el rastreo de enlaces del proveedor no alteren los enlaces de Auth. La clave administrativa se usa exclusivamente en el servidor y en el aprovisionamiento administrativo.
- RNF-04 conserva para la app la sesión cifrada y el borrado local descritos en ADR-03. La fase 2B solo cubre el backend. El perfil queda fuera del ámbito operativo si cambia el correo de Auth y deja de coincidir con el correo aprovisionado. La edición de correo y su conciliación requieren un flujo administrativo posterior.

## Ámbitos y operaciones

- Provincial. Lee el territorio de Pichincha, las asignaciones y los reemplazos del ámbito. Puede agregar un recinto en ese territorio y llamar a `asignar_coordinador(recinto, coordinador)`. Si el entrante aún no confirmó su correo o no estableció su contraseña, la RPC conserva al coordinador vigente y el provincial puede repetir la operación tras la activación. La base permite asignar explícitamente un mismo coordinador a más de un recinto y conserva un solo coordinador vigente por recinto. Confirmar con el equipo la cardinalidad inversa antes de habilitar esta acción para casos con varios recintos.
- Coordinador de recinto. Lee sus recintos asignados, mesas, veedores del recinto e historial de personal. Llama a `asignar_veedor(recinto, mesa, veedor, asignacion_saliente)`. Para una primera asignación, omitir `asignacion_saliente`. Para un reemplazo, indicar la asignación que se espera cerrar. Una petición desactualizada falla y la asignación entrante, el cierre y la auditoría se escriben juntos.
- Veedor. Lee su perfil y las mesas que tiene asignadas en ese momento, sus recintos y ancestros, la configuración de captura y los catálogos electorales. Un reemplazo retira inmediatamente la lectura de la mesa al saliente en el servidor. Las decisiones de entrega de actas pendientes quedan para la fase correspondiente.
- Los perfiles se consultan con las columnas concedidas `id, rol, nombres, apellidos, recinto_base, habilitado`. Cédula, correo y teléfono se reservan al servidor. Las escrituras de personal se hacen mediante funciones autorizadas. Los enlaces de invitación o recuperación habilitan el flujo de contraseña en Auth. La lectura del perfil de la aplicación y el resto del acceso operativo se habilitan al iniciar sesión con contraseña.
- Un veedor puede cubrir varias mesas de su recinto. El uso de veedores ya asociados a otros recintos queda pendiente de decisión. Para reemplazar con una cuenta recién creada, se completa primero la verificación y la contraseña conforme a S-05. Este paso conserva la asignación existente hasta que el entrante esté habilitado.