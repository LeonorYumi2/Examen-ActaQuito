# ADR-01: Backend, seguridad en el servidor, historial inmutable y tiempo real

## Requerimientos relacionados
RF-02, RF-05, RF-06, RF-08, RF-09, RF-12, RF-15, RF-16, RF-18, RF-19, RNF-03, RNF-05, RNF-07, RNF-09, S-01, S-03, S-06, S-07, S-09, S-10, S-12

## Contexto
La app necesita autenticación, base de datos con permisos por rol y territorio, almacenamiento de fotos, validaciones que se cumplan aunque la app sea modificada, un historial que no se pueda alterar, y resultados que se actualicen en segundos. El equipo no puede administrar servidores y el costo debe ser cero.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Supabase (PostgreSQL con RLS, Auth, Storage, Realtime y Edge Functions)** | Carlos Serrano, Diego Camacho | Un solo servicio gratuito que cubre todo: RLS y restricciones (CHECK, UNIQUE) aplican permisos y validaciones en la base; triggers guardan el historial; los conteos son consultas SQL; Realtime actualiza el panel sin recargar. | No trae sincronización offline y hay que escribirla en la app; el plan gratuito pausa el proyecto tras 1 semana sin actividad y limita la base a 500 MB; las reglas viven en la base y en la app. |
| **Firebase (Firestore, Auth, Storage y Functions)** | Leonor Yumi | Offline nativo en Firestore; escuchas en tiempo real y Crashlytics integrados. | NoSQL: los conteos por candidato y recinto exigen funciones o duplicar datos; los permisos por territorio, las validaciones y el historial inmutable son más difíciles de expresar y probar. |
| **Appwrite** | Joel Acosta | Código abierto, SDK sencillo y permisos por documento. | Menos ejemplos con React Native; sin SQL para agregados; tiempo real, funciones e historial requieren más configuración propia. |

## Decisión
Supabase. Decisiones que incluye: (1) RLS, restricciones y funciones en PostgreSQL aplican permisos y validaciones de cédula, duplicados y suma de votos, repetidas en el dominio de la app para el aviso inmediato; (2) una tabla de versiones de solo inserción, llenada por trigger y sin permisos de UPDATE ni DELETE, guarda quién, cuándo y los valores anteriores y nuevos, y cada foto reemplazada usa una ruta nueva; (3) la hora de recepción y la versión vigente las define el servidor; (4) Supabase Realtime actualiza el panel, con una consulta de respaldo al volver a primer plano, y los resultados salen de una vista SQL con porcentajes sobre votos válidos y nulos y blancos por separado, rotulados como preliminares.

## Consecuencias
Se gana seguridad real, datos íntegros, trazabilidad y tiempo real sin infraestructura nueva. Se asume escribir la cola offline en la app, mantener las reglas de validación en dos lugares y depender del plan gratuito (reactivar el proyecto antes de la jornada y de la defensa, y verificar la cuota de conexiones de Realtime). Obliga a diseñar tablas, políticas RLS y migraciones desde el inicio y a probar las políticas por cada rol.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
