import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/actas/domain/registro.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)(createRequire(import.meta.url), module, module.exports);
const { esquemaActa, guardarRegistro } = module.exports;

const siglas = ['MFC', 'ARP', 'MUC', 'FDP', 'MNE'];
const valido = { votos: { MFC: '2', ARP: '1', MUC: '0', FDP: '0', MNE: '0' }, blancos: '1', nulos: '1', sufragantes: '5' };
const esquema = esquemaActa(siglas);

test('acepta suma exacta y un acta completa con todos los valores en cero', () => {
  assert.equal(esquema.safeParse(valido).success, true);
  const votos = Object.fromEntries(siglas.map((sigla) => [sigla, '0']));
  assert.equal(esquema.safeParse({ votos, blancos: '0', nulos: '0', sufragantes: '0' }).success, true);
});

test('rechaza blancos vacíos, fracciones, negativos, notación científica y desbordamientos', () => {
  for (const blancos of ['', '-1', '1.0', '1e0', '2147483648']) {
    assert.equal(esquema.safeParse({ ...valido, blancos }).success, false);
  }
});

test('exige las cinco siglas exactas y que la suma no supere ni quede corta', () => {
  assert.equal(esquema.safeParse({ ...valido, votos: { ...valido.votos, OTRA: '0' } }).success, false);
  for (const sufragantes of ['1', '4', '6']) {
    assert.equal(esquema.safeParse({ ...valido, sufragantes }).success, false);
  }
});

test('el caso de uso convierte a números y evita guardar entradas inválidas', async () => {
  const datos = { id: 'acta', operacion: 'operacion', mesa: { recinto: 'R01', numero: 1 }, dignidad: 'ALCALDIA' };
  let peticiones = 0;
  const repo = { guardar: async ({ cifras }) => {
    peticiones++;
    assert.deepEqual(cifras, { votos: { MFC: 2, ARP: 1, MUC: 0, FDP: 0, MNE: 0 }, blancos: 1, nulos: 1, sufragantes: 5 });
    return 1;
  } };
  await assert.rejects(guardarRegistro(repo, datos, { ...valido, nulos: '-1' }, siglas));
  assert.equal(peticiones, 0);
  assert.equal(await guardarRegistro(repo, datos, valido, siglas), 1);
  assert.equal(peticiones, 1);
});
