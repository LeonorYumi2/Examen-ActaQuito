import 'react-native-url-polyfill/auto';
import { AuthProblem, type AuthLink, type PasswordFlow } from '../domain/auth';

export const recoveryRedirect = 'actaquito://auth/reset-password';

export function readAuthLink(raw: string): { flow: PasswordFlow; parse: () => AuthLink } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'actaquito:' || url.host !== 'auth' || url.username || url.password) return null;

  const flow = url.pathname === '/confirm' ? 'invite'
    : url.pathname === '/reset-password' ? 'recovery' : null;
  if (!flow) return null;

  return {
    flow,
    parse() {
      const fragment = new URLSearchParams(url.hash.slice(1));
      const query = url.searchParams;
      if ([query, fragment].some((params) => params.has('error') || params.has('error_code'))) {
        throw new AuthProblem('El enlace venció o ya se usó. Solicita uno nuevo.');
      }
      if (flow === 'recovery') {
        if (query.has('token_hash') || fragment.has('token_hash')
            || fragment.has('access_token') || fragment.has('refresh_token')
            || query.has('access_token') || query.has('refresh_token')) {
          throw new AuthProblem('Este correo no contiene el código PKCE requerido. Solicita un enlace nuevo desde ActaQuito.');
        }
        const codes = query.getAll('code');
        if (codes.length === 1 && codes[0] && !url.hash) {
          return { flow, code: codes[0] };
        }
      } else {
        const access = fragment.getAll('access_token');
        const refresh = fragment.getAll('refresh_token');
        if (fragment.getAll('type').length === 1 && fragment.get('type') === 'invite'
          && access.length === 1 && access[0] && refresh.length === 1 && refresh[0] && !url.search) {
          return { flow, accessToken: access[0], refreshToken: refresh[0] };
        }
      }
      throw new AuthProblem('El enlace está incompleto o no es válido para esta pantalla.');
    },
  };
}
