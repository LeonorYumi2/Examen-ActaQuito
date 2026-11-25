import { z } from 'zod';

export type Mesa = { recinto: string; nombre: string; numero: number };
export type Dignidad = 'ALCALDIA' | 'PREFECTURA';
export type Candidatura = { sigla: string; organizacion: string; candidato: string };
export type Cifras = { votos: Record<string, number>; blancos: number; nulos: number; sufragantes: number };
export type Borrador = { id: string; version: number; cifras: Cifras };

export interface RepositorioActas {
  listarMesas(): Promise<Mesa[]>;
  cargar(mesa: Mesa, dignidad: Dignidad): Promise<{ candidaturas: Candidatura[]; borrador: Borrador | null }>;
  guardar(datos: { id: string; operacion: string; mesa: Mesa; dignidad: Dignidad; cifras: Cifras }): Promise<number>;
}

const entero = z.string().refine(
  (valor) => /^\d+$/.test(valor) && Number(valor) <= 2147483647,
  'Escribe un entero no negativo de hasta 2147483647.',
);
export type CamposActa = { votos: Record<string, string>; blancos: string; nulos: string; sufragantes: string };

export function esquemaActa(siglas: string[]) {
  return z.object({
    votos: z.record(z.string(), entero),
    blancos: entero,
    nulos: entero,
    sufragantes: entero,
  }).superRefine((campos, ctx) => {
    if (siglas.length !== 5 || new Set(siglas).size !== 5 || Object.keys(campos.votos).length !== 5
        || siglas.some((sigla) => !Object.hasOwn(campos.votos, sigla))) {
      ctx.addIssue({ code: 'custom', path: ['votos'], message: 'Completa las cinco candidaturas de esta dignidad.' });
      return;
    }
    const cifras = leerCifras(campos);
    const total = cifras.sufragantes;
    const valores = [...Object.values(cifras.votos), cifras.blancos, cifras.nulos];
    if (valores.some((valor) => valor > total) || valores.reduce((suma, valor) => suma + valor, 0) !== total) {
      ctx.addIssue({ code: 'custom', path: ['sufragantes'], message: 'La suma de los votos, blancos y nulos debe coincidir con el total.' });
    }
  });
}

export function leerCifras(campos: CamposActa): Cifras {
  return {
    votos: Object.fromEntries(Object.entries(campos.votos).map(([sigla, cifra]) => [sigla, Number(cifra)])),
    blancos: Number(campos.blancos), nulos: Number(campos.nulos), sufragantes: Number(campos.sufragantes),
  };
}

export class ErrorRegistro extends Error {}

export async function guardarRegistro(
  repositorio: RepositorioActas,
  datos: Omit<Parameters<RepositorioActas['guardar']>[0], 'cifras'>,
  campos: CamposActa,
  siglas: string[],
) {
  const validado = esquemaActa(siglas).safeParse(campos);
  if (!validado.success) throw new ErrorRegistro('Revisa las cifras antes de guardar.');
  return repositorio.guardar({ ...datos, cifras: leerCifras(validado.data) });
}
