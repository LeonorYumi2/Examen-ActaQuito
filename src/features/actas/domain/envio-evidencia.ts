import type { FotoActa, UbicacionActa } from './evidencia';

export type EnvioEvidencia = {
  acta: string;
  revision: number;
  operacion: string;
  foto: FotoActa;
  ubicacion: UbicacionActa;
};

export interface RepositorioEnvioEvidencia {
  enviar(entrada: EnvioEvidencia): Promise<{ acta: string; operacion: string; confirmada: true }>;
}

export class ErrorEnvioEvidencia extends Error {
  constructor(readonly status: number | undefined, readonly codigo: string, mensaje: string) {
    super(mensaje);
  }
}
