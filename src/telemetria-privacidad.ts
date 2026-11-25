import type { Event } from '@sentry/react-native';

const pantallas = ['registro-actas', 'sincronizacion', 'monitoreo', 'inicio', 'desconocida'] as const;
export type PantallaTelemetria = typeof pantallas[number];
export type OperacionTelemetria = 'carga-evidencia' | 'sincronizacion-actas';

type Equipo = { modelo?: string | null; sistema?: string | null; versionSistema?: string | null; versionApp?: string | null };

export function sanearEvento(evento: Event, equipo: Equipo, pantalla: PantallaTelemetria): (Omit<Event, 'type'> & { type: undefined }) | null {
  if (!evento.exception?.values?.length) return null;
  function etiqueta(texto: unknown) {
    return typeof texto === 'string' && /^[\w .+()/-]{1,60}$/.test(texto) ? texto : undefined;
  }
  function archivo(texto: unknown) {
    if (typeof texto !== 'string' || texto.length > 200) return undefined;
    return /^(?:app:\/\/\/)?(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.(?:js|jsx|ts|tsx|bundle|hbc)$/i.test(texto)
      ? texto : undefined;
  }
  const operacion = evento.tags?.operacion;
  const debugMeta = evento.debug_meta?.images?.flatMap((imagen) => {
    if (imagen.type !== 'sourcemap' || !archivo(imagen.code_file) || !/^[0-9a-f-]{36}$/i.test(imagen.debug_id ?? '')) return [];
    return [{ type: 'sourcemap' as const, code_file: imagen.code_file, debug_id: imagen.debug_id }];
  });
  return {
    event_id: typeof evento.event_id === 'string' && /^[0-9a-f]{32}$/i.test(evento.event_id) ? evento.event_id : undefined,
    timestamp: Number.isFinite(evento.timestamp) ? evento.timestamp : undefined,
    type: undefined,
    platform: 'javascript',
    environment: evento.environment === 'development' ? 'development' : 'production',
    level: 'error',
    release: typeof evento.release === 'string' && /^[\w.@+-]{1,100}$/.test(evento.release) ? evento.release : undefined,
    dist: typeof evento.dist === 'string' && /^[\w.-]{1,40}$/.test(evento.dist) ? evento.dist : undefined,
    tags: {
      ...(evento.tags?.prueba === 'javascript-interfaz' ? { prueba: 'javascript-interfaz' } : {}),
      pantalla: pantallas.includes(pantalla) ? pantalla : 'desconocida',
      ...(operacion === 'carga-evidencia' || operacion === 'sincronizacion-actas' ? { operacion } : {}),
    },
    contexts: {
      device: { model: etiqueta(equipo.modelo) },
      os: { name: etiqueta(equipo.sistema), version: etiqueta(equipo.versionSistema) },
      app: { app_version: etiqueta(equipo.versionApp) },
    },
    ...(debugMeta?.length ? { debug_meta: { images: debugMeta } } : {}),
    exception: {
      values: evento.exception.values.slice(0, 5).map((excepcion) => ({
        type: ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError'].includes(excepcion.type ?? '')
          ? excepcion.type : 'Error',
        value: 'Fallo de la aplicación',
        mechanism: { type: 'generic', handled: excepcion.mechanism?.handled === true },
        stacktrace: { frames: excepcion.stacktrace?.frames?.slice(-40).flatMap((frame) => {
          const filename = archivo(frame.filename);
          return filename ? [{ filename, lineno: Number.isInteger(frame.lineno) ? frame.lineno : undefined,
            colno: Number.isInteger(frame.colno) ? frame.colno : undefined, in_app: frame.in_app === true }] : [];
        }) ?? [] },
      })),
    },
  };
}
