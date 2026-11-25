import assert from "node:assert/strict";
import { encode } from "npm:jpeg-js@0.4.4";
import { crearEnviador, ErrorEnvio, type PuertosEnvio, sha256 } from "../functions/_shared/envio-evidencia.mts";

const acta = "10000000-0000-4000-8000-000000000001";
const operacion = "20000000-0000-4000-8000-000000000001";
const ruta = acta + "/" + operacion + ".jpg";
const datos = {
  acta, revision: 1, operacion, latitud: -0.1726, longitud: -78.4829, precision_metros: 7,
  capturada_en: "2026-11-25T13:00:00.000Z", gps_capturado_en: "2026-11-25T13:00:01.000Z",
};

function foto(valor = 100, ancho = 16) {
  const data = new Uint8Array(ancho * 16 * 4).fill(valor);
  return new Uint8Array(encode({ width: ancho, height: 16, data }, 82).data);
}
function solicitud(meta = datos, bytes = foto(), token = "jwt-valido") {
  const form = new FormData();
  form.set("datos", JSON.stringify(meta));
  form.set("foto", new File([bytes], "acta.jpg", { type: "image/jpeg" }));
  return new Request("http://localhost/enviar-evidencia-acta",
    { method: "POST", body: form, headers: { Authorization: "Bearer " + token } });
}

function escena(modificar: Partial<PuertosEnvio> = {}) {
  const eventos: string[] = [];
  const objetos = new Map<string, Uint8Array<ArrayBuffer>>();
  const recibidas = new Set<string>();
  let reserva = "";
  const puertos: PuertosEnvio = {
    async autenticar(token) { return token === "jwt-valido"; },
    async reservar(token, meta) {
      assert.equal(token, "jwt-valido");
      assert.equal(meta.acta, acta);
      assert.equal(meta.revision, 1);
      const huella = JSON.stringify(meta);
      if (reserva && huella !== reserva) throw new ErrorEnvio(409, "conflicto", "Conflicto.");
      reserva = huella;
      eventos.push("reservar");
      return ruta;
    },
    async cargar(destino, datos) {
      eventos.push("cargar");
      if (objetos.has(destino)) throw new Error("Ya existe");
      objetos.set(destino, datos);
    },
    leer(destino) {
      eventos.push("leer");
      const bytes = objetos.get(destino);
      return Promise.resolve(bytes ? new Response(bytes).body : null);
    },
    async confirmar(id, huella) {
      eventos.push("confirmar");
      assert.equal(huella, await sha256(objetos.get(ruta)!));
      recibidas.add(id);
      return acta;
    },
    ...modificar,
  };
  return { enviar: crearEnviador(puertos), puertos, objetos, recibidas, eventos };
}

Deno.test("decodifica un JPEG real, verifica SHA-256 y confirma solo después de leer Storage", async () => {
  const { enviar, recibidas, eventos } = escena();
  const respuesta = await enviar(solicitud());
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { acta, operacion, confirmada: true });
  assert.deepEqual(eventos, ["reservar", "cargar", "leer", "confirmar"]);
  assert.deepEqual([...recibidas], [operacion]);
});

Deno.test("un JWT inválido o un usuario fuera de su ámbito no puede cargar", async () => {
  const { enviar, eventos } = escena({
    async reservar() { throw new ErrorEnvio(403, "sin_asignacion", "Sin asignación."); },
  });
  assert.equal((await enviar(solicitud(datos, foto(), "otro"))).status, 401);
  assert.equal((await enviar(solicitud())).status, 403);
  assert.deepEqual(eventos, []);
});

Deno.test("valida GPS y JPEG, incluso cabeceras o dimensiones inválidas", async () => {
  const { enviar, objetos } = escena();
  assert.equal((await enviar(solicitud({ ...datos, latitud: 91 }))).status, 422);
  assert.equal((await enviar(solicitud({ ...datos, precision_metros: 0 }))).status, 422);
  const invalida = await enviar(solicitud(datos, Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)));
  assert.equal(invalida.status, 422);
  assert.equal((await invalida.json()).codigo, "jpeg_invalido");
  assert.equal(objetos.size, 0);
  const grande = await escena().enviar(solicitud(datos, foto(100, 1801)));
  assert.equal(grande.status, 422);
  const pesada = await escena().enviar(solicitud(datos, new Uint8Array(4 * 1024 * 1024 + 1)));
  assert.equal(pesada.status, 413);
});

Deno.test("a una ubicación fuera del margen se le aplica la decisión de la RPC", async () => {
  const { enviar } = escena({
    async reservar(_token, meta) {
      assert.equal(meta.latitud, -0.16);
      assert.equal(Object.hasOwn(meta, "fuera_margen"), false);
      return ruta;
    },
  });
  assert.equal((await enviar(solicitud({ ...datos, latitud: -0.16 }))).status, 200);
});

Deno.test("rechaza reserva inexistente y ruta ajena antes de tocar Storage", async () => {
  for (const reservar of [
    async () => { throw new ErrorEnvio(422, "reserva_invalida", "Revisión inexistente."); },
    async () => "otra/otra.jpg",
  ]) {
    const { enviar, eventos } = escena({ reservar });
    assert.ok([409, 422].includes((await enviar(solicitud())).status));
    assert.deepEqual(eventos, []);
  }
});

Deno.test("una foto distinta en la ruta reservada jamás se confirma ni se sobrescribe", async () => {
  const { enviar, objetos, recibidas } = escena();
  const ajena = foto(200);
  objetos.set(ruta, ajena);
  const respuesta = await enviar(solicitud());
  assert.equal(respuesta.status, 409);
  assert.equal((await respuesta.json()).codigo, "huella_distinta");
  assert.equal(recibidas.size, 0);
  assert.equal(objetos.get(ruta), ajena);
});

Deno.test("dos reintentos variables no sobrescriben y los reintentos iguales son idempotentes", async () => {
  const { enviar, objetos, recibidas } = escena();
  const respuestas = await Promise.all([enviar(solicitud()), enviar(solicitud())]);
  assert.deepEqual(respuestas.map((r) => r.status), [200, 200]);
  assert.equal(objetos.size, 1);
  assert.deepEqual([...recibidas], [operacion]);
  assert.equal((await enviar(solicitud(datos, foto(200)))).status, 409);
});

Deno.test("fallo de carga o confirmación y reintento con los mismos UUID", async () => {
  let permitirCarga = false;
  let permitirConfirmacion = false;
  const { enviar, objetos, puertos } = escena();
  const cargar = puertos.cargar;
  const confirmar = puertos.confirmar;
  puertos.cargar = async (...args) => {
    if (!permitirCarga) throw new Error("Timeout");
    return await cargar(...args);
  };
  puertos.confirmar = async (...args) => {
    if (!permitirConfirmacion) throw new Error("Base no disponible");
    return await confirmar(...args);
  };
  assert.equal((await enviar(solicitud())).status, 503);
  assert.equal(objetos.size, 0);
  permitirCarga = true;
  assert.equal((await enviar(solicitud())).status, 503);
  assert.equal(objetos.size, 1);
  permitirConfirmacion = true;
  assert.equal((await enviar(solicitud())).status, 200);
  assert.equal(objetos.size, 1);
});

Deno.test("una revocación durante la carga impide confirmar y conserva el objeto para reconciliar", async () => {
  const { enviar, objetos, recibidas } = escena({
    async confirmar() { throw new ErrorEnvio(403, "sin_asignacion", "Asignación revocada."); },
  });
  assert.equal((await enviar(solicitud())).status, 403);
  assert.equal(objetos.size, 1);
  assert.equal(recibidas.size, 0);
});
