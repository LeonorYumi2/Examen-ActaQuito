export type Role = 'provincial' | 'recinto' | 'veedor';
export type PasswordFlow = 'invite' | 'recovery';

export type Profile = {
  id: string;
  role: Role;
  name: string;
};

export type Access =
  | { kind: 'guest' }
  | { kind: 'setup'; flow: PasswordFlow }
  | { kind: 'operational'; profile: Profile; offline: boolean };

export type AuthLink =
  | { flow: 'invite'; accessToken: string; refreshToken: string }
  | { flow: 'recovery'; code: string };

export interface AuthRepository {
  restore(): Promise<Access>;
  signIn(email: string, password: string): Promise<Access>;
  requestRecovery(email: string): Promise<void>;
  acceptLink(link: AuthLink): Promise<Access>;
  setPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  setForeground(active: boolean): void;
  onSessionChanged(listener: () => void): () => void;
}

export class AuthProblem extends Error {}

export function authMessage(error: unknown) {
  return error instanceof AuthProblem
    ? error.message
    : 'No pudimos completar la operación. Revisa tu conexión e inténtalo de nuevo.';
}

export function updatePassword(repository: AuthRepository, access: Access, flow: PasswordFlow, password: string) {
  if (access.kind !== 'setup' || access.flow !== flow) {
    throw new AuthProblem('Abre un enlace vigente antes de cambiar la contraseña.');
  }
  return repository.setPassword(password);
}
