import { crearDescargaEvidencia } from "./descarga-evidencia.mts";
import { sha256 } from "./envio-evidencia.mts";

const acta = "10000000-0000-4000-8000-000000000001";
const ruta = acta + "/20000000-0000-4000-8000-000000000001.jpg";
const jpeg = new Uint8Array([255, 216, 255, 217]);
function solicitud(token?: string, datos: object = { acta }) {
  return new Request("https://example.test", {
    method: "POST", body: JSON.stringify(datos),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
  });
}

Deno.test("descarga privada valida sesión, límites de acceso e integridad", async () => {
  let lecturas = 0;
  let consultas = 0;
  let permitido = false;
  let revocado = false;
  let referencia = { ruta, sha256: await sha256(jpeg) };
  const ejecutar = crearDescargaEvidencia({
    autenticar: (token) => Promise.resolve(token === "valido"),
    buscar: () => Promise.resolve(permitido && !(revocado && ++consultas === 2) ? referencia : null),
    leer: () => { lecturas++; return Promise.resolve(new Blob([jpeg]).stream()); },
  });
  async function comprobar(request: Request, esperado: number) {
    const respuesta = await ejecutar(request);
    if (respuesta.status !== esperado) throw new Error("Estado inesperado: " + respuesta.status);
    return respuesta;
  }
  await comprobar(solicitud(), 401);
  await comprobar(solicitud("incorrecto"), 401);
  await comprobar(solicitud("valido", { acta, ruta }), 400);
  await comprobar(solicitud("valido"), 404);
  permitido = true;
  referencia = { ...referencia, ruta: "../otra.jpg" };
  await comprobar(solicitud("valido"), 404);
  if (lecturas !== 0) throw new Error("Se accedió a Storage sin autorización");
  referencia = { ruta, sha256: "0".repeat(64) };
  await comprobar(solicitud("valido"), 502);
  referencia = { ruta, sha256: await sha256(jpeg) };
  revocado = true;
  await comprobar(solicitud("valido"), 404);
  revocado = false;
  const respuesta = await comprobar(solicitud("valido"), 200);
  const cuerpo = await respuesta.text();
  if (!respuesta.headers.get("Cache-Control")?.includes("no-store") ||
      cuerpo !== JSON.stringify({ jpegBase64: "/9j/2Q==" })) throw new Error("La descarga expone datos innecesarios");
});
