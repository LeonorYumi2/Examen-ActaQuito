import type { UbicacionCorreccion } from '../domain/historial-acta';
import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESSealedData } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseAsync } from 'expo-sqlite';
import { claveEnvio, type EnviosLocales, type ReferenciaBorrador } from '../domain/enviar-borrador';
import { claveBorrador, type BorradorLocal, type BorradoresLocales } from '../domain/evidencia';

import { leerCifras, type Borrador, type Cifras } from '../domain/registro';
import type { ColaLocal, ControlEnvio } from '../domain/sincronizacion';

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

function cargarContenido<T>(identidad: string): Promise<T | null> {
  return serializar(async () => {
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
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  });
}

function guardarContenido(identidad: string, contenido: object) {
  return serializar(async () => {
    const material = await SecureStore.getItemAsync(nombreLlave, opcionesLlave);
    const llave = material ? await AESEncryptionKey.import(material, 'hex') : await AESEncryptionKey.generate();
    if (!material) await SecureStore.setItemAsync(nombreLlave, await llave.encoded('hex'), opcionesLlave);
    const cifrado = await aesEncryptAsync(new TextEncoder().encode(JSON.stringify(contenido)), llave, {
      additionalData: new TextEncoder().encode(identidad),
    });
    await (await abrirBase()).runAsync(
      'INSERT INTO borradores (identidad, contenido) VALUES (?, ?) ON CONFLICT(identidad) DO UPDATE SET contenido = excluded.contenido',
      identidad, await cifrado.combined(),
    );
  });
}

export const borradoresLocales: BorradoresLocales = {
  cargar: (usuario, mesa, dignidad) => cargarContenido(claveBorrador(usuario, mesa, dignidad)),
  guardar: (usuario, mesa, dignidad, borrador) => guardarContenido(claveBorrador(usuario, mesa, dignidad), borrador),
};

const escuchasEnvio = new Set<(referencia: ReferenciaBorrador) => void>();

export function suscribirEnviosLocales(escucha: (referencia: ReferenciaBorrador) => void) {
  escuchasEnvio.add(escucha);
  return () => { escuchasEnvio.delete(escucha); };
}

export const enviosLocales: EnviosLocales = {
  cargar: (referencia) => cargarContenido(claveEnvio(referencia)),
  async guardar(referencia, envio) {
    await guardarContenido(claveEnvio(referencia), envio);
    for (const escucha of escuchasEnvio) {
      try { escucha(referencia); } catch { /* La notificación no invalida la escritura. */ }
    }
  },
};

export async function listarEnviosLocales(usuario: string, tipo: 'envio' | 'correccion' = 'envio'): Promise<ReferenciaBorrador[]> {
  const prefijo = JSON.stringify([tipo, usuario]).slice(0, -1) + ',';
  const filas = await serializar(async () => (await abrirBase()).getAllAsync<{ identidad: string }>(
    'SELECT identidad FROM borradores WHERE substr(identidad, 1, length(?)) = ?', prefijo, prefijo,
  ));
  return filas.flatMap(({ identidad }) => {
    const [, propietario, recinto, numero, dignidad] = JSON.parse(identidad) as unknown[];
    if (propietario !== usuario || typeof recinto !== 'string' || typeof numero !== 'number'
      || (dignidad !== 'ALCALDIA' && dignidad !== 'PREFECTURA')) return [];
    return [{ usuario, mesa: { recinto, numero, nombre: recinto }, dignidad }];
  });
}

export type CatalogoCifrado = {
  mesas: import('../domain/registro').Mesa[];
  candidaturas: Record<import('../domain/registro').Dignidad, import('../domain/registro').Candidatura[]>;
  recintos: Record<string, import('../domain/evidencia').RecintoCaptura>;
  actas?: Record<string, Borrador>;
};
const claveCatalogo = (usuario: string) => JSON.stringify(['catalogo', usuario]);

export const catalogosLocales = {
  cargar: (usuario: string) => cargarContenido<CatalogoCifrado>(claveCatalogo(usuario)),
  guardar: (usuario: string, datos: CatalogoCifrado) => guardarContenido(claveCatalogo(usuario), datos),
};

function borrarContenido(identidad: string) {
  return serializar(async () => (await abrirBase()).runAsync('DELETE FROM borradores WHERE identidad = ?', identidad));
}

const claveCorreccion = ({ usuario, mesa, dignidad }: ReferenciaBorrador) =>
  JSON.stringify(['correccion', usuario, mesa.recinto, mesa.numero, dignidad]);

export type CorreccionGuardada = {
  acta: string;
  operacion: string;
  cifras: Cifras;
  ubicacion?: UbicacionCorreccion;
  control?: ControlEnvio;
  confirmacion?: { acta: string; revision: number };
};

export const correccionesLocales: ColaLocal<CorreccionGuardada> = {
  cargar: (referencia) => cargarContenido(claveCorreccion(referencia)),
  async guardar(referencia, correccion) {
    await guardarContenido(claveCorreccion(referencia), correccion);
    for (const escucha of escuchasEnvio) {
      try { escucha(referencia); } catch { /* La notificación no invalida la escritura. */ }
    }
  },
};

export async function limpiarActasAlSalir(usuario: string) {
  await borrarContenido(claveCatalogo(usuario));
  for (const referencia of await listarEnviosLocales(usuario)) {
    const envio = await enviosLocales.cargar(referencia);
    if (!envio?.confirmacion) continue;
    const { mesa, dignidad } = referencia;
    const clave = claveBorrador(usuario, mesa, dignidad);
    const borrador = await cargarContenido<BorradorLocal>(clave);
    if (borrador?.id === envio.acta
      && JSON.stringify(leerCifras(borrador.campos)) === JSON.stringify(envio.cifras)
      && JSON.stringify(borrador.foto) === JSON.stringify(envio.foto)
      && JSON.stringify(borrador.ubicacion) === JSON.stringify(envio.ubicacion)) {
      await borrarContenido(clave);
    }
    await borrarContenido(claveEnvio(referencia));
  }
  for (const referencia of await listarEnviosLocales(usuario, 'correccion')) {
    if ((await correccionesLocales.cargar(referencia))?.confirmacion) await borrarContenido(claveCorreccion(referencia));
  }
}

export async function limpiarCuentasInactivas(usuarioActivo: string | null, sigueInactiva: (usuario: string) => boolean) {
  const filas = await serializar(async () => (await abrirBase()).getAllAsync<{ identidad: string }>(
    'SELECT identidad FROM borradores WHERE identidad LIKE ? OR identidad LIKE ? OR identidad LIKE ?',
    '["catalogo",%', '["envio",%', '["correccion",%',
  ));
  const propietarios = new Set<string>();
  for (const { identidad } of filas) {
    const [, usuario] = JSON.parse(identidad) as unknown[];
    if (typeof usuario === 'string' && usuario !== usuarioActivo) propietarios.add(usuario);
  }
  for (const usuario of propietarios) {
    if (sigueInactiva(usuario)) await limpiarActasAlSalir(usuario);
  }
}
