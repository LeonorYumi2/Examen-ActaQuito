import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";

const codigoComun = stripTypeScriptTypes(
  await readFile(new URL("../functions/_shared/invitaciones.mts", import.meta.url), "utf8"),
  { mode: "transform" },
);
const codigoEdge = await readFile(new URL("../functions/invitar-usuario/index.mjs", import.meta.url), "utf8");
const usuarioId = "usuario-de-prueba";
const reserva = { id: "reserva-de-prueba", correo: "prueba@example.test", usuarioId: null };

async function cargar({ metodo = "password", rol = "authenticated", existente = true, redireccion = "actaquito://auth/confirm", correoConfirmado = false, errorDeEnvio, errorDeGestion } = {}) {
  const llamadas = [];
  let identidadCreada = existente;
  const cliente = {
    auth: {
      getUser: async () => ({ data: { user: { id: usuarioId } } }),
      getClaims: async () => ({ data: { claims: { sub: usuarioId, role: rol, amr: [{ method: metodo }] } } }),
      admin: {
        async inviteUserByEmail(correo, opciones) {
          llamadas.push({ tipo: "correo", correo, opciones });
          if (!errorDeEnvio) identidadCreada = true;
          return { error: errorDeEnvio };
        },
      },
    },
    async rpc(nombre, parametros) {
      llamadas.push({ tipo: nombre, parametros });
      if (nombre === "gestionar_invitacion") {
        return { data: { ...reserva, correoConfirmado }, error: errorDeGestion };
      }
      if (nombre === "reservar_invitacion") return { data: { ...reserva, usuarioId: identidadCreada ? usuarioId : null } };
      if (nombre === "confirmar_invitacion") return { data: identidadCreada ? usuarioId : null };
      throw new Error(`RPC inesperada: ${nombre}`);
    },
  };
  let manejar;
  const contexto = vm.createContext({
    Request,
    Response,
    TextDecoder,
    Deno: {
      env: { get: (nombre) => nombre === "ACTAQUITO_AUTH_REDIRECT_URL" ? redireccion : "http://localhost:54321" },
      serve: (handler) => { manejar = handler; },
    },
  });
  const sdk = new vm.SyntheticModule(["createClient"], function () {
    this.setExport("createClient", () => cliente);
  }, { context: contexto });
  const comun = new vm.SourceTextModule(codigoComun, { context: contexto });
  await comun.link(() => sdk);
  await comun.evaluate();

  const edge = new vm.SourceTextModule(codigoEdge, { context: contexto });
  await edge.link(() => comun);
  await edge.evaluate();
  return { manejar, llamadas, gestionar: (operacion) => comun.namespace.gestionarInvitacion(cliente, reserva.correo, operacion) };
}

function solicitud(campos = {}) {
  return new Request("http://localhost/invitar-usuario", {
    method: "POST",
    headers: { Authorization: "Bearer token-de-prueba", "Content-Type": "application/json" },
    body: JSON.stringify({ correo: reserva.correo, cedula: "1700000019", nombres: "Prueba", apellidos: "Fase Dos",
      telefono: "0999999999", ...campos }),
  });
}

for (const metodo of ["invite", "recovery", "otp"]) {
  test(`la Edge Function niega la sesión ${metodo} antes de llamar a PostgreSQL`, async () => {
    const { manejar, llamadas } = await cargar({ metodo });
    assert.equal((await manejar(solicitud())).status, 403);
    assert.equal(llamadas.length, 0);
  });
}

test("la Edge Function usa el actor autenticado y rechaza campos de privilegios", async () => {
  const { manejar, llamadas } = await cargar();
  assert.equal((await manejar(solicitud({ actor: "otro" }))).status, 400);
  assert.equal(llamadas.length, 0);
  assert.equal((await manejar(solicitud())).status, 200);
  assert.equal(llamadas[0].parametros.actor, usuarioId);
});

test("reenviar usa la identidad vinculada y el mismo marcador de reserva", async () => {
  const { gestionar, llamadas } = await cargar();
  const resultado = await gestionar("reenviar");
  assert.equal(resultado.estado, "invitacion_reenviada");
  assert.equal(resultado.usuarioId, usuarioId);
  assert.deepEqual(llamadas.map(({ tipo }) => tipo), ["gestionar_invitacion", "correo", "confirmar_invitacion"]);
  assert.equal(llamadas[1].opciones.data.actaquito_invitacion, reserva.id);
  assert.equal(llamadas[2].parametros.recuperacion_administrativa, true);
});

test("una invitación confirmada se concilia sin emitir otro enlace", async () => {
  const { gestionar, llamadas } = await cargar({ correoConfirmado: true });
  assert.equal((await gestionar("reenviar")).estado, "correo_confirmado");
  assert.deepEqual(llamadas.map(({ tipo }) => tipo), ["gestionar_invitacion", "confirmar_invitacion"]);
});

test("el reenvío informa el límite de Auth y nunca declara éxito si falló", async () => {
  const { gestionar, llamadas } = await cargar({ errorDeEnvio: { status: 429 } });
  await assert.rejects(() => gestionar("reenviar"), { status: 429 });
  assert.deepEqual(llamadas.map(({ tipo }) => tipo), ["gestionar_invitacion", "correo"]);
});

test("cancelar conserva una reserva vinculada y no llama al correo", async () => {
  const { gestionar, llamadas } = await cargar({ errorDeGestion: { code: "23505" } });
  await assert.rejects(() => gestionar("cancelar"), { status: 409 });
  assert.deepEqual(llamadas.map(({ tipo }) => tipo), ["gestionar_invitacion"]);
});
test("el endpoint rechaza un rol JWT incorrecto y un cuerpo demasiado grande", async () => {
  const otroRol = await cargar({ rol: "service_role" });
  assert.equal((await otroRol.manejar(solicitud())).status, 401);
  assert.equal(otroRol.llamadas.length, 0);
  const { manejar, llamadas } = await cargar();
  assert.equal((await manejar(solicitud({ nombres: "a".repeat(5000) }))).status, 413);
  assert.equal(llamadas.length, 0);
});

test("reserva, envía por Auth y confirma; el reintento conserva la identidad sin otro correo", async () => {
  const { manejar, llamadas } = await cargar({ existente: false });
  assert.equal((await manejar(solicitud())).status, 200);
  assert.equal((await manejar(solicitud())).status, 200);
  assert.deepEqual(llamadas.map(({ tipo }) => tipo), [
    "reservar_invitacion", "confirmar_invitacion", "correo", "confirmar_invitacion", "reservar_invitacion",
  ]);
  assert.equal(llamadas[2].opciones.data.actaquito_invitacion, reserva.id);
});

test("una redirección no aprobada detiene el alta antes de reservar o enviar", async () => {
  const { manejar, llamadas } = await cargar({ redireccion: "https://example.test/confirm" });
  assert.equal((await manejar(solicitud())).status, 503);
  assert.equal(llamadas.length, 0);
});
