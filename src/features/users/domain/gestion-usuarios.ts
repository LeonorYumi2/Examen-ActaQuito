import { z } from 'zod';

export function cedulaEcuatorianaValida(cedula: string) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if ((provincia < 1 || provincia > 24) && provincia !== 30 || Number(cedula[2]) > 5) return false;
  const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
    const valor = Number(digito) * (indice % 2 === 0 ? 2 : 1);
    return total + (valor > 9 ? valor - 9 : valor);
  }, 0);
  return (10 - suma % 10) % 10 === Number(cedula[9]);
}

export const identidadInvitacion = z.strictObject({
  nombres: z.string().trim().min(1, 'Ingresa los nombres completos.').max(120, 'Máximo 120 caracteres.'),
  apellidos: z.string().trim().min(1, 'Ingresa los apellidos completos.').max(120, 'Máximo 120 caracteres.'),
  correo: z.string().trim().toLowerCase().max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Ingresa un correo válido.'),
  cedula: z.string().trim().refine(cedulaEcuatorianaValida, 'Ingresa una cédula ecuatoriana válida.'),
  telefono: z
    .string()
    .trim()
    .min(7, 'El teléfono debe tener al menos 7 dígitos.')
    .max(30, 'El teléfono no puede exceder 30 caracteres.')
    .regex(
      /^[+0-9() -]{7,30}$/,
      'Ingresa un número de teléfono válido (ej: 0991234567 o +593991234567).'
    )
    .refine((valor) => valor.replace(/\D/g, '').length >= 7, {
      message: 'El teléfono debe contener al menos 7 dígitos numéricos.',
    }),
});
export type IdentidadInvitacion = z.input<typeof identidadInvitacion>;

export const codigoRecinto = z.string().trim().min(1).max(120);
export const asignacionCoordinador = z.strictObject({ recinto: codigoRecinto, coordinador: z.uuid() });
export const asignacionVeedor = z.strictObject({
  recinto: codigoRecinto, mesa: z.number().int().min(1).max(32767), veedor: z.uuid(),
  asignacionSaliente: z.uuid().nullable(),
});
