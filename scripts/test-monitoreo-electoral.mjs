import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const requireModule = createRequire(import.meta.url);
function cargar(ruta, modulos = {}) {
  const source = readFileSync(new URL('../src/features/monitoreo/' + ruta, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (nombre) => modulos[nombre] ?? requireModule(nombre), modulo, modulo.exports,
  );
  return modulo.exports;
}

test('comparte el canal, agrupa señales y limpia el temporizador y la última suscripción', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { crearSenalMonitoreo } = cargar('data/senal-monitoreo.ts');
  const conexiones = [];
  const cierres = [];
  const actualizaciones = [];
  let consultaEnCurso = true;
  const senal = crearSenalMonitoreo((usuario, avisar) => {
    conexiones.push({ usuario, avisar });
    return () => cierres.push(usuario);
  }, (usuario) => actualizaciones.push(usuario), () => consultaEnCurso, 10);
  const salirA = senal.suscribir('usuario-a');
  const salirB = senal.suscribir('usuario-a');
  assert.equal(conexiones.length, 1);
  conexiones[0].avisar();
  conexiones[0].avisar();
  t.mock.timers.tick(10);
  assert.equal(actualizaciones.length, 0);
  consultaEnCurso = false;
  t.mock.timers.tick(10);
  assert.deepEqual(actualizaciones, ['usuario-a']);
  salirA();
  salirA();
  assert.deepEqual(cierres, []);
  conexiones[0].avisar();
  salirB();
  t.mock.timers.tick(100);
  assert.deepEqual(cierres, ['usuario-a']);
  assert.equal(actualizaciones.length, 1);
});

test('cerrar sesión cancela señales antiguas incluso si ya hay otro usuario', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { crearSenalMonitoreo } = cargar('data/senal-monitoreo.ts');
  const callbacks = new Map();
  const cierres = [];
  const actualizaciones = [];
  const senal = crearSenalMonitoreo((usuario, avisar) => {
    callbacks.set(usuario, avisar);
    return () => cierres.push(usuario);
  }, (usuario) => actualizaciones.push(usuario), () => false, 10);
  const salir = senal.suscribir('usuario-a');
  callbacks.get('usuario-a')();
  senal.cerrar('usuario-a');
  senal.suscribir('usuario-b');
  callbacks.get('usuario-a')();
  callbacks.get('usuario-b')();
  t.mock.timers.tick(50);
  salir();
  assert.deepEqual(cierres, ['usuario-a']);
  assert.deepEqual(actualizaciones, ['usuario-b']);
  senal.cerrar('usuario-b');
});

test('consulta una sola instantánea ligada al JWT de la cuenta y propaga errores', async () => {
  const dominio = cargar('domain/seguimiento-electoral.ts');
  const instantanea = { actas: [], recintos: [], resultados: [] };
  let respuesta = { data: instantanea };
  const llamadas = [];
  const signal = new AbortController().signal;
  const { repositorioMonitoreoElectoral: repo } = cargar('data/repositorio-monitoreo-electoral.ts', {
    '../domain/seguimiento-electoral': dominio,
    '@/features/auth/data/supabase-client': { mobileSupabase: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'usuario-a' }, access_token: 'jwt-prueba' } } }) },
      rpc(nombre) {
        llamadas.push(nombre);
        return {
          setHeader(nombre, valor) { llamadas.push([nombre, valor]); return this; },
          abortSignal(valor) { assert.equal(valor, signal); return this; },
          then(resolve) { return Promise.resolve(respuesta).then(resolve); },
        };
      },
    }) },
  });
  await assert.rejects(repo.consultar('usuario-b'), /Inicia sesión/);
  assert.equal(llamadas.length, 0);
  assert.deepEqual(await dominio.consultarMonitoreoElectoral(repo, 'usuario-a', signal), instantanea);
  assert.deepEqual(llamadas, ['leer_monitoreo_electoral', ['Authorization', 'Bearer jwt-prueba']]);
  respuesta = { error: { code: '42501' }, status: 403 };
  await assert.rejects(repo.consultar('usuario-a'), /no puede consultar/);
});

test('el contrato Leaflet usa teselas OSM, valida mensajes y neutraliza texto dentro del puente', () => {
  const { documentoMapaElectoral, actualizarMapaElectoral, leerMensajeMapa } = cargar('data/mapa-leaflet.ts');
  const documento = documentoMapaElectoral('https://actaquito.example/proyecto');
  assert.equal(documento.baseUrl, 'https://actaquito.example/');
  assert.match(documento.html, /tile\.openstreetmap\.org/);
  assert.match(documento.html, /leaflet@1\.9\.4/);
  assert.match(documento.html, /OpenStreetMap.*contributors/);
  assert.throws(() => documentoMapaElectoral('http://actaquito.example'));
  const carga = actualizarMapaElectoral({ recintos: [{ nombre: '</script> \u2028' }], actas: [] });
  assert.ok(!carga.includes('</script>'));
  assert.ok(carga.includes('\\u003c/script>'));
  assert.deepEqual(leerMensajeMapa('{"tipo":"recinto","codigo":"R01"}'), { tipo: 'recinto', codigo: 'R01' });
  assert.equal(leerMensajeMapa('{"tipo":"acta","id":"inválido"}'), null);
});
