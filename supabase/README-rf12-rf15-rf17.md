# Correcciones, detalle de actas y Sentry

## Despliegue

1. Aplicar 00600 y luego 00700 por separado en SQL Editor. Conservar en cada archivo su transacción completa.
2. Desplegar desde la raíz con `npx supabase functions deploy descargar-evidencia-acta --project-ref <REF>`. Mantener la verificación JWT configurada y comprobar una sesión de contraseña real con las claves del proyecto. El servicio también verifica identidad y AMR y aplica RLS con el JWT del usuario. Usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en Edge. La clave administrativa debe permanecer fuera de Expo.
3. Coordinar 00700 con la actualización que captura GPS. Los clientes antiguos conservan el alta inicial y la repetición exacta de operaciones históricas, pero su RPC anterior rechaza correcciones nuevas sin ubicación.

## Contratos para la interfaz

- Capturar con `capturarGpsCorreccion()` y pasar el resultado como último argumento a `encolarCorreccionActa(referencia, acta, cifras, ubicacion)`. Cifras y GPS viajan juntos con el mismo UUID en cada reintento. Una corrección antigua pendiente sin GPS requiere intervención.
- Usar `repositorioDetalleActa.cargarHistorial(acta)` y `repositorioDetalleActa.descargarFotografia(acta)`. La foto se entrega como URI de datos privada y debe conservarse solo en memoria, con caché de imagen deshabilitada. Liberarla al salir del detalle o cambiar de cuenta. El historial expone la cédula enmascarada y conserva nulos para ubicaciones históricas desconocidas.
- El monitoreo existente aporta coordenadas de evidencia, horas y distancia. La interfaz aún debe conectar el zoom, la ubicación en el mapa y el historial.

## Sentry y EAS

Definir `EXPO_PUBLIC_SENTRY_DSN` para el destino público del SDK y `SENTRY_ORG` y `SENTRY_PROJECT` para el plugin. Guardar `SENTRY_AUTH_TOKEN` como secreto de EAS para subir mapas de código. La configuración de compilación debe recibir también organización y proyecto al resolver el plugin. La telemetría solo se inicia en builds que no sean de desarrollo y tengan un DSN configurado.

Desde presentación, llamar a `definirPantallaTelemetria()` con una etiqueta incluida en el contrato, sin parámetros de ruta. Probar en un Android con un evento de muestra, una carga agotada y modo avión seguido de reconexión. Inspeccionar en Sentry el contexto, simbolicación y ausencia de datos sensibles. La captura automática de cierres nativos queda deshabilitada hasta comprobar y configurar su propia sanitización. RF-17 requiere además probar la entrega diferida en Android real.
