import { AuthProblem } from '../domain/auth';

export function preparePkce() {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto.subtle?.digest) {
    throw new AuthProblem('La recuperación web requiere una conexión HTTPS segura.');
  }
}
