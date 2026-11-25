import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { sanearEvento, type OperacionTelemetria, type PantallaTelemetria } from './telemetria-privacidad';

let pantalla: PantallaTelemetria = 'desconocida';
let activa = false;

export function iniciarTelemetria() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (activa || !dsn || __DEV__) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    enableLogs: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: false,
    // La captura nativa debe pasar su propia auditoría de privacidad antes de habilitarse.
    enableNativeCrashHandling: false,
    beforeSend(evento, pista) {
      if (pista.attachments) pista.attachments = [];
      return sanearEvento(evento, {
        modelo: Device.modelName,
        sistema: Device.osName,
        versionSistema: Device.osVersion,
        versionApp: Constants.expoConfig?.version,
      }, pantalla) as Sentry.ErrorEvent | null;
    },
  });
  activa = true;
}

export function definirPantallaTelemetria(nombre: PantallaTelemetria) {
  pantalla = nombre;
}

export function reportarFalloElectoral(operacion: OperacionTelemetria) {
  if (!activa) return;
  Sentry.captureException(new Error('Fallo de una operación electoral'), { tags: { operacion } });
}
