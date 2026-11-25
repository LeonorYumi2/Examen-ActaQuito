import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/recintos/data/operaciones-roles.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function repositorio(responder) {
  const client = createClient('https://dashboard.example.test', 'clave-local-de-prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => responder(new URL(input), init) },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    () => ({ mobileSupabase: () => client }), modulo, modulo.exports,
  );
  return modulo.exports.operacionesPorRolRepositorio;
}

test('el contador y el listado consultan los mismos coordinadores con las columnas concedidas', async () => {
  const api = repositorio((url, { method }) => {
    const tabla = url.pathname.split('/').at(-1);
    if (tabla === 'usuarios') {
      assert.equal(url.searchParams.get('rol'), 'eq.recinto');
      assert.equal(url.searchParams.get('select'), method === 'HEAD' ? 'id' : 'id,nombres,apellidos,habilitado');
      return method === 'HEAD'
        ? new Response(null, { headers: { 'content-range': '0-0/1' } })
        : Response.json([{ id: 'u1', nombres: 'Persona', apellidos: 'Prueba', habilitado: true }]);
    }
    if (tabla === 'asignaciones_coordinador') assert.equal(url.searchParams.get('fin'), 'is.null');
    return method === 'HEAD'
      ? new Response(null, { headers: { 'content-range': '*/0' } })
      : Response.json([]);
  });
  const resumen = await api.obtenerResumenProvincial();
  const lista = await api.listarCoordinadoresProvincial();
  assert.equal(resumen.totalCoordinadores, lista.length);
  assert.equal(lista[0].recintoCodigo, 'Sin asignar');
  assert.equal(lista[0].correo, undefined);
});

test('una consulta auxiliar denegada conserva tabla y SQLSTATE y no devuelve un listado vacío', async () => {
  const api = repositorio((url) => url.pathname.endsWith('/asignaciones_coordinador')
    ? Response.json({ code: '42501', message: 'permission denied for table asignaciones_coordinador' }, { status: 403 })
    : Response.json([]));
  await assert.rejects(api.listarCoordinadoresProvincial(), {
    tabla: 'asignaciones_coordinador', codigo: '42501', status: 403,
    message: 'Permisos insuficientes para consultar esta sección con tu rol actual.',
  });
});

test('un fallo de red conserva su diagnóstico y una respuesta vacía válida devuelve []', async () => {
  const sinRed = repositorio((url) => {
    if (url.pathname.endsWith('/usuarios')) throw new TypeError('Failed to fetch');
    return Response.json([]);
  });
  await assert.rejects(sinRed.listarCoordinadoresProvincial(), {
    tabla: 'usuarios', status: 0,
    message: 'No fue posible conectar con el servidor. Verifica tu conexión de red.',
  });
  assert.deepEqual(await repositorio(() => Response.json([])).listarCoordinadoresProvincial(), []);
});
