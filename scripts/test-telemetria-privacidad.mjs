import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const modulo = { exports: {} };
const fuente = readFileSync(new URL('../src/telemetria-privacidad.ts', import.meta.url), 'utf8');
new Function('module', 'exports', ts.transpile(fuente, { module: ts.ModuleKind.CommonJS }))(modulo, modulo.exports);

test('Sentry conserva diagnóstico técnico y descarta datos sensibles', () => {
  const secreto = 'secreto-de-prueba';
  const correo = 'elector@example.test';
  const gps = '-78.51045';
  const foto = 'data:image/jpeg;base64,AAAA';
  const evento = modulo.exports.sanearEvento({
    user: { email: correo }, request: { headers: { authorization: secreto } },
    extra: { gps, foto }, breadcrumbs: [{ message: secreto }],
    environment: 'development',
    tags: { operacion: 'carga-evidencia', cedula: secreto, prueba: 'javascript-controlada' },
    exception: { values: [{ type: 'Error', value: secreto, stacktrace: { frames: [
      { filename: 'app:///index.android.bundle', lineno: 12 },
      { filename: 'https://example.test/file.js?token=' + secreto },
    ] } }] },
  }, { modelo: 'Pixel 6', versionSistema: '14', versionApp: '1.0.0' }, 'registro-actas');
  const cuerpo = JSON.stringify(evento);
  for (const dato of [secreto, correo, gps, foto]) assert.ok(!cuerpo.includes(dato));
  assert.deepEqual(evento.tags, { pantalla: 'registro-actas', operacion: 'carga-evidencia', prueba: 'javascript-controlada' });
  assert.equal(evento.environment, 'development');
  assert.equal(evento.contexts.device.model, 'Pixel 6');
  assert.equal(evento.exception.values[0].stacktrace.frames.length, 1);
  assert.equal(modulo.exports.sanearEvento({ message: secreto }, {}, 'inicio'), null);
});
