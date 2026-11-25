import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { ErrorEnvioEvidencia, type EnvioEvidencia, type RepositorioEnvioEvidencia } from '../domain/envio-evidencia';

const respuesta = z.object({ acta: z.string(), operacion: z.string(), confirmada: z.literal(true) });
const rechazo = z.object({ codigo: z.string(), error: z.string() });

function solicitudMultipart(entrada: EnvioEvidencia) {
  const { acta, revision, operacion, foto, ubicacion } = entrada;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(operacion)) {
    throw new ErrorEnvioEvidencia(422, 'operacion_invalida', 'La operación de envío no tiene un UUID válido.');
  }
  const datos = {
    acta, revision, operacion, latitud: ubicacion.latitud, longitud: ubicacion.longitud,
    precision_metros: ubicacion.precisionMetros, capturada_en: new Date(foto.capturadaEn).toISOString(),
    gps_capturado_en: new Date(ubicacion.capturadaEn).toISOString(),
  };
  const limite = 'actaquito-' + operacion;
  const encoder = new TextEncoder();
  const inicio = encoder.encode('--' + limite + '\r\nContent-Disposition: form-data; name="datos"\r\n\r\n'
    + JSON.stringify(datos) + '\r\n--' + limite + '\r\nContent-Disposition: form-data; name="foto"; filename="acta.jpg"'
    + '\r\nContent-Type: image/jpeg\r\n\r\n');
  const fin = encoder.encode('\r\n--' + limite + '--\r\n');
  const jpeg = atob(foto.jpegBase64);
  const bytes = new Uint8Array(inicio.length + jpeg.length + fin.length);
  bytes.set(inicio);
  for (let i = 0; i < jpeg.length; i++) bytes[inicio.length + i] = jpeg.charCodeAt(i);
  bytes.set(fin, inicio.length + jpeg.length);
  return { body: bytes.buffer, headers: { 'Content-Type': 'multipart/form-data; boundary=' + limite } };
}

export const repositorioEnvioEvidencia: RepositorioEnvioEvidencia = {
  async enviar(entrada) {
    const { data, error } = await mobileSupabase().functions.invoke<unknown>('enviar-evidencia-acta', solicitudMultipart(entrada));
    if (error instanceof FunctionsHttpError) {
      const response: Response = error.context;
      const detalle = rechazo.safeParse(await response.json().catch(() => null));
      if (detalle.success) throw new ErrorEnvioEvidencia(response.status, detalle.data.codigo, detalle.data.error);
    }
    const confirmacion = respuesta.safeParse(data);
    if (error || !confirmacion.success
      || confirmacion.data.acta !== entrada.acta || confirmacion.data.operacion !== entrada.operacion) {
      throw new ErrorEnvioEvidencia(undefined, 'envio_pendiente', 'No se pudo confirmar el envío. Reintenta con la misma operación.');
    }
    return confirmacion.data;
  },
};
