import { decode } from "npm:jpeg-js@0.4.4";

const maxJpeg = 4 * 1024 * 1024;
const maxSolicitud = maxJpeg + 8192;
const ladoMaximo = 1800;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export class ErrorEnvio extends Error {
  constructor(readonly status: number, readonly codigo: string, message: string) {
    super(message);
  }
}

type Metadatos = {
  acta: string;
  revision: number;
  operacion: string;
  latitud: number;
  longitud: number;
  precision_metros: number;
  capturada_en: string;
  gps_capturado_en: string;
};

export type PuertosEnvio = {
  autenticar(token: string): Promise<boolean>;
  reservar(token: string, datos: Metadatos & { huella: string }): Promise<string>;
  cargar(ruta: string, jpeg: Uint8Array<ArrayBuffer>): Promise<void>;
  leer(ruta: string): Promise<ReadableStream<Uint8Array> | null>;
  confirmar(operacion: string, huella: string): Promise<string>;
};

function responder(status: number, datos: object) {
  return Response.json(datos, { status, headers: { "Cache-Control": "no-store" } });
}

function errorDatos() {
  return new ErrorEnvio(422, "datos_invalidos", "Revisa el acta, la revisión y los datos GPS de la captura.");
}

function leerMetadatos(valor: FormDataEntryValue | null): Metadatos {
  if (typeof valor !== "string" || valor.length > 2048) throw errorDatos();
  let datos: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(valor);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw errorDatos();
    datos = parsed as Record<string, unknown>;
  } catch {
    throw errorDatos();
  }
  const { acta, revision, operacion, latitud, longitud, precision_metros, capturada_en, gps_capturado_en } = datos;
  const fechaValida = (fecha: unknown): fecha is string =>
    typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(fecha)
    && Number.isFinite(Date.parse(fecha)) && new Date(fecha).toISOString() === fecha;
  if (Object.keys(datos).length !== 8
      || typeof acta !== "string" || !uuid.test(acta) || typeof operacion !== "string" || !uuid.test(operacion)
      || typeof revision !== "number" || !Number.isInteger(revision) || revision < 1 || revision > 2147483647
      || typeof latitud !== "number" || !Number.isFinite(latitud) || Math.abs(latitud) > 90
      || typeof longitud !== "number" || !Number.isFinite(longitud) || Math.abs(longitud) > 180
      || typeof precision_metros !== "number" || !Number.isFinite(precision_metros) || precision_metros <= 0
      || !fechaValida(capturada_en) || !fechaValida(gps_capturado_en)) throw errorDatos();
  return { acta, revision, operacion, latitud, longitud, precision_metros, capturada_en, gps_capturado_en };
}

export async function leerAcotado(stream: ReadableStream<Uint8Array> | null, limite: number) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const parte = await reader.read();
      if (parte.done) break;
      total += parte.value.byteLength;
      if (total > limite) {
        void reader.cancel().catch(() => {});
        throw new ErrorEnvio(413, "tamano_excedido", "La fotografía supera el tamaño permitido.");
      }
      partes.push(parte.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    bytes.set(parte, offset);
    offset += parte.byteLength;
  }
  return bytes;
}

function comprobarJpeg(bytes: Uint8Array) {
  try {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8
        || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) throw new Error();
    const foto = decode(bytes, {
      useTArray: true, formatAsRGBA: false, tolerantDecoding: false,
      maxResolutionInMP: ladoMaximo ** 2 / 1_000_000, maxMemoryUsageInMB: 64,
    });
    if (foto.width < 1 || foto.height < 1 || Math.max(foto.width, foto.height) > ladoMaximo) throw new Error();
  } catch {
    throw new ErrorEnvio(422, "jpeg_invalido", "La foto debe ser un JPEG válido de hasta 1800 píxeles por lado.");
  }
}

export async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function crearEnviador(puertos: PuertosEnvio) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return responder(405, { codigo: "metodo", error: "Usa POST." });
    const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return responder(401, { codigo: "sesion", error: "Se requiere una sesión válida." });

    try {
      if (!await puertos.autenticar(token)) throw new ErrorEnvio(401, "sesion", "Se requiere una sesión válida.");
      const tipo = request.headers.get("Content-Type");
      if (!tipo || !/^multipart\/form-data\s*;/i.test(tipo)) {
        throw new ErrorEnvio(415, "formato", "Se requiere una solicitud multipart con una foto JPEG.");
      }
      if (Number(request.headers.get("Content-Length")) > maxSolicitud) {
        throw new ErrorEnvio(413, "tamano_excedido", "La fotografía supera el tamaño permitido.");
      }
      const cuerpo = await leerAcotado(request.body, maxSolicitud);
      const formulario = await new Response(cuerpo, { headers: { "Content-Type": tipo } }).formData().catch(() => {
        throw new ErrorEnvio(400, "formulario_invalido", "No se pudo leer la fotografía y sus datos.");
      });
      if (formulario.getAll("datos").length !== 1 || formulario.getAll("foto").length !== 1
          || [...formulario.keys()].some((clave) => clave !== "datos" && clave !== "foto")) {
        throw new ErrorEnvio(400, "formulario_invalido", "Se requiere una fotografía y sus datos.");
      }
      const datos = leerMetadatos(formulario.get("datos"));
      const foto = formulario.get("foto");
      if (!(foto instanceof File) || foto.type !== "image/jpeg") {
        throw new ErrorEnvio(415, "formato", "Se requiere un archivo JPEG.");
      }
      if (foto.size > maxJpeg) throw new ErrorEnvio(413, "tamano_excedido", "La fotografía supera el tamaño permitido.");
      const jpeg = new Uint8Array(await foto.arrayBuffer());
      const huella = await sha256(jpeg);

      // La RPC comprueba ámbito, autoría, geocerca e identidad de la operación antes de tocar Storage.
      const ruta = await puertos.reservar(token, { ...datos, huella });
      if (ruta !== datos.acta + "/" + datos.operacion + ".jpg") {
        throw new ErrorEnvio(409, "reserva_invalida", "La reserva no corresponde a esta operación.");
      }
      comprobarJpeg(jpeg);
      await puertos.cargar(ruta, jpeg).catch(() => {
        // Una carga puede haber terminado antes de un fallo de red o existir por un reintento.
      });
      const almacenado = await puertos.leer(ruta);
      if (!almacenado) throw new ErrorEnvio(503, "carga_pendiente", "No se pudo comprobar la carga. Reintenta con la misma operación.");

      const recibido = await leerAcotado(almacenado, maxJpeg);
      const huellaAlmacenada = await sha256(recibido);
      if (huellaAlmacenada !== huella) {
        throw new ErrorEnvio(409, "huella_distinta", "El archivo reservado no coincide con la fotografía de esta operación.");
      }
      // El JPEG almacenado comparte SHA-256 con los bytes que ya fueron decodificados.
      const acta = await puertos.confirmar(datos.operacion, huellaAlmacenada);
      if (acta !== datos.acta) {
        throw new ErrorEnvio(503, "confirmacion_pendiente", "No se pudo comprobar la confirmación. Reintenta con la misma operación.");
      }
      return responder(200, { acta, operacion: datos.operacion, confirmada: true });
    } catch (error) {
      if (error instanceof ErrorEnvio) return responder(error.status, { codigo: error.codigo, error: error.message });
      return responder(503, { codigo: "envio_pendiente", error: "El envío sigue pendiente. Reintenta con la misma operación." });
    }
  };
}
