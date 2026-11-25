# Documentación Técnica - ActaQuito

## Información General del Proyecto
- **Proyecto:** ActaQuito
- **Propósito:** Aplicación móvil de control electoral para una organización política en la provincia de Pichincha, cantón Quito.
- **Contexto Académico:** Examen I - Desarrollo de Aplicaciones Móviles.
- **Línea Base Obligatoria:** Documento consolidado de requerimientos y decisiones técnicas (`consolidado_requerimientos.md`).

## Integrantes del Equipo
| Rol / Identificador | Nombre Completo |
| :--- | :--- |
| **Integrante 1** | Carlos Sebastián Serrano Félix |
| **Integrante 2** | Joel Adrián Acosta Chipugsi |
| **Integrante 3** | Leonor Elizabeth Yumi López |
| **Integrante 4** | Diego David Camacho Molina |
| **Fecha de Reunión** | 22/11/2026 |

---

## Índice de Documentación
1. [Requerimientos Funcionales (RF-01 a RF-19)](./requerimientos-funcionales.md)
2. [Requerimientos No Funcionales (RNF-01 a RNF-11)](./requerimientos-no-funcionales.md)
3. [Supuestos Adoptados (S-01 a S-12)](./supuestos.md)
4. [Registro de Decisiones Arquitectónicas (ADR-01 a ADR-09)](./decisiones-arquitectonicas.md)
   - [ADR-01: Backend, seguridad en el servidor, historial inmutable y tiempo real](./adr/ADR-01-backend-supabase.md)
   - [ADR-02: Creación de cuentas, verificación de correo y envío con Gmail SMTP](./adr/ADR-02-cuentas-gmail-smtp.md)
   - [ADR-03: Registro sin conexión, sincronización y sesión cifrada en el teléfono](./adr/ADR-03-offline-sqlite.md)
   - [ADR-04: Evidencia del acta: fotografía, ubicación GPS y mapa](./adr/ADR-04-evidencia-camara-gps-mapa.md)
   - [ADR-05: Arquitectura del código y manejo de estado](./adr/ADR-05-arquitectura-limpia-estado.md)
   - [ADR-06: Interfaz con Uniwind, Lottie y Reanimated](./adr/ADR-06-interfaz-uniwind-lottie-reanimated.md)
   - [ADR-07: Plataforma, generación del APK y reporte de errores](./adr/ADR-07-plataforma-apk-sentry.md)
   - [ADR-08: Navegación con Expo Router](./adr/ADR-08-navegacion-expo-router.md)
   - [ADR-09: Formularios y validación con React Hook Form y Zod](./adr/ADR-09-formularios-react-hook-form-zod.md)

---

## Matriz de Trazabilidad General

| Componente Técnico / Módulo | Requerimientos Funcionales | Requerimientos No Funcionales | Supuestos Clave | ADR Asociados |
| :--- | :--- | :--- | :--- | :--- |
| **Autenticación y Cuentas (`auth`, `users`)** | RF-01, RF-02, RF-03, RF-04, RF-07, RF-19 | RNF-01, RNF-03, RNF-04 | S-03, S-04, S-05 | ADR-01, ADR-02, ADR-08, ADR-09 |
| **Gestión Territorial (`recintos`)** | RF-05, RF-18 | RNF-03 | S-01 | ADR-01, ADR-09 |
| **Asignaciones (`asignaciones`)** | RF-06, RF-07 | RNF-03 | S-04, S-05 | ADR-01, ADR-02, ADR-09 |
| **Escrutinio y Actas (`actas`)** | RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14 | RNF-02, RNF-03, RNF-05, RNF-06, RNF-07, RNF-08 | S-07, S-08, S-09, S-10, S-11, S-12 | ADR-01, ADR-03, ADR-04, ADR-05, ADR-06, ADR-09 |
| **Monitoreo Provincial (`monitoreo`)** | RF-15, RF-16, RF-19 | RNF-09 | S-01, S-06, S-07, S-12 | ADR-01, ADR-04, ADR-05, ADR-06, ADR-08 |
| **Estabilidad y Soporte (`core`)** | RF-17 | RNF-10, RNF-11 | S-11 | ADR-05, ADR-07 |
