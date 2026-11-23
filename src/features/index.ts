/**
 * ActaQuito - Módulos de Clean Architecture por funcionalidad (ADR-05).
 *
 * Cada feature organiza su código en:
 * - domain: entidades, contratos de repositorios y casos de uso puros.
 * - data: datasources (Supabase/SQLite), repositorios concretos y mappers.
 * - presentation: componentes, hooks y pantallas delegadas desde Expo Router (src/app).
 */

export * as auth from './auth';
export * as users from './users';
export * as recintos from './recintos';
export * as asignaciones from './asignaciones';
export * as actas from './actas';
export * as monitoreo from './monitoreo';
