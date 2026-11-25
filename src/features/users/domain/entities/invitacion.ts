import { z } from 'zod';
import { cedulaEcuatorianaValida, codigoRecinto, identidadInvitacion } from '../gestion-usuarios';

export const validarCedulaEcuatoriana = cedulaEcuatorianaValida;

export const esquemaInvitacionCoordinador = identidadInvitacion.extend({
  recintoCodigo: codigoRecinto,
});
export type FormularioInvitacionCoordinador = z.infer<typeof esquemaInvitacionCoordinador>;

export const esquemaInvitacionVeedor = identidadInvitacion.extend({
  mesaNumero: z.number().int().min(1).max(32767),
});
export type FormularioInvitacionVeedor = z.infer<typeof esquemaInvitacionVeedor>;

export interface ResultadoOperacionInvitacion {
  exito: boolean;
  usuarioId?: string;
  mensaje: string;
  estadoOperacion: 'creada' | 'pendiente_activacion' | 'servicio_no_disponible' | 'error';
}
