import { z } from 'zod';

const dignidad = z.enum(['ALCALDIA', 'PREFECTURA']);
const conteo = z.number().int().nonnegative();
const latitud = z.number().min(-90).max(90);
const longitud = z.number().min(-180).max(180);

const candidatura = z.object({
  sigla: z.string(), organizacion: z.string(), color: z.string(), candidato: z.string(),
  posicion: conteo, votos: conteo, porcentaje_votos_validos: z.number().min(0).max(100).nullable(),
});

export const esquemaMonitoreoElectoral = z.object({
  resultados: z.array(z.object({
    recinto_codigo: z.string().nullable(), dignidad_codigo: dignidad, actas_confirmadas: conteo,
    blancos: conteo, nulos: conteo, sufragantes: conteo, votos_validos: conteo,
    candidaturas: z.array(candidatura),
  })),
  recintos: z.array(z.object({
    codigo: z.string(), nombre: z.string(), parroquia_codigo: z.string(), parroquia: z.string(),
    latitud, longitud, total_mesas: conteo, mesas_reportadas: conteo, mesas_pendientes: conteo,
    mesas: z.array(z.object({ numero: conteo, reportada: z.boolean() })),
  })),
  actas: z.array(z.object({
    acta_id: z.uuid(), recinto_codigo: z.string(), mesa_numero: conteo, dignidad_codigo: dignidad,
    version: conteo, latitud, longitud, precision_metros: z.number().positive(),
    distancia_metros: z.number().nonnegative(), margen_metros: z.number().positive(), fuera_margen: z.boolean(),
    capturada_en: z.string(), recibida_en: z.string(), revision_recibida_en: z.string(),
  })),
});

export type MonitoreoElectoral = z.infer<typeof esquemaMonitoreoElectoral>;

export interface RepositorioMonitoreoElectoral {
  consultar(usuario: string, signal?: AbortSignal): Promise<MonitoreoElectoral>;
}

export function consultarMonitoreoElectoral(repositorio: RepositorioMonitoreoElectoral, usuario: string, signal?: AbortSignal) {
  return repositorio.consultar(usuario, signal);
}
