import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const realRequire = createRequire(import.meta.url);
const root = new URL('../src/features/auth/', import.meta.url);

function load(path, mocks = {}, environment = globalThis) {
  const source = readFileSync(new URL(path, root), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  const importModule = (name) => Object.hasOwn(mocks, name) ? mocks[name] : realRequire(name);
  new Function('require', 'module', 'exports', 'globalThis', outputText)(importModule, module, module.exports, environment);
  return module.exports;
}

const domain = load('domain/auth.ts');
const links = load('data/auth-links.ts', {
  '../domain/auth': domain,
  'react-native-url-polyfill/auto': {},
});
const forms = load('domain/forms.ts');
const invitation = 'actaquito://auth/confirm#type=invite&access_token=a&refresh_token=b';
const recovery = 'actaquito://auth/reset-password?code=reset';
const verifierKey = 'test-session-code-verifier';
const recoveryVerifier = JSON.stringify('v'.repeat(56) + '/PASSWORD_RECOVERY');

function fixture(method, options = {}) {
  const events = [];
  const cache = options.cache ?? new Map();
  const profileKey = 'test-profile';
  const session = {
    access_token: 'test-token',
    user: { id: 'user-1', invited_at: 'date', email_confirmed_at: 'date' },
  };
  const auth = {
    async setSession() { events.push('setSession'); return { data: { session } }; },
    async exchangeCodeForSession(code) {
      events.push(['exchange', code]);
      assert.equal(cache.get(verifierKey), recoveryVerifier);
      cache.delete(verifierKey);
      return options.exchangeResult ?? { data: { session } };
    },
    async resetPasswordForEmail(email, redirect) {
      events.push(['reset', email, redirect.redirectTo]);
      cache.set(verifierKey, recoveryVerifier);
      return {};
    },
    async signInWithPassword() { events.push('signIn'); return { data: { session } }; },
    async getSession() {
      if (options.restoreError) {
        cache.delete(verifierKey); // GoTrue removes the SDK verifier with the old session.
        return { error: options.restoreError };
      }
      return { data: { session } };
    },
    async getUser() { return { data: { user: session.user } }; },
    async updateUser() { events.push('updateUser'); return {}; },
    async stopAutoRefresh() {},
    async signOut() { events.push('signOut'); return {}; },
  };
  const client = {
    auth,
    async rpc(name) { events.push(['rpc', name]); return options.activationResult ?? { status: 204 }; },
    from(table) {
      events.push(['table', table]);
      return {
        select(columns) {
          events.push(['columns', columns]);
          return { eq: () => ({ maybeSingle: async () => options.profileResult ?? {
            status: 200,
            data: { id: 'user-1', rol: 'veedor', nombres: 'Persona', apellidos: 'Prueba', habilitado: true },
          } }) };
        },
      };
    },
  };
  const storage = {
    async setItem(key, value) { cache.set(key, value); },
    async getItem(key) { return cache.get(key); },
    async removeItem(key) { cache.delete(key); },
    async clear() { cache.clear(); },
  };
  const { authRepository } = load('data/auth-repository.ts', {
    '../domain/auth': domain,
    './auth-links': links,
    './auth-storage': { authStorage: storage },
    './pkce': { preparePkce() {} },
    './supabase-client': {
      mobileSupabase: () => client,
      profileStorageKey: profileKey,
      recoveryVerifierStorageKey: verifierKey,
      readJwtPayload: () => ({ sub: 'user-1', role: 'authenticated', session_id: 'session-1', amr: method ? [{ method }] : undefined }),
    },
  });
  return { authRepository, events, cache };
}

test('una invitación toma los tokens únicamente del fragmento y exige el tipo invite', () => {
  assert.deepEqual(links.readAuthLink(invitation).parse(), { flow: 'invite', accessToken: 'a', refreshToken: 'b' });
  assert.throws(() => links.readAuthLink(invitation.replace('#', '?')).parse());
  assert.throws(() => links.readAuthLink(invitation.replace('type=invite', 'type=recovery')).parse());
  assert.equal(links.readAuthLink(invitation.replace('://auth', '://otro')), null);
});

test('la recuperación distingue PKCE, token_hash, fragmentos y enlaces vencidos', () => {
  assert.deepEqual(links.readAuthLink(recovery).parse(), { flow: 'recovery', code: 'reset' });
  assert.throws(() => links.readAuthLink(recovery + '&code=otro').parse());
  assert.throws(() => links.readAuthLink(recovery + '#access_token=a').parse(), /código PKCE/);
  assert.throws(() => links.readAuthLink('actaquito://auth/reset-password?type=recovery&token_hash=prueba').parse(), /código PKCE/);
  assert.throws(() => links.readAuthLink(recovery + '&error_code=otp_expired').parse(), /venció/);
});

test('la invitación OTP conserva el flujo de primera contraseña y nunca consulta el perfil', async () => {
  const { authRepository, events, cache } = fixture('otp');
  const access = await authRepository.acceptLink(links.readAuthLink(invitation).parse());
  assert.deepEqual(access, { kind: 'setup', flow: 'invite' });
  assert.deepEqual(await authRepository.restore(), access);
  assert.throws(() => domain.updatePassword(authRepository, access, 'recovery', 'test-password'));
  await domain.updatePassword(authRepository, access, 'invite', 'test-password');
  assert.deepEqual(events, ['setSession', 'updateUser', 'signOut']);
  assert.equal(cache.size, 0);
});

test('el código de recuperación usa PKCE y no abre un perfil', async () => {
  const { authRepository, events } = fixture('recovery');
  await authRepository.requestRecovery('test@example.test');
  assert.deepEqual(await authRepository.acceptLink(links.readAuthLink(recovery).parse()), { kind: 'setup', flow: 'recovery' });
  assert.deepEqual(events, [
    ['reset', 'test@example.test', 'actaquito://auth/reset-password'],
    ['exchange', 'reset'],
  ]);
});

test('el verificador cifrado de la solicitud sobrevive al arranque y a descartar una sesión antigua', async () => {
  const original = fixture('recovery');
  await original.authRepository.requestRecovery('test@example.test');
  const restarted = fixture('recovery', { cache: original.cache, restoreError: { code: 'session_not_found' } });
  assert.deepEqual(await restarted.authRepository.restore(), { kind: 'guest' });
  assert.equal(restarted.cache.has(verifierKey), false);
  assert.deepEqual(await restarted.authRepository.acceptLink(links.readAuthLink(recovery).parse()), { kind: 'setup', flow: 'recovery' });
  assert.deepEqual(restarted.events, ['signOut', ['exchange', 'reset']]);
  assert.equal(restarted.cache.has('test-profile:pending-recovery'), false);
});

test('un callback sin verificador se rechaza sin canjear el código', async () => {
  const { authRepository, events } = fixture('recovery');
  await assert.rejects(authRepository.acceptLink(links.readAuthLink(recovery).parse()), /misma app/);
  assert.deepEqual(events, []);
});

test('el SDK identifica el verificador ausente sin enviar una solicitud', async () => {
  const { createClient, isAuthPKCECodeVerifierMissingError } = realRequire('@supabase/supabase-js');
  let llamadas = 0;
  const sdk = createClient('https://test.example.test', 'sb_publishable_test', {
    auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false },
    global: { fetch: async () => { llamadas++; return Response.json({}, { status: 400 }); } },
  });
  const { error } = await sdk.auth.exchangeCodeForSession('codigo-simulado');
  assert.equal(isAuthPKCECodeVerifierMissingError(error), true);
  assert.equal(error.code, 'pkce_code_verifier_not_found');
  assert.equal(llamadas, 0);
});

test('un error de canje borra el verificador pendiente y devuelve un mensaje seguro', async () => {
  const { authRepository, cache } = fixture('recovery', { exchangeResult: { error: { code: 'validation_failed' } } });
  await authRepository.requestRecovery('test@example.test');
  await assert.rejects(authRepository.acceptLink(links.readAuthLink(recovery).parse()), /correo más reciente/);
  assert.equal(cache.has('test-profile:pending-recovery'), false);
});

test('un enlace ya canjeado no oculta la sesión temporal al reabrir la app', async () => {
  const first = fixture('recovery');
  await first.authRepository.requestRecovery('test@example.test');
  await first.authRepository.acceptLink(links.readAuthLink(recovery).parse(), 'huella');
  const restarted = fixture('recovery', { cache: first.cache });
  assert.deepEqual(await restarted.authRepository.acceptLink(links.readAuthLink(recovery).parse(), 'huella'),
    { kind: 'setup', flow: 'recovery' });
  assert.deepEqual(restarted.events, []);
});

test('una sesión con contraseña no puede disfrazarse como invitación', async () => {
  const { authRepository, events } = fixture('password');
  await assert.rejects(authRepository.acceptLink(links.readAuthLink(invitation).parse()), /no corresponde/);
  assert.deepEqual(events, ['setSession', 'signOut']);
});

test('solo el inicio de sesión con AMR password habilita el perfil bajo RLS', async () => {
  const otp = fixture('otp');
  await assert.rejects(otp.authRepository.signIn('test@example.test', 'test-password'), /Inicia sesión/);
  assert.deepEqual(otp.events, ['signIn', 'signOut']);
  const password = fixture('password');
  const access = await password.authRepository.signIn('test@example.test', 'test-password');
  assert.equal(access.kind, 'operational');
  assert.equal(access.profile.role, 'veedor');
  assert.deepEqual(password.events.slice(1), [['rpc', 'activar_cuenta'], ['table', 'usuarios'], ['columns', 'id,rol,nombres,apellidos,habilitado']]);
});

test('un JWT sin AMR no intenta activar la cuenta ni buscar el perfil', async () => {
  const { authRepository, events } = fixture(undefined);
  await assert.rejects(authRepository.signIn('test@example.test', 'test-password'), /Inicia sesión/);
  assert.deepEqual(events, ['signIn', 'signOut']);
});

test('un rechazo de activación impide consultar el perfil', async () => {
  const { authRepository, events } = fixture('password', { activationResult: { status: 403, error: { code: '42501' } } });
  await assert.rejects(authRepository.signIn('test@example.test', 'test-password'), /perfil habilitado/);
  assert.deepEqual(events, ['signIn', ['rpc', 'activar_cuenta'], 'signOut']);
});

test('el rol se cierra cuando PostgreSQL no devuelve un perfil habilitado', async () => {
  const { authRepository, cache } = fixture('password', { profileResult: { status: 200, data: null } });
  await assert.rejects(authRepository.signIn('test@example.test', 'test-password'), /perfil habilitado/);
  assert.equal(cache.size, 0);
});

test('la validación conserva la contraseña tal como se digitó y comprueba su confirmación', () => {
  const password = '  prueba  ';
  assert.equal(forms.passwordForm.parse({ password, repeatPassword: password }).password, password);
  assert.equal(forms.passwordForm.safeParse({ password, repeatPassword: 'diferente' }).success, false);
});

test('el SDK genera S256 y guarda el verificador con las primitivas nativas', async () => {
  const environment = {};
  const { preparePkce } = load('data/pkce.native.ts', {
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      digest: (algorithm, input) => webcrypto.subtle.digest(algorithm, input),
      getRandomValues: (input) => webcrypto.getRandomValues(input),
    },
  }, environment);
  preparePkce();
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: environment.crypto });
  try {
    const { createClient } = realRequire('@supabase/supabase-js');
    const storage = new Map();
    let request;
    const sdk = createClient('https://test.example.test', 'sb_publishable_test', {
      global: { fetch: async (_url, init) => {
        request = JSON.parse(init.body);
        return Response.json({});
      } },
      auth: {
        autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce', storageKey: 'auth-test',
        storage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
      },
    });
    const { error } = await sdk.auth.resetPasswordForEmail('test@example.test', { redirectTo: links.recoveryRedirect });
    assert.equal(error, null);
    const verifier = JSON.parse(storage.get('auth-test-code-verifier')).split('/')[0];
    assert.equal(request.code_challenge_method, 's256');
    const challenge = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    assert.equal(request.code_challenge, Buffer.from(challenge).toString('base64url'));
  } finally {
    Object.defineProperty(globalThis, 'crypto', originalCrypto);
  }
});

test('se ignora un segundo evento con la misma credencial aunque la URL incorpore otro parámetro', async () => {
  const { authRepository, events } = fixture('recovery');
  const { useAuth } = load('presentation/auth-state.ts', {
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_algorithm, input) => createHash('sha256').update(input).digest('hex') },
    '../data/auth-links': links,
    '../data/auth-repository': { authRepository },
    '../domain/auth': domain,
  });
  await useAuth.getState().requestRecovery('test@example.test');
  await Promise.all([useAuth.getState().openLink(recovery), useAuth.getState().openLink(recovery + '&origen=correo')]);
  assert.deepEqual(events, [['reset', 'test@example.test', links.recoveryRedirect], ['exchange', 'reset']]);
  assert.deepEqual(useAuth.getState().access, { kind: 'setup', flow: 'recovery' });
});
