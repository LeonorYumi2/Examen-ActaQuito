import 'react-native-url-polyfill/auto';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AuthProblem } from '../domain/auth';
import { authStorage } from './auth-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const storageKey = 'actaquito.auth:' + (url ?? '');
const sessionStorageKey = storageKey + ':session';
// GoTrue 2.98 stores the verifier under this key before sending /recover.
export const recoveryVerifierStorageKey = sessionStorageKey + '-code-verifier';
export const profileStorageKey = storageKey + ':access';
let client: SupabaseClient | undefined;

export function readJwtPayload(value: string): unknown {
  const payload = value.split('.')[1];
  if (!payload) throw new Error('JWT inválido.');
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, (char) => char.charCodeAt(0))));
}

function isPublicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true;
  try {
    const payload = readJwtPayload(value);
    return typeof payload === 'object' && payload !== null && 'role' in payload && payload.role === 'anon';
  } catch {
    return false;
  }
}

export function mobileSupabase() {
  if (!url || !key || !isPublicKey(key)) {
    throw new AuthProblem('Configura la URL y la clave publicable de Supabase para continuar.');
  }
  let endpoint: URL;
  try {
    endpoint = new URL(url);
  } catch {
    throw new AuthProblem('La URL de Supabase no es válida.');
  }
  if (endpoint.protocol !== 'https:' && !(__DEV__ && endpoint.protocol === 'http:')) {
    throw new AuthProblem('La conexión con Supabase requiere una URL HTTPS.');
  }

  client ??= createClient(url, key, {
    auth: {
      flowType: 'pkce',
      storageKey: sessionStorageKey,
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return client;
}
