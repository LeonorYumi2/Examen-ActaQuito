import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESSealedData } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseAsync } from 'expo-sqlite';

const keyName = 'actaquito.auth.aes.v1';
const keyOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let database: ReturnType<typeof openDatabaseAsync> | undefined;
let pending: Promise<unknown> = Promise.resolve();

async function getDatabase() {
  database ??= openDatabaseAsync('actaquito-auth.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS auth_storage (name TEXT PRIMARY KEY, sealed TEXT NOT NULL)');
    return db;
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

function serialize<T>(operation: () => Promise<T>) {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}

export const authStorage = {
  getItem(name: string) {
    return serialize(async () => {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ sealed: string }>('SELECT sealed FROM auth_storage WHERE name = ?', name);
      if (!row) return null;
      const raw = await SecureStore.getItemAsync(keyName, keyOptions);
      if (!raw) return null;
      const key = await AESEncryptionKey.import(raw, 'hex');
      // Authenticate the storage key together with the ciphertext.
      try {
        const bytes = await aesDecryptAsync(AESSealedData.fromCombined(row.sealed), key, {
          additionalData: new TextEncoder().encode(name),
        });
        return new TextDecoder().decode(bytes);
      } catch {
        await db.runAsync('DELETE FROM auth_storage WHERE name = ?', name);
        return null;
      }
    });
  },
  setItem(name: string, value: string) {
    return serialize(async () => {
      const db = await getDatabase();
      const raw = await SecureStore.getItemAsync(keyName, keyOptions);
      const key = raw ? await AESEncryptionKey.import(raw, 'hex') : await AESEncryptionKey.generate();
      if (!raw) await SecureStore.setItemAsync(keyName, await key.encoded('hex'), keyOptions);
      const sealed = await aesEncryptAsync(new TextEncoder().encode(value), key, {
        additionalData: new TextEncoder().encode(name),
      });
      await db.runAsync(
        'INSERT INTO auth_storage (name, sealed) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET sealed = excluded.sealed',
        name,
        await sealed.combined('base64'),
      );
    });
  },
  removeItem(name: string) {
    return serialize(async () => {
      await (await getDatabase()).runAsync('DELETE FROM auth_storage WHERE name = ?', name);
    });
  },
  clear() {
    return serialize(async () => {
      // Removing the key also makes any old SQLite pages unreadable.
      await SecureStore.deleteItemAsync(keyName, keyOptions);
      await (await getDatabase()).runAsync('DELETE FROM auth_storage');
    });
  },
};
