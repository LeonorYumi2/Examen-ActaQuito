import { claveEnvio, type ReferenciaBorrador } from './enviar-borrador';
import { ErrorEnvioEvidencia } from './envio-evidencia';
import { ErrorRegistro } from './registro';

export type EstadoSincronizacion = 'pendiente' | 'sincronizando' | 'sincronizado' | 'rechazado' | 'requiere-intervencion';

export type ControlEnvio = {
  estado: EstadoSincronizacion;
  intentos: number;
  siguiente?: number;
  codigo?: string;
};

const intervalos = [5_000, 15_000, 45_000, 120_000, 300_000];

export function controlEnvio(envio: Trabajo): ControlEnvio {
  if (envio.confirmacion) return { estado: 'sincronizado', intentos: envio.control?.intentos ?? 0 };
  return envio.control ?? { estado: 'pendiente', intentos: 0 };
}

export function falloEnvio(error: unknown, intentos: number, ahora: number): ControlEnvio {
  const errorConocido = error instanceof ErrorEnvioEvidencia || error instanceof ErrorRegistro ? error : undefined;
  const codigo = errorConocido?.codigo ?? 'fallo_temporal';
  const status = errorConocido?.status;
  if (status === 403 || codigo === '42501') return { estado: 'rechazado', intentos, codigo };
  if (status === 401 || codigo === 'sesion') {
    return { estado: 'requiere-intervencion', intentos, codigo: 'sesion' };
  }
  if ((status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 425 && status !== 429)
      || codigo === '23505' || codigo === '22023') {
    return { estado: 'requiere-intervencion', intentos, codigo };
  }
  const intervalo = intervalos[intentos - 1];
  if (intervalo === undefined) return { estado: 'requiere-intervencion', intentos, codigo: 'intentos_agotados' };
  const espera = error instanceof ErrorEnvioEvidencia ? error.reintentarEnMs ?? 0 : 0;
  return { estado: 'pendiente', intentos, codigo: status === 429 ? 'limite_solicitudes' : codigo,
    siguiente: ahora + Math.max(intervalo, espera) };
}

type Trabajo = { confirmacion?: unknown; control?: ControlEnvio };
export type ColaLocal<T> = {
  cargar(referencia: ReferenciaBorrador): Promise<T | null>;
  guardar(referencia: ReferenciaBorrador, trabajo: T): Promise<void>;
};

export function crearProcesadorOutbox<R, T extends Trabajo & { confirmacion?: R }>(
  envios: ColaLocal<T>,
  enviar: (referencia: ReferenciaBorrador) => Promise<R>,
  puedeProcesar: (usuario: string) => boolean,
  ahora: () => number = Date.now,
) {
  const enCurso = new Map<string, Promise<R | undefined>>();

  async function ejecutar(referencia: ReferenciaBorrador) {
    const actual = await envios.cargar(referencia);
    if (!actual || !puedeProcesar(referencia.usuario)) return;
    const control = controlEnvio(actual);
    if (actual.confirmacion) return actual.confirmacion;
    if (control.estado === 'rechazado' || control.estado === 'requiere-intervencion' || (control.siguiente ?? 0) > ahora()) return;
    const intentos = control.intentos + 1;
    await envios.guardar(referencia, { ...actual, control: { estado: 'sincronizando', intentos } });
    try {
      return await enviar(referencia);
    } catch (error) {
      const guardado = await envios.cargar(referencia);
      if (guardado && !guardado.confirmacion) {
        const control = falloEnvio(error, intentos, ahora());
        await envios.guardar(referencia, {
          ...guardado,
          control: !puedeProcesar(referencia.usuario) && control.codigo === 'sesion'
            ? { estado: 'pendiente', intentos: intentos - 1 }
            : control,
        });
      }
      throw error;
    }
  }

  function procesar(referencia: ReferenciaBorrador) {
    const clave = claveEnvio(referencia);
    const previo = enCurso.get(clave);
    if (previo) return previo;
    const tarea = ejecutar(referencia).finally(() => { enCurso.delete(clave); });
    enCurso.set(clave, tarea);
    return tarea;
  }
  return Object.assign(procesar, { enCurso: (referencia: ReferenciaBorrador) => enCurso.has(claveEnvio(referencia)) });
}
