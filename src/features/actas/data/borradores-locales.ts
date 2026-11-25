import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESSealedData } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseAsync } from 'expo-sqlite';
import { claveBorrador, type BorradoresLocales } from '../domain/evidencia';

const nombreLlave = 'actaquito.borradores.aes.v1';
const opcionesLlave = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let base: ReturnType<typeof openDatabaseAsync> | undefined;
let operaciones: Promise<unknown> = Promise.resolve();

function serializar<T>(tarea: () => Promise<T>) {
  const resultado = operaciones.then(tarea);
  operaciones = resultado.catch(() => {});
  return resultado;
}

function abrirBase() {
  base ??= openDatabaseAsync('actaquito-borradores.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS borradores (identidad TEXT PRIMARY KEY, contenido BLOB NOT NULL)');
    return db;
  }).catch((error: unknown) => {
    base = undefined;
    throw error;
  });
  return base;
}

export const borradoresLocales: BorradoresLocales = {
  cargar(usuario, mesa, dignidad) {
    return serializar(async () => {
      const identidad = claveBorrador(usuario, mesa, dignidad);
      const fila = await (await abrirBase()).getFirstAsync<{ contenido: Uint8Array }>(
        'SELECT contenido FROM borradores WHERE identidad = ?', identidad,
      );
      if (!fila) return null;
      const material = await SecureStore.getItemAsync(nombreLlave, opcionesLlave);
      if (!material) throw new Error('La llave del borrador local no está disponible.');
      const llave = await AESEncryptionKey.import(material, 'hex');
      const bytes = await aesDecryptAsync(AESSealedData.fromCombined(fila.contenido), llave, {
        additionalData: new TextEncoder().encode(identidad),
      });
      return JSON.parse(new TextDecoder().decode(bytes));
    });
  },
  guardar(usuario, mesa, dignidad, borrador) {
    return serializar(async () => {
      const identidad = claveBorrador(usuario, mesa, dignidad);
      const material = await SecureStore.getItemAsync(nombreLlave, opcionesLlave);
      const llave = material ? await AESEncryptionKey.import(material, 'hex') : await AESEncryptionKey.generate();
      if (!material) await SecureStore.setItemAsync(nombreLlave, await llave.encoded('hex'), opcionesLlave);
      const cifrado = await aesEncryptAsync(new TextEncoder().encode(JSON.stringify(borrador)), llave, {
        additionalData: new TextEncoder().encode(identidad),
      });
      await (await abrirBase()).runAsync(
        'INSERT INTO borradores (identidad, contenido) VALUES (?, ?) ON CONFLICT(identidad) DO UPDATE SET contenido = excluded.contenido',
        identidad, await cifrado.combined(),
      );
    });
  },
};
