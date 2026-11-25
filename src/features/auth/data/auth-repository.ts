import { QueryClient } from '@tanstack/react-query';
import { isAuthRetryableFetchError, type AuthError, type Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { AuthProblem, type Access, type AuthLink, type AuthRepository, type Profile } from '../domain/auth';
import { recoveryRedirect } from './auth-links';
import { authStorage } from './auth-storage';
import { preparePkce } from './pkce';
import { mobileSupabase, profileStorageKey, readJwtPayload } from './supabase-client';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, networkMode: 'always' } } });
const guest: Access = { kind: 'guest' };
const rememberedKey = profileStorageKey;
const profileSchema = z.object({
  id: z.string(),
  role: z.enum(['provincial', 'recinto', 'veedor']),
  name: z.string(),
});
const rememberedSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('operational'), profile: profileSchema, sessionId: z.string() }),
  z.object({ kind: z.literal('setup'), flow: z.enum(['invite', 'recovery']), userId: z.string(), sessionId: z.string() }),
]);
type Remembered = z.infer<typeof rememberedSchema>;
class ConnectionProblem extends AuthProblem {}

function authError(error: AuthError) {
  if (isAuthRetryableFetchError(error)) return new ConnectionProblem('No hay conexión con el servicio de acceso. Inténtalo de nuevo.');
  switch (error.code) {
    case 'invalid_credentials': return new AuthProblem('El correo o la contraseña no coinciden.');
    case 'email_not_confirmed': return new AuthProblem('Confirma tu correo desde la invitación antes de iniciar sesión.');
    case 'otp_expired': return new AuthProblem('El enlace venció o ya se usó. Solicita uno nuevo.');
    case 'flow_state_not_found':
    case 'flow_state_expired':
    case 'bad_code_verifier': return new AuthProblem('Solicita otro enlace y ábrelo en esta misma instalación.');
    case 'weak_password': return new AuthProblem('Elige una contraseña más segura y vuelve a intentarlo.');
    case 'same_password': return new AuthProblem('Elige una contraseña distinta de la actual.');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return new AuthProblem('Hay demasiadas solicitudes. Espera un momento e inténtalo de nuevo.');
    default: return new AuthProblem('El servicio de acceso no pudo completar la solicitud.');
  }
}

async function readRemembered() {
  const raw = await authStorage.getItem(rememberedKey);
  if (!raw) return null;
  try {
    return rememberedSchema.safeParse(JSON.parse(raw)).data ?? null;
  } catch {
    return null;
  }
}

function remember(value: Remembered) {
  return authStorage.setItem(rememberedKey, JSON.stringify(value));
}

const claimsSchema = z.object({
  sub: z.string(),
  role: z.literal('authenticated'),
  session_id: z.string().min(1),
  amr: z.array(z.object({ method: z.string() })).optional(),
});

async function claimsFor(session: Session) {
  // Auth validates the exact token before we inspect its claims. This also
  // works on native runtimes with only digest support, without local JWK APIs.
  const { data, error } = await mobileSupabase().auth.getUser(session.access_token);
  if (error) throw authError(error);
  const parsed = claimsSchema.safeParse(readJwtPayload(session.access_token));
  if (!parsed.success || !data.user || parsed.data.sub !== data.user.id || data.user.id !== session.user.id) {
    throw new AuthProblem('No pudimos verificar esta sesión. Vuelve a iniciar sesión.');
  }
  const { session_id: sessionId, amr } = parsed.data;
  return { sessionId, methods: amr?.map(({ method }) => method) ?? [], user: data.user };
}

async function queryProfile(id: string): Promise<Profile> {
  return queryClient.fetchQuery({
    queryKey: ['auth', 'profile', id],
    async queryFn() {
      const { data, error, status } = await mobileSupabase().from('usuarios')
        .select('id,rol,nombres,apellidos,habilitado').eq('id', id).maybeSingle();
      if (status === 0) throw new ConnectionProblem('No pudimos consultar el perfil. Revisa tu conexión.');
      if (error?.code === '42P01' || error?.code === 'PGRST205') {
        throw new AuthProblem('El entorno aún no tiene habilitados los perfiles de ActaQuito.');
      }
      if (error) throw new AuthProblem('No pudimos consultar los permisos de esta cuenta.');
      const profile = profileSchema.safeParse(data?.habilitado ? {
        id: data.id,
        name: [data.nombres, data.apellidos].filter(Boolean).join(' '),
        role: data.rol,
      } : null);
      if (!profile.success || profile.data.id !== id) {
        throw new AuthProblem('La cuenta no tiene un perfil habilitado de ActaQuito. Contacta a tu coordinador.');
      }
      return profile.data;
    },
  });
}

async function discardSession() {
  const { auth } = mobileSupabase();
  // Local storage must be cleared even when the server cannot be reached.
  try {
    await auth.stopAutoRefresh();
    await auth.signOut({ scope: 'local' });
  } catch {
    // Remote revocation is best-effort when signing out offline.
  } finally {
    queryClient.clear();
    await authStorage.clear();
  }
}

function offlineAccess(saved: Remembered | null, userId?: string): Access | undefined {
  if (saved?.kind === 'operational' && (!userId || saved.profile.id === userId)) {
    return { kind: 'operational', profile: saved.profile, offline: true };
  }
}

export const authRepository: AuthRepository = {
  async restore() {
    const { auth } = mobileSupabase();
    const saved = await readRemembered();
    const { data, error } = await auth.getSession();
    if (error) {
      if (isAuthRetryableFetchError(error)) {
        const offline = offlineAccess(saved);
        if (offline) return offline;
        throw authError(error);
      }
      await discardSession();
      return guest;
    }
    const session = data.session;
    if (!session) {
      queryClient.clear();
      await authStorage.removeItem(rememberedKey);
      return guest;
    }

    try {
      const claims = await claimsFor(session);
      if (!claims.methods.includes('password')) {
        if (saved?.kind === 'setup' && saved.userId === session.user.id && saved.sessionId === claims.sessionId) {
          return { kind: 'setup', flow: saved.flow };
        }
        await discardSession();
        return guest;
      }
      const profile = await queryProfile(session.user.id);
      await remember({ kind: 'operational', profile, sessionId: claims.sessionId });
      return { kind: 'operational', profile, offline: false };
    } catch (error) {
      if (error instanceof ConnectionProblem) {
        const offline = offlineAccess(saved, session.user.id);
        if (offline) return offline;
        throw error;
      }
      await discardSession();
      throw error;
    }
  },
  async signIn(email, password) {
    const { auth } = mobileSupabase();
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
    if (!data.session) throw new AuthProblem('No se pudo abrir la sesión.');
    try {
      const claims = await claimsFor(data.session);
      if (!claims.methods.includes('password')) throw new AuthProblem('Inicia sesión con correo y contraseña.');
      const profile = await queryProfile(data.session.user.id);
      await remember({ kind: 'operational', profile, sessionId: claims.sessionId });
      return { kind: 'operational', profile, offline: false };
    } catch (error) {
      await discardSession();
      throw error;
    }
  },
  async requestRecovery(email) {
    preparePkce();
    const { error } = await mobileSupabase().auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirect });
    if (error?.code === 'user_not_found') return;
    if (error) throw authError(error);
  },
  async acceptLink(link: AuthLink) {
    const { auth } = mobileSupabase();
    const { data, error } = link.flow === 'invite'
      ? await auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      : await auth.exchangeCodeForSession(link.code);
    if (error) throw authError(error);
    if (!data.session) throw new AuthProblem('El enlace no abrió una sesión válida.');
    try {
      const session = data.session;
      const claims = await claimsFor(session);
      // GoTrue's implicit invitation verification emits OTP. PKCE recovery emits recovery.
      const allowed = link.flow === 'invite'
        ? claims.user.invited_at && (claims.methods.includes('otp') || claims.methods.includes('invite'))
        : claims.methods.includes('recovery');
      if (!allowed || !claims.user.email_confirmed_at || claims.methods.includes('password')) {
        throw new AuthProblem('Esta sesión no corresponde al enlace. Solicita un enlace nuevo.');
      }
      await remember({ kind: 'setup', flow: link.flow, userId: session.user.id, sessionId: claims.sessionId });
      return { kind: 'setup', flow: link.flow };
    } catch (error) {
      await discardSession();
      throw error;
    }
  },
  async setPassword(password) {
    const { auth } = mobileSupabase();
    const saved = await readRemembered();
    const { data, error } = await auth.getSession();
    if (error) throw authError(error);
    if (!data.session || saved?.kind !== 'setup' || saved.userId !== data.session.user.id) {
      throw new AuthProblem('La sesión del enlace ya no está disponible. Solicita otro enlace.');
    }
    const claims = await claimsFor(data.session);
    if (claims.sessionId !== saved.sessionId || claims.methods.includes('password')) {
      throw new AuthProblem('La sesión del enlace ya no está disponible. Solicita otro enlace.');
    }
    const result = await auth.updateUser({ password });
    if (result.error) throw authError(result.error);
    await discardSession();
  },
  signOut: discardSession,
  setForeground(active) {
    try {
      const { auth } = mobileSupabase();
      void (active ? auth.startAutoRefresh() : auth.stopAutoRefresh()).catch(() => {});
    } catch {
      // Configuration is reported through restore and the forms.
    }
  },
  onSessionChanged(listener) {
    try {
      const { data } = mobileSupabase().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') listener();
      });
      return () => data.subscription.unsubscribe();
    } catch {
      return () => {};
    }
  },
};
