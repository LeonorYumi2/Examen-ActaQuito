import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { historialActa, type RepositorioDetalleActa, type UbicacionCorreccion } from '../domain/historial-acta';
import { ErrorRegistro, type Cifras } from '../domain/registro';

function errorDetalle(status?: number) {
  if (status === 401) return new ErrorRegistro('Inicia sesión para consultar el acta.');
  if (status === 403 || status === 404) return new ErrorRegistro('El recurso no está disponible para esta cuenta.');
  return new ErrorRegistro('No se pudo consultar el acta. Inténtalo de nuevo.');
}

export const repositorioDetalleActa: RepositorioDetalleActa = {
  async cargarHistorial(acta) {
    const { data, error, status } = await mobileSupabase().rpc('leer_historial_acta', { acta: z.uuid().parse(acta) });
    if (error) throw errorDetalle(status);
    const resultado = historialActa.safeParse(data);
    if (!resultado.success) throw errorDetalle();
    return resultado.data;
  },
  async descargarFotografia(acta) {
    const { data, error } = await mobileSupabase().functions.invoke('descargar-evidencia-acta', {
      body: { acta: z.uuid().parse(acta) }, timeout: 45_000,
    });
    if (error) throw errorDetalle(error instanceof FunctionsHttpError ? error.context.status : undefined);
    const resultado = z.object({ jpegBase64: z.string().min(1).max(5_592_408).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).safeParse(data);
    if (!resultado.success) throw errorDetalle();
    return { uri: 'data:image/jpeg;base64,' + resultado.data.jpegBase64 };
  },
};

export async function guardarCorreccionActa(entrada: {
  acta: string; operacion: string; cifras: Cifras; ubicacion: UbicacionCorreccion;
}, token: string) {
  const { acta, operacion, cifras, ubicacion } = entrada;
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), 45_000);
  try {
    const { data, error, status } = await mobileSupabase().rpc('corregir_acta', {
      acta, operacion, votos_por_sigla: cifras.votos, blancos: cifras.blancos, nulos: cifras.nulos,
      sufragantes: cifras.sufragantes, gps_latitud: ubicacion.latitud, gps_longitud: ubicacion.longitud,
      gps_precision: ubicacion.precisionMetros, gps_capturada_en: new Date(ubicacion.capturadaEn).toISOString(),
    }).setHeader('Authorization', 'Bearer ' + token).abortSignal(controlador.signal);
    if (error || typeof data !== 'number') {
      throw new ErrorRegistro('No se pudo confirmar la corrección.', error?.code, status);
    }
    return data;
  } finally {
    clearTimeout(reloj);
  }
}
