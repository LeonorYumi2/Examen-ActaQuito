import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { create } from 'zustand';
import { readAuthLink } from '../data/auth-links';
import { authRepository } from '../data/auth-repository';
import {
  authMessage, AuthProblem, updatePassword, type Access, type PasswordFlow,
} from '../domain/auth';

type LinkStatus = { flow: PasswordFlow; state: 'checking' | 'error'; message?: string };

type AuthState = {
  access: Access | null;
  problem: string | null;
  notice: string | null;
  link: LinkStatus | null;
  synchronize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  requestRecovery: (email: string) => Promise<void>;
  openLink: (url: string) => Promise<void>;
  completePassword: (flow: PasswordFlow, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const guest: Access = { kind: 'guest' };
const seenLinks = new Set<string>();
let queued: Promise<unknown> = Promise.resolve();
let pendingRecovery: Promise<void> | undefined;

function serialize<T>(operation: () => Promise<T>) {
  const result = queued.then(operation);
  queued = result.catch(() => {});
  return result;
}

export const useAuth = create<AuthState>((set, get) => ({
  access: null,
  problem: null,
  notice: null,
  link: null,
  synchronize: () => serialize(async () => {
    try {
      set({ access: await authRepository.restore(), problem: null });
    } catch (error) {
      set({ access: guest, problem: authMessage(error) });
    }
  }),
  signIn: (email, password) => serialize(async () => {
    if (get().access?.kind === 'operational') return;
    set({ problem: null, notice: null });
    const access = await authRepository.signIn(email, password);
    set({ access, link: null });
  }),
  requestRecovery: (email) => {
    pendingRecovery ??= serialize(() => authRepository.requestRecovery(email)).finally(() => {
      pendingRecovery = undefined;
    });
    return pendingRecovery;
  },
  openLink: (url) => serialize(async () => {
    const received = readAuthLink(url);
    if (!received) return;
    try {
      const parsed = received.parse();
      const fingerprint = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(parsed));
      if (seenLinks.has(fingerprint)) return;
      seenLinks.add(fingerprint);
      if (seenLinks.size > 32) {
        const oldest = seenLinks.values().next().value;
        if (oldest) seenLinks.delete(oldest);
      }

      set({ link: { flow: received.flow, state: 'checking' } });
      if (get().access?.kind === 'operational') {
        throw new AuthProblem('Cierra tu sesión antes de abrir un enlace de acceso.');
      }
      const access = await authRepository.acceptLink(parsed, fingerprint);
      set({ access, problem: null, notice: null, link: null });
    } catch (error) {
      set({ link: { flow: received.flow, state: 'error', message: authMessage(error) } });
    }
  }),
  completePassword: (flow, password) => serialize(async () => {
    await updatePassword(authRepository, get().access ?? guest, flow, password);
    set({
      access: guest,
      link: null,
      notice: 'Contraseña guardada. Inicia sesión con tu correo y la nueva contraseña.',
    });
  }),
  signOut: () => serialize(async () => {
    await authRepository.signOut();
    set({ access: guest, problem: null, notice: null, link: null });
  }),
}));
