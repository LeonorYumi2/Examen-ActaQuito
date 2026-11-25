import { reportarFalloElectoral } from '@/telemetria';
import { ubicacionCorreccion, type UbicacionCorreccion } from '../domain/historial-acta';
import { guardarCorreccionActa } from './repositorio-detalle-acta';
import { randomUUID } from 'expo-crypto';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import type { Access } from '@/features/auth/domain/auth';
import { claveEnvio, crearEnvioBorrador, type ReferenciaBorrador } from '../domain/enviar-borrador';
import { ErrorEnvioEvidencia } from '../domain/envio-evidencia';
import type { BorradorLocal } from '../domain/evidencia';
import { esquemaActa, leerCifras, type CamposActa } from '../domain/registro';
import { controlEnvio, crearProcesadorOutbox } from '../domain/sincronizacion';
import { borradoresLocales, catalogosLocales, correccionesLocales, enviosLocales, limpiarCuentasInactivas, listarEnviosLocales, suscribirEnviosLocales } from './borradores-locales';
import { precargarCatalogoActas } from './catalogo-offline';
import { claveActaTerritorial, repositorioActas } from './repositorio-actas';
import { repositorioEnvioEvidencia } from './repositorio-envio-evidencia';

export const useConexionActas = create<{ enLinea: boolean }>(() => ({ enLinea: false }));

type EstadoSesion = { access: Access | null };
type SesionActas = {
  getState(): EstadoSesion;
  subscribe(escuchar: (nuevo: EstadoSesion, previo: EstadoSesion) => void): () => void;
};
let sesionActas: SesionActas | undefined;

function accesoOperativo() {
  const access = sesionActas?.getState().access;
  return access?.kind === 'operational' ? access : null;
}

function validarCuentaLocal(usuario: string) {
  if (Platform.OS === 'web' || accesoOperativo()?.profile.id !== usuario) {
    throw new ErrorEnvioEvidencia(401, 'sesion', 'Inicia sesión con la cuenta que guardó este borrador.');
  }
}

function validarConexion() {
  if (!useConexionActas.getState().enLinea || AppState.currentState !== 'active') {
    throw new ErrorEnvioEvidencia(503, 'sin_conexion', 'El envío queda guardado hasta recuperar la conexión.');
  }
}

async function tokenVerificado(usuario: string) {
  validarCuentaLocal(usuario);
  validarConexion();
  const auth = mobileSupabase().auth;
  const { data, error } = await auth.getSession();
  if (error) {
    throw new ErrorEnvioEvidencia(error.status, error.code ?? 'sesion_temporal', 'No se pudo verificar la sesión.');
  }
  if (data.session?.user.id !== usuario) {
    throw new ErrorEnvioEvidencia(401, 'sesion', 'Inicia sesión con la cuenta que guardó este borrador.');
  }
  const token = data.session.access_token;
  const verificacion = await auth.getUser(token);
  if (verificacion.error) {
    throw new ErrorEnvioEvidencia(verificacion.error.status, verificacion.error.code ?? 'sesion_temporal', 'No se pudo verificar la sesión.');
  }
  if (verificacion.data.user?.id !== usuario) {
    throw new ErrorEnvioEvidencia(401, 'sesion', 'La sesión no corresponde a este borrador.');
  }
  validarCuentaLocal(usuario);
  validarConexion();
  return token;
}

const envio = crearEnvioBorrador({
  borradores: borradoresLocales, envios: enviosLocales, actas: repositorioActas,
  evidencia: repositorioEnvioEvidencia, uuid: randomUUID, validarSesion: tokenVerificado,
});

function puedeProcesar(usuario: string) {
  const acceso = accesoOperativo();
  return !!acceso && acceso.profile.id === usuario && acceso.profile.role !== 'provincial'
    && useConexionActas.getState().enLinea && AppState.currentState === 'active';
}

const procesar = crearProcesadorOutbox(enviosLocales, (referencia) => envio(referencia, []),
  (usuario) => puedeProcesar(usuario) && accesoOperativo()?.profile.role === 'veedor');

const procesarCorreccion = crearProcesadorOutbox(correccionesLocales, async (referencia) => {
  const trabajo = await correccionesLocales.cargar(referencia);
  if (!trabajo) throw new Error('No se encontró la corrección local.');
  if (!trabajo.ubicacion) {
    throw new ErrorEnvioEvidencia(422, 'gps_correccion_ausente', 'Esta corrección pendiente requiere capturar su ubicación.');
  }
  const token = await tokenVerificado(referencia.usuario);
  const revision = await guardarCorreccionActa({ ...trabajo, ubicacion: trabajo.ubicacion }, token);
  const confirmacion = { acta: trabajo.acta, revision };
  await correccionesLocales.guardar(referencia, { ...trabajo, confirmacion });
  return confirmacion;
}, puedeProcesar);
let temporizador: ReturnType<typeof setTimeout> | undefined;
let procesando: Promise<void> | undefined;
let repetir = false;
let precarga: Promise<void> | undefined;
let clavePrecarga = '';
let revisionConexion = 0;
let iniciado = false;
let limiteHasta = 0;

function programar(demora: number) {
  clearTimeout(temporizador);
  temporizador = setTimeout(despertar, Math.min(2147483647, Math.max(0, demora)));
}

function despertar() {
  const acceso = accesoOperativo();
  if (!acceso || !puedeProcesar(acceso.profile.id)) {
    clearTimeout(temporizador);
    return;
  }
  if (limiteHasta > Date.now()) { programar(limiteHasta - Date.now()); return; }
  if (procesando) {
    repetir = true;
    return;
  }
  const usuario = acceso.profile.id;
  procesando = (async () => {
    let siguiente = Infinity;
    const colas = [
      { tipo: 'envio', ejecutar: procesar, locales: enviosLocales },
      { tipo: 'correccion', ejecutar: procesarCorreccion, locales: correccionesLocales },
    ] as const;
    for (const { tipo, ejecutar, locales } of colas) {
      for (const referencia of await listarEnviosLocales(usuario, tipo)) {
        if (!puedeProcesar(usuario)) return;
        let fallo = false;
        await ejecutar(referencia).catch(() => {
          fallo = true;
          // El procesador conserva el código y el estado para el siguiente intento o intervención.
        });
        const guardado = await locales.cargar(referencia);
        const control = guardado && controlEnvio(guardado);
        if (fallo && control?.codigo === 'intentos_agotados') reportarFalloElectoral(tipo === 'envio' ? 'carga-evidencia' : 'sincronizacion-actas');
        if (control?.estado === 'pendiente' && control.siguiente !== undefined) {
          if (control.codigo === 'limite_solicitudes' && control.siguiente > Date.now()) {
            limiteHasta = control.siguiente;
            programar(limiteHasta - Date.now());
            return;
          }
          siguiente = Math.min(siguiente, control.siguiente);
        }
      }
    }

    if (puedeProcesar(usuario) && Number.isFinite(siguiente)) programar(siguiente - Date.now());
  })().catch(() => {
    // Un fallo del almacenamiento se vuelve a consultar al cambiar sesión, red o actividad.
  }).finally(() => {
    procesando = undefined;
    if (repetir) { repetir = false; despertar(); }
  });
}

function precargarSiActivo() {
  const acceso = accesoOperativo();
  if (!acceso || acceso.profile.role === 'provincial'
    || !useConexionActas.getState().enLinea || AppState.currentState !== 'active' || precarga) return;
  const usuario = acceso.profile.id;
  const clave = usuario + '/' + revisionConexion;
  if (clavePrecarga === clave) return;
  clavePrecarga = clave;
  precarga = tokenVerificado(usuario).then((token) => precargarCatalogoActas(
    usuario, token, () => accesoOperativo()?.profile.id === usuario && clavePrecarga === clave,
  )).catch(() => {
    // Se conserva el último catálogo válido y se vuelve a intentar al reactivar la app o reconectar.
  }).finally(() => {
    precarga = undefined;
    precargarSiActivo();
  });
}

export function iniciarSincronizacionActas(sesion: SesionActas) {
  if (iniciado || Platform.OS === 'web') return;
  iniciado = true;
  sesionActas = sesion;
  NetInfo.addEventListener((red) => {
    const enLinea = red.isConnected === true && red.isInternetReachable !== false;
    if (enLinea !== useConexionActas.getState().enLinea) {
      useConexionActas.setState({ enLinea });
      revisionConexion++;
    }
    despertar();
    precargarSiActivo();
  });
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') revisionConexion++;
    despertar();
    precargarSiActivo();
  });
  sesion.subscribe((nuevo, previo) => {
    const anterior = previo.access?.kind === 'operational' ? previo.access.profile.id : null;
    const actual = nuevo.access?.kind === 'operational' ? nuevo.access.profile.id : null;
    if (nuevo.access && (!previo.access || anterior !== actual)) {
      clavePrecarga = '';
      void Promise.allSettled([procesando, precarga]).then(() => limpiarCuentasInactivas(
        accesoOperativo()?.profile.id ?? null,
        (usuario) => accesoOperativo()?.profile.id !== usuario,
      )).catch(() => {});
    }

    if (nuevo.access !== previo.access) {
      despertar();
      precargarSiActivo();
    }
  });
}

export async function encolarBorradorLocal(referencia: ReferenciaBorrador, siglas: string[]) {
  validarCuentaLocal(referencia.usuario);
  if (accesoOperativo()?.profile.role !== 'veedor') {
    throw new ErrorEnvioEvidencia(403, 'permiso', 'Solo el veedor puede enviar la evidencia inicial.');
  }
  const correccion = await correccionesLocales.cargar(referencia);
  if (correccion && !correccion.confirmacion) {
    throw new ErrorEnvioEvidencia(409, 'correccion_pendiente', 'Resuelve la corrección pendiente antes de enviar evidencia.');
  }
  const guardado = await envio.encolar(referencia, siglas);
  despertar();
  return controlEnvio(guardado);
}

export async function enviarBorradorLocal(referencia: ReferenciaBorrador, siglas: string[]) {
  await encolarBorradorLocal(referencia, siglas);
  const confirmacion = limiteHasta > Date.now() ? undefined : await procesar(referencia);
  if (!confirmacion) throw new ErrorEnvioEvidencia(503, 'envio_pendiente', 'El envío quedó en la cola. Consulta su estado.');
  return confirmacion;
}

export async function detalleSincronizacionBorrador(referencia: ReferenciaBorrador) {
  validarCuentaLocal(referencia.usuario);
  const guardado = await enviosLocales.cargar(referencia);
  if (!guardado) return null;
  const control = controlEnvio(guardado);
  return control.estado === 'sincronizando' && !procesar.enCurso(referencia)
    ? { ...control, estado: 'pendiente' as const }
    : control;
}

export async function estadoEnvioBorrador(referencia: ReferenciaBorrador) {
  const control = await detalleSincronizacionBorrador(referencia);
  return !control ? 'sin-envio' : control.estado === 'sincronizado' ? 'confirmado' : 'pendiente';
}

function esReactivable({ estado, codigo }: ReturnType<typeof controlEnvio>) {
  return estado === 'requiere-intervencion' && (codigo === 'sesion' || codigo === 'intentos_agotados');
}

export async function reactivarEnvioBorrador(referencia: ReferenciaBorrador, tipo: 'envio' | 'correccion' = 'envio') {
  validarCuentaLocal(referencia.usuario);
  if (tipo === 'correccion') {
    const trabajo = await correccionesLocales.cargar(referencia);
    if (trabajo && esReactivable(controlEnvio(trabajo))) {
      await correccionesLocales.guardar(referencia, { ...trabajo, control: { estado: 'pendiente', intentos: 0 } });
      despertar();
    }
    return;
  }
  const guardado = await enviosLocales.cargar(referencia);
  if (!guardado) return;
  if (!esReactivable(controlEnvio(guardado))) return;
  await enviosLocales.guardar(referencia, { ...guardado, control: { estado: 'pendiente', intentos: 0 } });
  despertar();
}

export async function cargarCatalogoOffline(usuario: string) {
  validarCuentaLocal(usuario);
  const catalogo = await catalogosLocales.cargar(usuario);
  validarCuentaLocal(usuario);
  return catalogo;
}

export async function cargarBorradorOffline(referencia: ReferenciaBorrador) {
  validarCuentaLocal(referencia.usuario);
  const borrador = await borradoresLocales.cargar(referencia.usuario, referencia.mesa, referencia.dignidad);
  validarCuentaLocal(referencia.usuario);
  return borrador;
}

export function suscribirSincronizacionBorrador(referencia: ReferenciaBorrador, escuchar: () => void) {
  validarCuentaLocal(referencia.usuario);
  const clave = claveEnvio(referencia);
  return suscribirEnviosLocales((cambio) => {
    if (accesoOperativo()?.profile.id === referencia.usuario && claveEnvio(cambio) === clave) escuchar();
  });
}

export async function contarEnviosPendientes(usuario: string) {
  validarCuentaLocal(usuario);
  let cantidad = 0;
  for (const tipo of ['envio', 'correccion'] as const) {
    const locales = tipo === 'envio' ? enviosLocales : correccionesLocales;
    for (const referencia of await listarEnviosLocales(usuario, tipo)) {
      const guardado = await locales.cargar(referencia);
      if (guardado && !guardado.confirmacion) cantidad++;
    }
  }

  return cantidad;
}

export async function cargarRegistroOffline(referencia: ReferenciaBorrador) {
  const catalogo = await cargarCatalogoOffline(referencia.usuario);
  const clave = claveActaTerritorial(referencia.mesa.recinto, referencia.mesa.numero, referencia.dignidad);
  if (!catalogo || !catalogo.mesas.some((mesa) =>
    mesa.recinto === referencia.mesa.recinto && mesa.numero === referencia.mesa.numero)) return null;
  const correccion = await correccionesLocales.cargar(referencia);
  return {
    candidaturas: catalogo.candidaturas[referencia.dignidad],
    recinto: catalogo.recintos[referencia.mesa.recinto],
    borrador: await cargarBorradorOffline(referencia),
    acta: catalogo.actas?.[clave] ?? null,
    correccion,
  };
}

let preparandoCorreccion = Promise.resolve();
export function encolarCorreccionActa(referencia: ReferenciaBorrador, acta: string, campos: CamposActa, siglas: string[], ubicacion?: UbicacionCorreccion) {
  const preparar = preparandoCorreccion.then(async () => {
    validarCuentaLocal(referencia.usuario);
    if (accesoOperativo()?.profile.role === 'provincial') {
      throw new ErrorEnvioEvidencia(403, 'permiso', 'Esta cuenta solo puede consultar actas.');
    }
    const registrada = await enviosLocales.cargar(referencia);
    if (registrada && !registrada.confirmacion) {
      throw new ErrorEnvioEvidencia(409, 'evidencia_pendiente', 'Confirma el envío pendiente antes de corregir sus cifras.');
    }
    const catalogo = await catalogosLocales.cargar(referencia.usuario);
    const clave = claveActaTerritorial(referencia.mesa.recinto, referencia.mesa.numero, referencia.dignidad);
    if (!acta || (acta !== registrada?.acta && acta !== catalogo?.actas?.[clave]?.id)) {
      throw new ErrorEnvioEvidencia(409, 'acta_no_disponible', 'Descarga el acta autorizada antes de preparar la corrección.');
    }
    const validado = esquemaActa(siglas).safeParse(campos);
    if (!validado.success) throw new ErrorEnvioEvidencia(422, 'cifras_invalidas', 'Revisa las cifras de la corrección.');
    const gps = ubicacionCorreccion.safeParse(ubicacion);
    if (!gps.success) {
      throw new ErrorEnvioEvidencia(422, 'gps_correccion_ausente', 'Captura una ubicación GPS válida para esta corrección.');
    }
    const cifras = leerCifras(validado.data);
    const anterior = await correccionesLocales.cargar(referencia);
    if (anterior && !anterior.confirmacion) {
      if (anterior.acta === acta && JSON.stringify(anterior.cifras) === JSON.stringify(cifras)
        && JSON.stringify(anterior.ubicacion) === JSON.stringify(gps.data)) return controlEnvio(anterior);
      // Las operaciones ya enviables siempre conservan su instantánea y UUID.
      throw new ErrorEnvioEvidencia(409, 'correccion_pendiente', 'Resuelve la corrección anterior antes de guardar otra.');
    }
    validarCuentaLocal(referencia.usuario);
    const trabajo = { acta, operacion: randomUUID(), cifras, ubicacion: gps.data };
    await correccionesLocales.guardar(referencia, trabajo);
    despertar();
    return controlEnvio({ control: { estado: 'pendiente', intentos: 0 } });
  });
  preparandoCorreccion = preparar.then(() => {}, () => {});
  return preparar;
}

export async function estadoCorreccionActa(referencia: ReferenciaBorrador) {
  validarCuentaLocal(referencia.usuario);
  const trabajo = await correccionesLocales.cargar(referencia);
  if (!trabajo) return null;
  const estado = controlEnvio(trabajo);
  return estado.estado === 'sincronizando' && !procesarCorreccion.enCurso(referencia)
    ? { ...estado, estado: 'pendiente' as const }
    : estado;
}

export async function guardarCapturaLocal(referencia: ReferenciaBorrador, borrador: BorradorLocal) {
  validarCuentaLocal(referencia.usuario);
  if (accesoOperativo()?.profile.role !== 'veedor') {
    throw new ErrorEnvioEvidencia(403, 'permiso', 'Solo el veedor puede guardar esta captura.');
  }
  await borradoresLocales.guardar(referencia.usuario, referencia.mesa, referencia.dignidad, borrador);
}
