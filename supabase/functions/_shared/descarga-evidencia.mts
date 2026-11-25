import { leerAcotado, sha256 } from "./envio-evidencia.mts";

type Referencia = { ruta: string; sha256: string };
export type PuertosDescarga = {
  autenticar(token: string): Promise<boolean>;
  buscar(token: string, acta: string): Promise<Referencia | null>;
  leer(ruta: string): Promise<ReadableStream<Uint8Array> | null>;
};

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
function responder(status: number, datos: object) {
  return Response.json(datos, { status, headers: { "Cache-Control": "private, no-store" } });
}
function noDisponible() {
  return responder(404, { error: "La evidencia no está disponible para esta cuenta." });
}

export function crearDescargaEvidencia(puertos: PuertosDescarga) {
  return async (request: Request) => {
    if (request.method !== "POST") return responder(405, { error: "Usa POST." });
    const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return responder(401, { error: "Se requiere una sesión válida." });
    try {
      if (!await puertos.autenticar(token)) return responder(401, { error: "Se requiere una sesión válida." });
      if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
        return responder(415, { error: "Se requiere JSON." });
      }
      let datos: unknown;
      try {
        datos = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await leerAcotado(request.body, 512)));
      } catch {
        return responder(400, { error: "Indica un identificador de acta válido." });
      }
      if (!datos || typeof datos !== "object" || !("acta" in datos) || Object.keys(datos).length !== 1
          || typeof datos.acta !== "string" || !uuid.test(datos.acta)) {
        return responder(400, { error: "Indica un identificador de acta válido." });
      }

      const referencia = await puertos.buscar(token, datos.acta);
      if (!referencia) return noDisponible();
      const partes = referencia.ruta.split("/");
      if (partes.length !== 2 || partes[0] !== datos.acta
          || !partes[1].endsWith(".jpg") || !uuid.test(partes[1].slice(0, -4))
          || !/^[0-9a-f]{64}$/.test(referencia.sha256)) return noDisponible();
      const objeto = await puertos.leer(referencia.ruta);
      if (!objeto) return noDisponible();
      const jpeg = await leerAcotado(objeto, 4 * 1024 * 1024);
      if (jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216 || await sha256(jpeg) !== referencia.sha256) {
        return responder(502, { error: "No se pudo verificar la fotografía." });
      }

      // Recomprueba RLS después de leer Storage, antes de entregar bytes al usuario.
      const vigente = await puertos.buscar(token, datos.acta);
      if (vigente?.ruta !== referencia.ruta || vigente.sha256 !== referencia.sha256) return noDisponible();

      let binario = "";
      for (let i = 0; i < jpeg.length; i += 8192) {
        binario += String.fromCharCode(...jpeg.subarray(i, i + 8192));
      }
      return responder(200, { jpegBase64: btoa(binario) });
    } catch {
      return responder(503, { error: "No se pudo descargar la fotografía. Inténtalo de nuevo." });
    }
  };
}
