# ADR-03: Registro sin conexión, sincronización y sesión cifrada en el teléfono

## Requerimientos relacionados
RF-01, RF-13, RF-14, RNF-04, RNF-05, RNF-06, S-11

## Contexto
Los recintos rurales pueden no tener señal. Valores, foto y ubicación deben guardarse en el teléfono, sobrevivir al cierre de la app o al apagado y enviarse solos sin duplicarse. La sesión debe seguir abierta y funcionar sin señal, y tanto ella como los datos sensibles se guardan cifrados y se borran al cerrar sesión, salvo las actas pendientes.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **SQLite (expo-sqlite) con patrón outbox y UUID generado en el teléfono; la llave de cifrado de la sesión y los datos sensibles se guarda en expo-secure-store** | Leonor Yumi, Carlos Serrano, Joel Acosta, Diego Camacho | Consultas locales; reintentos idempotentes gracias al UUID; guarda estados y rutas de fotos; la llave queda en el almacén seguro de Android; funciona con Expo. | Hay que programar la cola, los reintentos, el estado de cada acta y un adaptador de cifrado, porque el almacén seguro admite valores pequeños. |
| **WatermelonDB con sincronización por lotes** | Joel Acosta | Sincronización pensada para offline. | Configuración nativa más compleja con Expo, curva de aprendizaje alta para el plazo y la sesión cifrada igual debe resolverse aparte. |
| **AsyncStorage o MMKV con una cola de objetos** | Carlos Serrano | Muy simple de usar. | AsyncStorage no cifra (incumple RNF-04); MMKV con cifrado exige módulo nativo y guardar la llave en un lugar seguro; ambos son poco robustos para fotos, estados y reintentos. |

## Decisión
SQLite con outbox y llave de cifrado en `expo-secure-store`. Cada acta nace con UUID y estados en proceso, pendiente de envío, enviada o con error (RF-13); NetInfo detecta la señal y un servicio reintenta solo. Mesas, organizaciones y candidatos se descargan antes de la jornada. Al cerrar sesión se borran tokens y cachés y se conserva solo la cola de actas pendientes.

## Consecuencias
Se gana durabilidad, cero duplicados y sesión protegida. Se asume escribir y probar la lógica de sincronización y el adaptador de cifrado. Obliga a pruebas en modo avión y con cierres forzados, y a limitar lo que funciona sin conexión a lo definido en S-11.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
