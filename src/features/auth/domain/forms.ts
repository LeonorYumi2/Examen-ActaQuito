import { z } from 'zod';

export const recoveryForm = z.object({
  email: z.string().trim().pipe(z.email('Escribe un correo electrónico válido.')),
});

export const loginForm = recoveryForm.extend({
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export const passwordForm = z.object({
  password: z.string()
    .min(8, 'Usa al menos 8 caracteres.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'La contraseña es demasiado larga.'),
  repeatPassword: z.string().min(1, 'Confirma la contraseña.'),
}).refine(({ password, repeatPassword }) => password === repeatPassword, {
  path: ['repeatPassword'],
  message: 'Las contraseñas no coinciden.',
});
