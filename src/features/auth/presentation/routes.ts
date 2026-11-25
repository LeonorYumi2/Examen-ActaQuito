import type { Href } from 'expo-router';
import type { PasswordFlow, Role } from '../domain/auth';

export const roleHome: Record<Role, Href> = {
  provincial: '/provincial',
  recinto: '/recinto',
  veedor: '/veedor',
};

export function passwordRoute(flow: PasswordFlow): Href {
  return flow === 'invite' ? '/auth/confirm' : '/auth/reset-password';
}
