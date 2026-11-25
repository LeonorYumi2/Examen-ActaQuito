import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

export function preparePkce() {
  // Auth JS 2.98 otherwise allows weaker random generation and a plain PKCE
  // challenge on runtimes without Web Crypto. Only supply the APIs it needs.
  const crypto: Partial<Crypto> = globalThis.crypto ?? {};
  if (typeof crypto.getRandomValues !== 'function') {
    Object.defineProperty(crypto, 'getRandomValues', { value: getRandomValues });
  }
  const subtle: Partial<SubtleCrypto> = crypto.subtle ?? {};
  if (typeof subtle.digest !== 'function') {
    Object.defineProperty(subtle, 'digest', {
      value(algorithm: AlgorithmIdentifier, bytes: BufferSource) {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name !== 'SHA-256') throw new Error('Algoritmo no admitido por este adaptador PKCE.');
        return digest(CryptoDigestAlgorithm.SHA256, bytes);
      },
    });
  }
  if (!crypto.subtle) Object.defineProperty(crypto, 'subtle', { value: subtle });
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: crypto, configurable: true });
}
