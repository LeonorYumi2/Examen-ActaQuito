import { ErrorRegistro, esquemaActa, type CamposActa, type Dignidad, type Mesa } from './registro';

export type Coordenadas = { latitud: number; longitud: number };
export type RecintoCaptura = Coordenadas & { margenMetros: number };
export type LecturaGps = Coordenadas & { precisionMetros: number | null; capturadaEn: number };
export type UbicacionActa = Coordenadas & {
  precisionMetros: number; capturadaEn: number; distanciaMetros: number;
  resultado: 'dentro' | 'fuera' | 'imprecisa';
};
export type FotoActa = { jpegBase64: string; capturadaEn: number };
export type EvidenciaActa = { foto?: FotoActa; ubicacion?: UbicacionActa };
export type BorradorLocal = EvidenciaActa & { id: string; campos: CamposActa };

export interface BorradoresLocales {
  cargar(usuario: string, mesa: Mesa, dignidad: Dignidad): Promise<BorradorLocal | null>;
  guardar(usuario: string, mesa: Mesa, dignidad: Dignidad, borrador: BorradorLocal): Promise<void>;
}

export async function guardarBorradorLocal(
  repositorio: BorradoresLocales, usuario: string, mesa: Mesa, dignidad: Dignidad,
  borrador: BorradorLocal, siglas: string[],
) {
  const validado = esquemaActa(siglas).safeParse(borrador.campos);
  if (!validado.success) throw new ErrorRegistro('Revisa las cifras antes de guardar.');
  await repositorio.guardar(usuario, mesa, dignidad, { ...borrador, campos: validado.data });
}

export function claveBorrador(usuario: string, mesa: Mesa, dignidad: Dignidad) {
  return JSON.stringify([usuario, mesa.recinto, mesa.numero, dignidad]);
}

export function distanciaHaversine(a: Coordenadas, b: Coordenadas) {
  const rad = Math.PI / 180;
  const senoLat = Math.sin((b.latitud - a.latitud) * rad / 2);
  const senoLon = Math.sin((b.longitud - a.longitud) * rad / 2);
  const h = senoLat ** 2 + Math.cos(a.latitud * rad) * Math.cos(b.latitud * rad) * senoLon ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

function coordenadasValidas(punto: Coordenadas) {
  return Number.isFinite(punto.latitud) && Math.abs(punto.latitud) <= 90
    && Number.isFinite(punto.longitud) && Math.abs(punto.longitud) <= 180;
}

export function evaluarUbicacion(lectura: LecturaGps, recinto: RecintoCaptura): UbicacionActa | null {
  const { precisionMetros, capturadaEn } = lectura;
  if (!coordenadasValidas(lectura) || !coordenadasValidas(recinto)
    || precisionMetros === null || !Number.isFinite(precisionMetros) || precisionMetros <= 0
    || !Number.isFinite(capturadaEn) || capturadaEn <= 0
    || !Number.isFinite(recinto.margenMetros) || recinto.margenMetros <= 0) return null;
  const distanciaMetros = distanciaHaversine(lectura, recinto);
  const resultado = distanciaMetros > recinto.margenMetros ? 'fuera'
    : distanciaMetros + precisionMetros > recinto.margenMetros ? 'imprecisa' : 'dentro';
  return { ...lectura, precisionMetros, distanciaMetros, resultado };
}

export async function capturarUbicacion(
  fuente: { permitir(): Promise<boolean>; leer(): Promise<LecturaGps | null> },
  recinto: RecintoCaptura,
) {
  if (!await fuente.permitir()) return { estado: 'permiso-denegado' } as const;
  const lectura = await fuente.leer();
  const ubicacion = lectura && evaluarUbicacion(lectura, recinto);
  return ubicacion ? { estado: 'obtenida', ubicacion } as const : { estado: 'no-disponible' } as const;
}

export function varianzaLaplaciano(rgba: Uint8Array, ancho: number, alto: number) {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto)
    || ancho < 3 || alto < 3 || rgba.length !== ancho * alto * 4) return 0;
  const grises = new Float32Array(ancho * alto);
  for (let i = 0; i < grises.length; i++) {
    const p = i * 4;
    grises[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  let suma = 0;
  let cuadrados = 0;
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      const lap = 4 * grises[i] - grises[i - 1] - grises[i + 1] - grises[i - ancho] - grises[i + ancho];
      suma += lap;
      cuadrados += lap * lap;
    }
  }
  const cantidad = (ancho - 2) * (alto - 2);
  return Math.max(0, cuadrados / cantidad - (suma / cantidad) ** 2);
}

// Umbral inicial sobre JPEG reducido. Calibrar con actas físicas en dispositivos de prueba.
export function fotoSuficientementeNitida(rgba: Uint8Array, ancho: number, alto: number) {
  return varianzaLaplaciano(rgba, ancho, alto) >= 120;
}
