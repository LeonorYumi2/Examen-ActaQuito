import type { ControlEnvio } from './sincronizacion';
import type { BorradorLocal, BorradoresLocales, FotoActa, UbicacionActa } from './evidencia';
import { ErrorEnvioEvidencia, type RepositorioEnvioEvidencia } from './envio-evidencia';
import { esquemaActa, leerCifras, type Cifras, type Dignidad, type Mesa, type RepositorioActas } from './registro';

export type ReferenciaBorrador = { usuario: string; mesa: Mesa; dignidad: Dignidad };
type Confirmacion = Awaited<ReturnType<RepositorioEnvioEvidencia['enviar']>>;

export type EnvioGuardado = {
  acta: string;
  operacionCifras: string;
  operacionEvidencia: string;
  cifras: Cifras;
  foto: FotoActa;
  ubicacion: UbicacionActa;
  revision?: number;
  control?: ControlEnvio;
  confirmacion?: Confirmacion;
};

export interface EnviosLocales {
  cargar(referencia: ReferenciaBorrador): Promise<EnvioGuardado | null>;
  guardar(referencia: ReferenciaBorrador, envio: EnvioGuardado): Promise<void>;
}

type Puertos = {
  borradores: BorradoresLocales;
  envios: EnviosLocales;
  actas: Pick<RepositorioActas, 'guardar'>;
  evidencia: RepositorioEnvioEvidencia;
  uuid(): string;
  validarSesion(usuario: string): Promise<string | void>;
};

export function claveEnvio({ usuario, mesa, dignidad }: ReferenciaBorrador) {
  return JSON.stringify(['envio', usuario, mesa.recinto, mesa.numero, dignidad]);
}

function preparar(borrador: BorradorLocal | null, siglas: string[], uuid: () => string): EnvioGuardado {
  if (!borrador?.foto?.jpegBase64 || !borrador.ubicacion || (borrador.ubicacion.resultado !== 'dentro' && borrador.ubicacion.resultado !== 'fuera')
      || !Number.isFinite(borrador.ubicacion.precisionMetros) || borrador.ubicacion.precisionMetros <= 0
      || !Number.isFinite(borrador.ubicacion.latitud) || Math.abs(borrador.ubicacion.latitud) > 90
      || !Number.isFinite(borrador.ubicacion.longitud) || Math.abs(borrador.ubicacion.longitud) > 180
      || !Number.isFinite(borrador.foto.capturadaEn) || borrador.foto.capturadaEn <= 0
      || !Number.isFinite(borrador.ubicacion.capturadaEn) || borrador.ubicacion.capturadaEn <= 0) {
    throw new ErrorEnvioEvidencia(422, 'evidencia_incompleta', 'Guarda una fotografía y una ubicación GPS utilizable antes de enviar.');
  }
  const cifras = esquemaActa(siglas).safeParse(borrador.campos);
  if (!cifras.success) throw new ErrorEnvioEvidencia(422, 'cifras_invalidas', 'Revisa las cifras del borrador antes de enviar.');
  return {
    acta: borrador.id,
    operacionCifras: uuid(),
    operacionEvidencia: uuid(),
    cifras: leerCifras(cifras.data),
    foto: { ...borrador.foto },
    ubicacion: { ...borrador.ubicacion },
  };
}

export function crearEnvioBorrador(puertos: Puertos) {
  const enCurso = new Map<string, Promise<Confirmacion>>();
  const preparando = new Map<string, Promise<EnvioGuardado>>();

  function encolar(referencia: ReferenciaBorrador, siglas: string[]) {
    const clave = claveEnvio(referencia);
    const previo = preparando.get(clave);
    if (previo) return previo;
    const nueva = (async () => {
      const guardado = await puertos.envios.cargar(referencia);
      if (guardado) return guardado;
      const { usuario, mesa, dignidad } = referencia;
      const envio = preparar(await puertos.borradores.cargar(usuario, mesa, dignidad), siglas, puertos.uuid);
      await puertos.envios.guardar(referencia, envio);
      return envio;
    })().finally(() => { preparando.delete(clave); });
    preparando.set(clave, nueva);
    return nueva;
  }

  async function ejecutar(referencia: ReferenciaBorrador, siglas: string[]) {
    const { usuario, mesa, dignidad } = referencia;
    await puertos.validarSesion(usuario);
    let envio = await encolar(referencia, siglas);
    if (envio.confirmacion) return envio.confirmacion;
    let revision = envio.revision;
    if (revision === undefined) {
      const token = await puertos.validarSesion(usuario);
      revision = await puertos.actas.guardar({
        id: envio.acta, operacion: envio.operacionCifras, mesa, dignidad, cifras: envio.cifras,
      }, token || undefined);
      envio = { ...envio, revision };
      await puertos.envios.guardar(referencia, envio);
    }
    const token = await puertos.validarSesion(usuario);
    const confirmacion = await puertos.evidencia.enviar({
      acta: envio.acta, revision, operacion: envio.operacionEvidencia, foto: envio.foto, ubicacion: envio.ubicacion,
    }, token || undefined);
    await puertos.envios.guardar(referencia, { ...envio, confirmacion });
    return confirmacion;
  }

  function enviar(referencia: ReferenciaBorrador, siglas: string[]) {
    const clave = claveEnvio(referencia);
    const anterior = enCurso.get(clave);
    if (anterior) return anterior;
    const intento = ejecutar(referencia, siglas).finally(() => { enCurso.delete(clave); });
    enCurso.set(clave, intento);
    return intento;
  }
  return Object.assign(enviar, { encolar });
}
