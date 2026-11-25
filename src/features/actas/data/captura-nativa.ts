import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { decode } from 'jpeg-js';
import { capturarUbicacion, fotoSuficientementeNitida, type FotoActa, type LecturaGps, type RecintoCaptura } from '../domain/evidencia';
import { ErrorRegistro } from '../domain/registro';

export async function prepararFoto(
  toma: { uri: string; width: number; height: number }, capturadaEn: number,
): Promise<FotoActa> {
  const temporales = [toma.uri];
  const redimensionar = (maximo: number) => ImageManipulator.manipulate(toma.uri).resize(
    toma.width >= toma.height ? { width: Math.min(toma.width, maximo) } : { height: Math.min(toma.height, maximo) },
  );
  try {
    const reducida = await (await redimensionar(320).renderAsync()).saveAsync({ format: SaveFormat.JPEG });
    temporales.push(reducida.uri);
    const pixeles = decode(await new File(reducida.uri).bytes(), {
      useTArray: true, maxResolutionInMP: 1, maxMemoryUsageInMB: 16,
    });
    if (!fotoSuficientementeNitida(pixeles.data, pixeles.width, pixeles.height)) {
      throw new ErrorRegistro('La foto no se ve nítida. Repite la toma con buena luz y mantén el teléfono firme.');
    }
    const comprimida = await (await redimensionar(1800).renderAsync()).saveAsync({
      format: SaveFormat.JPEG, compress: 0.82, base64: true,
    });
    temporales.push(comprimida.uri);
    if (!comprimida.base64) throw new ErrorRegistro('No pudimos preparar la foto. Vuelve a tomarla.');
    return { jpegBase64: comprimida.base64, capturadaEn };
  } finally {
    for (const uri of new Set(temporales)) {
      try { new File(uri).delete(); } catch { /* Puede haberse limpiado el caché. */ }
    }
  }
}

async function leerGps(): Promise<LecturaGps | null> {
  if (!await Location.hasServicesEnabledAsync()) return null;
  return new Promise((resolve, reject) => {
    const iniciadaEn = Date.now();
    let activa = true;
    let suscripcion: Location.LocationSubscription | undefined;
    function terminar() {
      activa = false;
      clearTimeout(espera);
      suscripcion?.remove();
    }
    const espera = setTimeout(() => { terminar(); resolve(null); }, 15000);
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, ({ coords, timestamp, mocked }) => {
      if (!activa || mocked || timestamp < iniciadaEn || coords.accuracy == null || coords.accuracy <= 0) return;
      terminar();
      resolve({
        latitud: coords.latitude, longitud: coords.longitude,
        precisionMetros: coords.accuracy, capturadaEn: timestamp,
      });
    }, () => {
      if (!activa) return;
      terminar();
      resolve(null);
    }).then((actual) => {
      if (activa) suscripcion = actual;
      else actual.remove();
    }).catch((error: unknown) => {
      if (!activa) return;
      terminar();
      reject(error);
    });
  });
}

export function obtenerUbicacion(recinto: RecintoCaptura) {
  return capturarUbicacion({
    permitir: async () => (await Location.requestForegroundPermissionsAsync()).granted,
    leer: leerGps,
  }, recinto);
}

export async function capturarGpsCorreccion() {
  const { ubicacionCorreccion } = await import('../domain/historial-acta');
  if (!(await Location.requestForegroundPermissionsAsync()).granted) {
    throw new ErrorRegistro('Concede permiso de ubicación para guardar la corrección.');
  }
  const resultado = ubicacionCorreccion.safeParse(await leerGps());
  if (!resultado.success) throw new ErrorRegistro('No se obtuvo una ubicación GPS válida. Reintenta la captura.');
  return resultado.data;
}
