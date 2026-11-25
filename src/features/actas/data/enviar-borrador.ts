import { randomUUID } from 'expo-crypto';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { crearEnvioBorrador, type ReferenciaBorrador } from '../domain/enviar-borrador';
import { ErrorEnvioEvidencia } from '../domain/envio-evidencia';
import { borradoresLocales, enviosLocales } from './borradores-locales';
import { repositorioActas } from './repositorio-actas';
import { repositorioEnvioEvidencia } from './repositorio-envio-evidencia';

async function validarSesion(usuario: string) {
  const { data, error } = await mobileSupabase().auth.getSession();
  if (error || data.session?.user.id !== usuario) {
    throw new ErrorEnvioEvidencia(401, 'sesion', 'Inicia sesión con la cuenta que guardó este borrador.');
  }
}

export const enviarBorradorLocal = crearEnvioBorrador({
  borradores: borradoresLocales, envios: enviosLocales, actas: repositorioActas,
  evidencia: repositorioEnvioEvidencia, uuid: randomUUID, validarSesion,
});

export async function estadoEnvioBorrador(referencia: ReferenciaBorrador) {
  await validarSesion(referencia.usuario);
  const envio = await enviosLocales.cargar(referencia);
  return envio?.confirmacion ? 'confirmado' : envio ? 'pendiente' : 'sin-envio';
}
