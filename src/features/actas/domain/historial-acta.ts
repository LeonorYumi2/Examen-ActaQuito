import { z } from 'zod';

const cifras = z.object({
  votos: z.record(z.string(), z.number().int().nonnegative()),
  blancos: z.number().int().nonnegative(),
  nulos: z.number().int().nonnegative(),
  sufragantes: z.number().int().nonnegative(),
});

export const ubicacionCorreccion = z.object({
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  precisionMetros: z.number().positive(),
  capturadaEn: z.number().int().positive().max(8_640_000_000_000_000),
});
export type UbicacionCorreccion = z.infer<typeof ubicacionCorreccion>;

export const historialActa = z.array(z.object({
  version: z.number().int().positive(), recibida_en: z.string(),
  nombres: z.string(), apellidos: z.string(), cedula_enmascarada: z.string().regex(/^\*{6}\d{4}$/),
  anterior: cifras.nullable(), nuevo: cifras,
  ubicacion: z.object({
    latitud: z.number(), longitud: z.number(), precision_metros: z.number(), capturada_en: z.string(),
  }).nullable(),
}));
export type HistorialActa = z.infer<typeof historialActa>;

export interface RepositorioDetalleActa {
  cargarHistorial(acta: string): Promise<HistorialActa>;
  descargarFotografia(acta: string): Promise<{ uri: string }>;
}
