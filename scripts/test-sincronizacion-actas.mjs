import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';

const requireModule = createRequire(import.meta.url);
function cargar(ruta, modulos = {}) {
  const source = readFileSync(new URL('../src/features/actas/' + ruta, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (nombre) => modulos[nombre] ?? requireModule(nombre), modulo, modulo.exports,
  );
  return modulo.exports;
}

const registro = cargar('domain/registro.ts');
const errores = cargar('domain/envio-evidencia.ts');
const evidencia = cargar('domain/evidencia.ts', { './registro': registro });
const borradores = cargar('domain/enviar-borrador.ts', { './registro': registro, './envio-evidencia': errores });
const { crearProcesadorOutbox, falloEnvio, controlEnvio } = cargar('domain/sincronizacion.ts', {
  './enviar-borrador': borradores, './registro': registro, './envio-evidencia': errores,
});
const { ErrorEnvioEvidencia } = errores;
const siglas = ['MFC', 'ARP', 'MUC', 'FDP', 'MNE'];
const referencia = { usuario: 'usuario-a', mesa: { recinto: 'R01', nombre: 'Recinto', numero: 1 }, dignidad: 'ALCALDIA' };
const ajena = { ...referencia, usuario: 'usuario-b' };
const foto = { jpegBase64: 'Rk9UTy1QUklWQURB', capturadaEn: 10 };
const borrador = {
  id: 'acta-1', foto, campos: { votos: { MFC: '1', ARP: '0', MUC: '0', FDP: '0', MNE: '0' },
    blancos: '0', nulos: '0', sufragantes: '1' },
  ubicacion: { latitud: -0.17, longitud: -78, precisionMetros: 9, capturadaEn: 12, resultado: 'fuera' },
};

function dispositivo() {
  const sqlite = new DatabaseSync(':memory:');
  const llaves = new Map();
  const importar = (raw) => webcrypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const adaptadores = {
    '../domain/registro': registro,
    '../domain/enviar-borrador': borradores,
    '../domain/evidencia': evidencia,
    'expo-sqlite': { openDatabaseAsync: async () => ({
      execAsync: async (sql) => sqlite.exec(sql),
      runAsync: async (sql, ...args) => sqlite.prepare(sql).run(...args),
      getFirstAsync: async (sql, ...args) => sqlite.prepare(sql).get(...args),
      getAllAsync: async (sql, ...args) => sqlite.prepare(sql).all(...args),
    }) },
    'expo-secure-store': {
      getItemAsync: async (key) => llaves.get(key) ?? null,
      setItemAsync: async (key, value) => { llaves.set(key, value); },
    },
    'expo-crypto': {
      AESEncryptionKey: {
        async generate() {
          const raw = webcrypto.getRandomValues(new Uint8Array(32));
          return { crypt: await importar(raw), encoded: async () => Buffer.from(raw).toString('hex') };
        },
        async import(value) { return { crypt: await importar(Buffer.from(value, 'hex')) }; },
      },
      AESSealedData: { fromCombined(bytes) {
        assert.ok(bytes instanceof Uint8Array);
        return bytes;
      } },
      async aesEncryptAsync(bytes, { crypt }, { additionalData }) {
        const iv = webcrypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, crypt, bytes);
        return { combined: async () => Buffer.concat([iv, Buffer.from(ciphertext)]) };
      },
      async aesDecryptAsync(bytes, { crypt }, { additionalData }) {
        return new Uint8Array(await webcrypto.subtle.decrypt({
          name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData,
        }, crypt, bytes.subarray(12)));
      },
    },
  };
  return { sqlite, abrir: () => cargar('data/borradores-locales.ts', adaptadores) };
}

test('guarda sin internet y recupera foto, coordenadas y UUID cifrados tras reiniciar el adaptador', async () => {
  const { sqlite, abrir } = dispositivo();
  const inicial = abrir();
  await inicial.borradoresLocales.guardar(referencia.usuario, referencia.mesa, referencia.dignidad, borrador);
  let siguiente = 0;
  const enviar = borradores.crearEnvioBorrador({
    borradores: inicial.borradoresLocales, envios: inicial.enviosLocales,
    uuid: () => 'operacion-' + (++siguiente),
    validarSesion: async () => assert.fail('No se necesita red para encolar'),
  });
  await enviar.encolar(referencia, siglas);
  const segunda = abrir();
  const copia = await segunda.borradoresLocales.cargar(referencia.usuario, referencia.mesa, referencia.dignidad);
  assert.deepEqual(copia, borrador);
  assert.deepEqual((await segunda.listarEnviosLocales(referencia.usuario)).map(r => r.usuario), [referencia.usuario]);
  assert.equal(await segunda.enviosLocales.cargar(ajena), null);
  assert.deepEqual(await segunda.listarEnviosLocales(ajena.usuario), []);
  assert.equal((await segunda.enviosLocales.cargar(referencia)).operacionEvidencia, 'operacion-2');
  for (const fila of sqlite.prepare('select contenido from borradores').all()) {
    assert.ok(!Buffer.from(fila.contenido).includes(foto.jpegBase64));
  }
  await segunda.limpiarActasAlSalir(referencia.usuario);
  assert.deepEqual(await segunda.borradoresLocales.cargar(referencia.usuario, referencia.mesa, referencia.dignidad), borrador);
  assert.ok(await segunda.enviosLocales.cargar(referencia));
  sqlite.close();
});

function prepararTrabajo() {
  let trabajo = { operacionCifras: 'cifras-1', operacionEvidencia: 'evidencia-1' };
  const locales = {
    cargar: async (r) => r.usuario === referencia.usuario ? structuredClone(trabajo) : null,
    guardar: async (_r, siguiente) => { trabajo = structuredClone(siguiente); },
  };
  return { locales, consultar: () => trabajo };
}

test('al volver la red reenvía los mismos UUID, aplica espera y comparte el mismo intento concurrente', async () => {
  const { locales, consultar } = prepararTrabajo();
  const recibo = { acta: 'acta', operacion: 'evidencia-1', confirmada: true };
  const intentos = [];
  let ahora = 1_000;
  let usuarioActivo = ajena.usuario;
  let disponible = true;
  const conectar = () => crearProcesadorOutbox(locales, async (r) => {
    const trabajo = await locales.cargar(r);
    intentos.push([trabajo.operacionCifras, trabajo.operacionEvidencia]);
    if (intentos.length === 1) {
      disponible = false;
      throw new Error('Se perdió la conexión durante el envío');
    }
    await locales.guardar(r, { ...trabajo, confirmacion: recibo });
    return recibo;
  }, (usuario) => disponible && usuario === usuarioActivo, () => ahora);
  const inicial = conectar();
  assert.equal(await inicial(referencia), undefined);
  usuarioActivo = referencia.usuario;
  await assert.rejects(inicial(referencia), /perdió/);
  assert.equal(controlEnvio(consultar()).estado, 'pendiente');
  assert.equal(await inicial(referencia), undefined);
  disponible = true;
  const reabierta = conectar();
  assert.equal(await reabierta(referencia), undefined);
  ahora = consultar().control.siguiente;
  const pendiente = reabierta(referencia);
  assert.equal(pendiente, reabierta(referencia));
  assert.deepEqual(await pendiente, recibo);
  assert.deepEqual(intentos, [['cifras-1', 'evidencia-1'], ['cifras-1', 'evidencia-1']]);
  assert.deepEqual(await reabierta(referencia), recibo);
  assert.equal(intentos.length, 2);
  assert.equal(controlEnvio(consultar()).estado, 'sincronizado');
});

test('un 403 es terminal y un conflicto exige intervención sin más escrituras', async () => {
  for (const [status, estado] of [[403, 'rechazado'], [409, 'requiere-intervencion']]) {
    const { locales, consultar } = prepararTrabajo();
    let intentos = 0;
    const ejecutar = crearProcesadorOutbox(locales, async () => {
      intentos++;
      throw new ErrorEnvioEvidencia(status, 'fallo_servidor', 'No se pudo enviar');
    }, () => true);
    await assert.rejects(ejecutar(referencia));
    assert.equal(controlEnvio(consultar()).estado, estado);
    assert.equal(await ejecutar(referencia), undefined);
    assert.equal(intentos, 1);
  }
});

test('429 respeta Retry-After, los fallos repetidos se detienen y se recupera un intento interrumpido', async () => {
  assert.equal(falloEnvio(new ErrorEnvioEvidencia(429, 'limite', 'Espera', 39_000), 1, 1000).siguiente, 40_000);
  assert.equal(falloEnvio(new Error('Red'), 6, 1000).codigo, 'intentos_agotados');
  const { locales, consultar } = prepararTrabajo();
  await locales.guardar(referencia, { ...consultar(), control: { estado: 'sincronizando', intentos: 1 } });
  const ejecutar = crearProcesadorOutbox(locales, async (r) => {
    const trabajo = await locales.cargar(r);
    assert.equal(trabajo.control.intentos, 2);
    assert.equal(trabajo.operacionCifras, 'cifras-1');
    const confirmacion = { acta: 'acta', revision: 9 };
    await locales.guardar(r, { ...trabajo, confirmacion });
    return confirmacion;
  }, () => true);
  assert.deepEqual(await ejecutar(referencia), { acta: 'acta', revision: 9 });
  assert.equal(controlEnvio(consultar()).estado, 'sincronizado');
});

test('el adaptador despierta automáticamente con NetInfo y fija el JWT de la cuenta en cada escritura', async () => {
  const { sqlite, abrir } = dispositivo();
  const locales = abrir();
  let notificarRed;
  let indice = 0;
  const escrituras = [];
  const sesion = { user: { id: referencia.usuario }, access_token: 'jwt-de-a' };
  let resolver;
  const confirmado = new Promise((resolve) => { resolver = resolve; });
  const guardarEnvio = locales.enviosLocales.guardar;
  locales.enviosLocales.guardar = async (ref, envio) => {
    await guardarEnvio(ref, envio);
    if (envio.confirmacion) resolver();
  };
  const aplicacion = cargar('data/enviar-borrador.ts', {
    '../domain/enviar-borrador': borradores, '../domain/evidencia': evidencia,
    '../domain/envio-evidencia': errores, '../domain/registro': registro,
    '../domain/sincronizacion': { crearProcesadorOutbox, controlEnvio },
    'expo-crypto': { randomUUID: () => 'op-' + (++indice) },
    'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: () => {} } },
    '@react-native-community/netinfo': { __esModule: true, default: { addEventListener: (callback) => { notificarRed = callback; } } },
    '@/features/auth/data/supabase-client': { mobileSupabase: () => ({ auth: {
      getSession: async () => ({ data: { session: sesion } }),
      getUser: async (token) => {
        assert.equal(token, sesion.access_token);
        return { data: { user: sesion.user } };
      },
    } }) },
    '@/telemetria': { reportarFalloElectoral: () => {} },
    '../domain/historial-acta': cargar('domain/historial-acta.ts', { './registro': registro }),
    './repositorio-detalle-acta': { guardarCorreccionActa: async () => 2 },
    './borradores-locales': locales,
    './catalogo-offline': { precargarCatalogoActas: async () => {} },
    './repositorio-actas': { repositorioActas: { guardar: async (solicitud, token) => {
      escrituras.push(['cifras', solicitud.operacion, token]);
      return 1;
    } } },
    './repositorio-envio-evidencia': { repositorioEnvioEvidencia: { enviar: async (solicitud, token) => {
      escrituras.push(['evidencia', solicitud.operacion, token]);
      assert.deepEqual(solicitud.foto, foto);
      return { acta: solicitud.acta, operacion: solicitud.operacion, confirmada: true };
    } } },
  });
  aplicacion.iniciarSincronizacionActas({
    getState: () => ({ access: { kind: 'operational', profile: { id: referencia.usuario, role: 'veedor' } } }),
    subscribe: () => () => {},
  });
  notificarRed({ isConnected: false, isInternetReachable: false });
  await aplicacion.guardarCapturaLocal(referencia, borrador);
  await aplicacion.encolarBorradorLocal(referencia, siglas);
  assert.equal((await aplicacion.detalleSincronizacionBorrador(referencia)).estado, 'pendiente');
  await assert.rejects(aplicacion.cargarBorradorOffline(ajena), { status: 401 });
  assert.deepEqual(escrituras, []);
  notificarRed({ isConnected: true, isInternetReachable: true });
  notificarRed({ isConnected: true, isInternetReachable: true });
  const limite = setTimeout(() => resolver('timeout'), 2000);
  assert.notEqual(await confirmado, 'timeout');
  clearTimeout(limite);
  assert.equal((await aplicacion.detalleSincronizacionBorrador(referencia)).estado, 'sincronizado');
  assert.deepEqual(escrituras, [['cifras', 'op-1', 'jwt-de-a'], ['evidencia', 'op-2', 'jwt-de-a']]);
  notificarRed({ isConnected: false, isInternetReachable: false });
  sqlite.close();
});
