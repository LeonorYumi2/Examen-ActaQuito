/**
 * Feature: auth
 * Capa: domain
 *
 * Responsabilidad (ADR-05):
 * Define las entidades puras, contratos de repositorio y casos de uso
 * para la autenticación (sesión, recuperación y primer acceso).
 * Regla Clean Architecture: No debe importar nada de React Native, Supabase ni librerías de UI.
 */

export * from './entities';
export * from './repositories';
export * from './usecases';
