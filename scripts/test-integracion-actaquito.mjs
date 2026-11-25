import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const requireModule = createRequire(import.meta.url);
function cargar(ruta, modulos = {}) {
  const source = readFileSync(new URL('../src/features/' + ruta, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (nombre) => modulos[nombre] ?? requireModule(nombre), modulo, modulo.exports,
  );
  return modulo.exports;
}

const gestion = cargar('users/domain/gestion-usuarios.ts');
const registro = cargar('actas/domain/registro.ts');
const evidencia = cargar('actas/domain/envio-evidencia.ts');
const { crearEnvioBorrador } = cargar('actas/domain/enviar-borrador.ts', {
  './registro': registro, './envio-evidencia': evidencia,
});
const id = 'acdc0000-0000-4000-8000-000000000001';

test('las invitaciones normalizan identidad y usan las RPC de asignación sin permitir roles arbitrarios', async () => {
  const llamadas = [];
  const client = { functions: { async invoke(...args) {
    llamadas.push(args);
    return { data: { usuarioId: id } };
  } }, async rpc(...args) {
    llamadas.push(args);
    return { data: id, error: null };
  } };
  const api = cargar('users/data/gestion-usuarios.ts', {
    '../domain/gestion-usuarios': gestion,
    '@/features/auth/data/supabase-client': { mobileSupabase: () => client },
  });
  const entrada = { nombres: ' Prueba ', apellidos: 'Cuenta', cedula: '1700000019', correo: 'TEST@example.test', telefono: '0999999999' };
  assert.equal(gestion.cedulaEcuatorianaValida('3000000012'), true);
  await assert.rejects(api.invitarCoordinador({ ...entrada, cedula: '1700000010' }));
  await assert.rejects(api.invitarCoordinador({ ...entrada, rol: 'provincial' }));
  assert.equal(llamadas.length, 0);
  assert.deepEqual(await api.invitarCoordinador(entrada), { usuarioId: id });
  await api.invitarVeedor(entrada, 'R01');
  await api.asignarCoordinador({ recinto: 'R01', coordinador: id });
  await api.asignarVeedor({ recinto: 'R01', mesa: 1, veedor: id, asignacionSaliente: null });
  assert.deepEqual(llamadas, [
    ['invitar-usuario', { body: { ...entrada, nombres: 'Prueba', correo: 'test@example.test' } }],
    ['invitar-usuario', { body: { ...entrada, nombres: 'Prueba', correo: 'test@example.test', recinto: 'R01' } }],
    ['asignar_coordinador', { recinto: 'R01', coordinador: id }],
    ['asignar_veedor', { recinto: 'R01', mesa: 1, veedor: id, asignacion_saliente: null }],
  ]);
});

const siglas = ['MFC', 'ARP', 'MUC', 'FDP', 'MNE'];
const referencia = { usuario: id, mesa: { recinto: 'R01', numero: 1, nombre: 'Recinto' }, dignidad: 'ALCALDIA' };
function entorno() {
  const borrador = {
    id, campos: { votos: { MFC: '1', ARP: '0', MUC: '0', FDP: '0', MNE: '0' }, blancos: '0', nulos: '0', sufragantes: '1' },
    foto: { jpegBase64: 'foto-local', capturadaEn: 1000 },
    ubicacion: { latitud: -0.16, longitud: -78.48, precisionMetros: 5, capturadaEn: 1001, resultado: 'fuera' },
  };
  let envio;
  let secuencia = 0;
  const llamadasCifras = [];
  const llamadasEvidencia = [];
  const puertos = {
    borradores: { cargar: async () => borrador },
    envios: { cargar: async () => structuredClone(envio), guardar: async (_r, nuevo) => { envio = structuredClone(nuevo); } },
    uuid: () => 'uuid-' + (++secuencia),
    validarSesion: async () => {},
    actas: { guardar: async (cifras) => { llamadasCifras.push(cifras); return 7; } },
    evidencia: { enviar: async (entrada) => {
      llamadasEvidencia.push(entrada);
      return { acta: entrada.acta, operacion: entrada.operacion, confirmada: true };
    } },
  };
  return { borrador, puertos, llamadasCifras, llamadasEvidencia };
}

test('sin GPS utilizable no guarda cifras remotas ni intenta emitir evidencia', async () => {
  const { borrador, puertos, llamadasCifras, llamadasEvidencia } = entorno();
  borrador.ubicacion.resultado = 'imprecisa';
  await assert.rejects(crearEnvioBorrador(puertos)(referencia, siglas), { codigo: 'evidencia_incompleta' });
  assert.deepEqual([llamadasCifras.length, llamadasEvidencia.length], [0, 0]);
});

test('recupera una respuesta de cifras perdida con el UUID persistido tras reiniciar', async () => {
  const { puertos, llamadasCifras } = entorno();
  const guardar = puertos.actas.guardar;
  puertos.actas.guardar = async (cifras) => {
    await guardar(cifras);
    throw new Error('Respuesta perdida');
  };
  await assert.rejects(crearEnvioBorrador(puertos)(referencia, siglas), /perdida/);
  puertos.actas.guardar = guardar;
  await crearEnvioBorrador(puertos)(referencia, siglas);
  assert.equal(llamadasCifras[0].operacion, llamadasCifras[1].operacion);
});

test('conserva foto, revisión y UUID de evidencia tras fallo, edición local y reapertura', async () => {
  const { borrador, puertos, llamadasCifras, llamadasEvidencia } = entorno();
  const enviar = puertos.evidencia.enviar;
  puertos.evidencia.enviar = async (entrada) => {
    await enviar(entrada);
    throw new Error('Confirmación pendiente');
  };
  const primera = crearEnvioBorrador(puertos);
  const intento = primera(referencia, siglas);
  assert.equal(intento, primera(referencia, siglas));
  await assert.rejects(intento, /pendiente/);
  borrador.foto.jpegBase64 = 'otra-foto';
  puertos.evidencia.enviar = enviar;
  const reabierto = crearEnvioBorrador(puertos);
  const recibo = await reabierto(referencia, siglas);
  assert.deepEqual(await reabierto(referencia, siglas), recibo);
  assert.equal(llamadasCifras.length, 1);
  assert.equal(llamadasEvidencia[0].revision, 7);
  assert.deepEqual(llamadasEvidencia[0], llamadasEvidencia[1]);
  assert.equal(llamadasEvidencia.length, 2);
});

test('una sesión ajena no inicia ni continúa el envío del borrador', async () => {
  const { puertos, llamadasCifras, llamadasEvidencia } = entorno();
  puertos.validarSesion = async () => { throw new Error('Sesión ajena'); };
  await assert.rejects(crearEnvioBorrador(puertos)(referencia, siglas), /ajena/);
  assert.deepEqual([llamadasCifras.length, llamadasEvidencia.length], [0, 0]);
});
