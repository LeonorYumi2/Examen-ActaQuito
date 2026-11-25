# Envío de evidencia de actas

El consumidor conserva el UUID del acta, la operación de guardado de cifras, la
versión que devolvió guardar_borrador_acta y un UUID separado para la evidencia.
La Edge Function enviar-evidencia-acta recibe datos JSON y el JPEG binario en
multipart/form-data. Valida el JWT y AMR password con Auth, pide la reserva
con el JWT original y verifica la ruta devuelta. PostgreSQL comprueba asignación,
autoría, revisión y coordenadas, y calcula la distancia con el margen configurado.

La carga usa upsert false. Ante una respuesta de carga fallida o ambigua, el
servicio intenta leer la ruta reservada. Confirma solo después de comprobar
la igualdad SHA-256 con el JPEG decodificado. Una nueva toma usa otro UUID.
Los fallos transitorios se reintentan con el mismo UUID y los mismos bytes.
Un objeto sin confirmación queda privado y no contribuye al conteo. La limpieza
automática queda pendiente. Debe evitar borrar evidencia confirmada o un objeto
que aún pueda confirmarse. La lectura de fotos para el panel requiere un
endpoint autorizado aparte.

El lado mayor de 1800 px coincide con la captura móvil. El tope de 4 MiB y el
límite de memoria de decodificación son controles técnicos del servicio. ADR-04
y RNF-08 no fijan una cifra de bytes ni un factor de calidad verificable en un
JPEG recibido. La legibilidad y la nitidez siguen en captura. El servidor valida
el JPEG y sus dimensiones. Haversine no acredita el origen físico del GPS.

## Despliegue cuando se autorice

1. Aplicar completa la migración 00500 en SQL Editor. Las fases 00100–00400
   ya se aplicaron y no se vuelven a ejecutar.
2. Desde la raíz, ejecutar:
   supabase functions deploy enviar-evidencia-acta --project-ref <REF> --no-verify-jwt
   La función valida internamente el JWT con Supabase Auth antes de leer el cuerpo.
3. Comprobar SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en el
   entorno de la función. Supabase los proporciona por defecto en el entorno
   alojado. La clave administrativa permanece exclusivamente en el servidor.
4. En un entorno de pruebas, usar un veedor activo con asignación vigente y
   una revisión propia. Verificar el objeto privado real, el reintento idéntico
   y que una mesa se reporte solo después de confirmar las dos dignidades.
   Probar una sesión ajena y una asignación revocada durante el envío.

Para comprobar tipos y pruebas localmente:
- deno check --no-lock --node-modules-dir=manual supabase/functions/enviar-evidencia-acta/index.mjs
- deno test --no-lock --node-modules-dir=manual supabase/tests/envio-evidencia.test.mts

El repositorio móvil de envío está disponible para el futuro consumidor de la
cola. Queda integrar persistencia de cada paso, recuperación tras reinicio,
conciliación con borradores del servidor y reintentos por conectividad.
