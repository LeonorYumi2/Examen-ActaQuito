/**
 * Feature: auth
 * Capa: data
 *
 * Responsabilidad (ADR-05):
 * Implementa el acceso a fuentes de datos remotas (Supabase Auth / Edge Functions)
 * y locales (expo-secure-store), además de mapear DTOs hacia entidades de dominio.
 */

export * from './datasources';
export * from './repositories';
export * from './mappers';
