import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { decode, encode } from 'jpeg-js';
import ts from 'typescript';

const requireModule = createRequire(import.meta.url);
function cargarModulo(ruta, modulos = {}) {
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

const registro = cargarModulo('domain/registro.ts');
const evidencia = cargarModulo('domain/evidencia.ts', { './registro': registro });
const { capturarUbicacion, claveBorrador, distanciaHaversine, evaluarUbicacion,
  fotoSuficientementeNitida, guardarBorradorLocal } = evidencia;

const recinto = { latitud: 0, longitud: 0, margenMetros: 200 };
const lectura = (latitud, precisionMetros = 10) => ({ latitud, longitud: 0, precisionMetros, capturadaEn: 1000 });

test('distancia Haversine y margen separan GPS dentro, fuera e impreciso', () => {
  assert.ok(Math.abs(distanciaHaversine(recinto, lectura(0.001)) - 111.195) < 0.01);
  assert.equal(evaluarUbicacion(lectura(0.001), recinto).resultado, 'dentro');
  assert.equal(evaluarUbicacion(lectura(0.002), recinto).resultado, 'fuera');
  assert.equal(evaluarUbicacion(lectura(0.0017, 20), recinto).resultado, 'imprecisa');
  assert.equal(evaluarUbicacion(lectura(0.001), { ...recinto, margenMetros: 90 }).resultado, 'fuera');
});

test('cámara: acepta bordes nítidos y rechaza un desenfoque sobre JPEG realmente decodificado', () => {
  const ancho = 64;
  const alto = 64;
  const foto = (difusa) => {
    const data = new Uint8Array(ancho * alto * 4);
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const i = 4 * (y * ancho + x);
        const valor = difusa ? Math.min(255, Math.max(0, (x - 16) * 8)) : (x < 32 ? 0 : 255);
        data.set([valor, valor, valor, 255], i);
      }
    }
    return decode(encode({ width: ancho, height: alto, data }, 90).data, { useTArray: true });
  };
  const nitida = foto(false);
  const borrosa = foto(true);
  assert.equal(fotoSuficientementeNitida(nitida.data, nitida.width, nitida.height), true);
  assert.equal(fotoSuficientementeNitida(borrosa.data, borrosa.width, borrosa.height), false);
  assert.equal(fotoSuficientementeNitida(new Uint8Array(4), 320, 240), false);
});

test('si se deniega el GPS no se lee la posición', async () => {
  const resultado = await capturarUbicacion({
    permitir: async () => false,
    leer: async () => assert.fail('Se intentó leer GPS sin permiso'),
  }, recinto);
  assert.deepEqual(resultado, { estado: 'permiso-denegado' });
});

test('sin señal o con precisión desconocida no se obtiene evidencia de ubicación', async () => {
  for (const valor of [null, lectura(0, null), lectura(91), lectura(0, NaN)]) {
    assert.deepEqual(await capturarUbicacion({
      permitir: async () => true, leer: async () => valor,
    }, recinto), { estado: 'no-disponible' });
  }
});

test('los borradores se separan por usuario, mesa y dignidad', () => {
  const mesa = { nombre: 'Recinto de prueba', recinto: 'R01', numero: 1 };
  const variantes = [
    claveBorrador('veedor-a', mesa, 'ALCALDIA'),
    claveBorrador('veedor-a', mesa, 'PREFECTURA'),
    claveBorrador('veedor-a', { ...mesa, numero: 2 }, 'ALCALDIA'),
    claveBorrador('veedor-b', mesa, 'ALCALDIA'),
  ];
  assert.equal(new Set(variantes).size, variantes.length);
});

test('un borrador sin evidencia guarda sus cifras en el teléfono y carece de estado reportado', async () => {
  const siglas = ['MFC', 'ARP', 'MUC', 'FDP', 'MNE'];
  const mesa = { nombre: 'Recinto de prueba', recinto: 'R01', numero: 1 };
  const campos = { votos: { MFC: '1', ARP: '0', MUC: '0', FDP: '0', MNE: '0' },
    blancos: '0', nulos: '0', sufragantes: '1' };
  const dados = [];
  const local = { guardar: async (...args) => { dados.push(args); } };
  await guardarBorradorLocal(local, 'veedor-a', mesa, 'ALCALDIA', { id: 'acta-a', campos }, siglas);
  assert.deepEqual(dados, [['veedor-a', mesa, 'ALCALDIA', { id: 'acta-a', campos }]]);
  await assert.rejects(guardarBorradorLocal(local, 'veedor-a', mesa, 'ALCALDIA',
    { id: 'acta-a', campos: { ...campos, sufragantes: '9' } }, siglas));
  assert.equal(dados.length, 1);
});

test('el adaptador comprime una toma válida y descarta temporales de una toma borrosa', async () => {
  const opciones = [];
  const eliminados = [];
  let nitida = true;
  const ancho = 32;
  const alto = 32;
  const foto = () => {
    const data = new Uint8Array(ancho * alto * 4);
    for (let i = 0; i < ancho * alto; i++) {
      const pixel = nitida && i % ancho >= ancho / 2 ? 255 : 20;
      data.set([pixel, pixel, pixel, 255], i * 4);
    }
    return encode({ width: ancho, height: alto, data }, 90).data;
  };
  const { prepararFoto } = cargarModulo('data/captura-nativa.ts', {
    '../domain/evidencia': evidencia,
    '../domain/registro': registro,
    'expo-location': {},
    'expo-file-system': { File: class {
      constructor(uri) { this.uri = uri; }
      async bytes() { return foto(); }
      delete() { eliminados.push(this.uri); }
    } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: {
      manipulate: () => ({ resize: () => ({ renderAsync: async () => ({
        async saveAsync(opcion) {
          opciones.push(opcion);
          return opcion.base64 ? { uri: 'comprimida', base64: 'jpeg' } : { uri: 'reducida' };
        },
      }) }) }),
    } },
  });
  const toma = { uri: 'camara', width: 1700, height: 2000 };
  assert.deepEqual(await prepararFoto(toma, 42), { jpegBase64: 'jpeg', capturadaEn: 42 });
  assert.equal(opciones[1].compress, 0.82);
  assert.deepEqual(eliminados.splice(0), ['camara', 'reducida', 'comprimida']);
  nitida = false;
  await assert.rejects(prepararFoto(toma, 43), /nítida/);
  assert.equal(opciones.length, 3);
  assert.deepEqual(eliminados, ['camara', 'reducida']);
});
