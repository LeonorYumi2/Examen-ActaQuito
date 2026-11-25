import type { PasswordFlow, Role } from '../domain/auth';

export const roleHome: Record<Role, '/provincial' | '/recinto' | '/veedor'> = {
  provincial: '/provincial',
  recinto: '/recinto',
  veedor: '/veedor',
};

export function passwordRoute(flow: PasswordFlow) {
  return flow === 'invite' ? '/auth/confirm' : '/auth/reset-password';
}
