import { z } from 'zod';
import { cedulaEcuatorianaValida, codigoRecinto, identidadInvitacion } from '../gestion-usuarios';

export const validarCedulaEcuatoriana = cedulaEcuatorianaValida;

/**
 * Validación estricta para números celulares ecuatorianos en formularios móviles:
 * - Acepta solamente números.
 * - Exige exactamente 10 dígitos.
 * - Debe comenzar con 09.
 */
export const celularEcuatorianoValido = z
  .string()
  .trim()
  .min(1, 'Ingresa el número celular.')
  .regex(/^\d+$/, 'El celular debe contener únicamente números.')
  .refine((val) => val.startsWith('09'), {
    message: 'El celular debe comenzar con 09 (ej: 0991234567).',
  })
  .refine((val) => val.length === 10, {
    message: 'El celular debe tener exactamente 10 dígitos.',
  });

export const esquemaInvitacionCoordinador = identidadInvitacion.extend({
  telefono: celularEcuatorianoValido,
  recintoCodigo: codigoRecinto,
});
export type FormularioInvitacionCoordinador = z.infer<typeof esquemaInvitacionCoordinador>;

export const esquemaInvitacionVeedor = identidadInvitacion.extend({
  telefono: celularEcuatorianoValido,
  mesaNumero: z.number().int().min(1).max(32767),
});
export type FormularioInvitacionVeedor = z.infer<typeof esquemaInvitacionVeedor>;

export interface ResultadoOperacionInvitacion {
  exito: boolean;
  usuarioId?: string;
  mensaje: string;
  estadoOperacion: 'creada' | 'pendiente_activacion' | 'servicio_no_disponible' | 'error';
}
