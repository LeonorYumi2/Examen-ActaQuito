import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import {
  asignacionCoordinador, asignacionVeedor, codigoRecinto, identidadInvitacion, type IdentidadInvitacion,
} from '../domain/gestion-usuarios';

export class ErrorGestionUsuarios extends Error {
  constructor(readonly codigo: string, mensaje: string) {
    super(mensaje);
  }
}

async function invitar(identidad: IdentidadInvitacion, recinto?: string) {
  const datos = identidadInvitacion.parse(identidad);
  const { data, error } = await mobileSupabase().functions.invoke('invitar-usuario', {
    body: recinto === undefined ? datos : { ...datos, recinto: codigoRecinto.parse(recinto) },
  });
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response).status;
    if (status === 409) throw new ErrorGestionUsuarios('duplicado', 'La cédula o el correo ya están vinculados a otra invitación o cuenta.');
    if (status === 429) throw new ErrorGestionUsuarios('limite', 'Se alcanzó el límite de invitaciones. Intenta más tarde.');
    if (status === 403) throw new ErrorGestionUsuarios('permiso', 'Tu cuenta no puede invitar en este ámbito.');
    if (status === 400) throw new ErrorGestionUsuarios('datos', 'Revisa los datos de la persona antes de invitar.');
  }
  const confirmacion = z.object({ usuarioId: z.uuid() }).safeParse(data);
  if (error || !confirmacion.success) {
    throw new ErrorGestionUsuarios('invitacion_pendiente', 'No se pudo confirmar la invitación. Reintenta con los mismos datos.');
  }
  return confirmacion.data;
}

export function invitarCoordinador(identidad: IdentidadInvitacion) {
  return invitar(identidad);
}

export function invitarVeedor(identidad: IdentidadInvitacion, recinto: string) {
  return invitar(identidad, recinto);
}

function resultadoAsignacion(data: unknown, error: { code: string; message: string } | null) {
  if (error?.code === '42501') throw new ErrorGestionUsuarios('permiso', 'Tu cuenta no puede modificar esta asignación.');
  if (error?.code === '22023') throw new ErrorGestionUsuarios('asignacion_invalida', error.message);
  if (error?.code === '40001') throw new ErrorGestionUsuarios('asignacion_cambio', 'Actualiza la mesa y revisa su asignación antes de continuar.');
  const id = z.uuid().safeParse(data);
  if (error || !id.success) throw new ErrorGestionUsuarios('asignacion_pendiente', 'No se pudo confirmar la asignación. Actualiza los datos antes de reintentar.');
  return { asignacionId: id.data };
}

export async function asignarCoordinador(entrada: z.input<typeof asignacionCoordinador>) {
  const { data, error } = await mobileSupabase().rpc('asignar_coordinador', asignacionCoordinador.parse(entrada));
  return resultadoAsignacion(data, error);
}

export async function asignarVeedor(entrada: z.input<typeof asignacionVeedor>) {
  const { asignacionSaliente, ...datos } = asignacionVeedor.parse(entrada);
  const { data, error } = await mobileSupabase().rpc('asignar_veedor', { ...datos, asignacion_saliente: asignacionSaliente });
  return resultadoAsignacion(data, error);
}
