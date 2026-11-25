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
  nombres: z.string().trim().min(1).max(120),
  apellidos: z.string().trim().min(1).max(120),
  correo: z.string().trim().toLowerCase().max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Ingresa un correo válido.'),
  cedula: z.string().trim().refine(cedulaEcuatorianaValida, 'Ingresa una cédula ecuatoriana válida.'),
  telefono: z.string().trim().regex(/^[+0-9() -]{7,30}$/).refine((valor) => valor.replace(/\D/g, '').length >= 7),
});
export type IdentidadInvitacion = z.input<typeof identidadInvitacion>;

export const codigoRecinto = z.string().trim().min(1).max(120);
export const asignacionCoordinador = z.strictObject({ recinto: codigoRecinto, coordinador: z.uuid() });
export const asignacionVeedor = z.strictObject({
  recinto: codigoRecinto, mesa: z.number().int().min(1).max(32767), veedor: z.uuid(),
  asignacionSaliente: z.uuid().nullable(),
});
