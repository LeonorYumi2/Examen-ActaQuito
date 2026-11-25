import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { authMessage, type PasswordFlow, type Role } from '../../domain/auth';
import { loginForm, passwordForm, recoveryForm } from '../../domain/forms';
import { AuthButton, AuthField, AuthMessage, AuthPanel, AuthProgress } from '../AuthForm';
import { useAuth } from '../auth-state';
import { passwordRoute, roleHome } from '../routes';

function OpeningScreen() {
  return (
    <AuthPanel title="Acceso a ActaQuito" description="Estamos preparando tu acceso.">
      <AuthProgress text="Comprobando la sesión…" />
    </AuthPanel>
  );
}

export function AuthStartScreen() {
  const access = useAuth((state) => state.access);
  if (!access) return <OpeningScreen />;
  if (access.kind === 'setup') return <Redirect href={passwordRoute(access.flow)} />;
  return <Redirect href={access.kind === 'operational' ? roleHome[access.profile.role] : '/auth/login'} />;
}

export function LoginScreen() {
  const access = useAuth((state) => state.access);
  const signIn = useAuth((state) => state.signIn);
  const problem = useAuth((state) => state.problem);
  const notice = useAuth((state) => state.notice);
  const [error, setError] = useState<string>();
  const { control, handleSubmit, resetField, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(loginForm),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    try {
      await signIn(email, password);
    } catch (issue) {
      setError(authMessage(issue));
    } finally {
      resetField('password');
    }
  });

  if (!access) return <OpeningScreen />;
  if (access.kind === 'operational') return <Redirect href={roleHome[access.profile.role]} />;
  if (access.kind === 'setup') return <Redirect href={passwordRoute(access.flow)} />;

  return (
    <AuthPanel title="Inicia sesión" description="Ingresa con el correo y la contraseña de tu cuenta.">
      <AuthMessage message={error ?? problem} />
      <AuthMessage message={notice} success />
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <AuthField label="Correo electrónico" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
          editable={!isSubmitting} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="password" render={({ field, fieldState }) => (
        <AuthField label="Contraseña" password value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          textContentType="password" autoComplete="current-password" editable={!isSubmitting} error={fieldState.error?.message}
          onSubmitEditing={() => { if (!isSubmitting) void submit(); }} returnKeyType="go" />
      )} />
      <AuthButton label={isSubmitting ? 'Ingresando…' : 'Ingresar'} busy={isSubmitting} onPress={() => { void submit(); }} />
      <AuthButton label="Olvidé mi contraseña" secondary disabled={isSubmitting}
        onPress={() => router.push('/auth/forgot-password')} />
    </AuthPanel>
  );
}

export function ForgotPasswordScreen() {
  const access = useAuth((state) => state.access);
  const requestRecovery = useAuth((state) => state.requestRecovery);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(recoveryForm), defaultValues: { email: '' },
  });
  const submit = handleSubmit(async ({ email }) => {
    setError(undefined);
    setSent(false);
    try {
      await requestRecovery(email);
      setSent(true);
    } catch (issue) {
      setError(authMessage(issue));
    }
  });

  if (!access) return <OpeningScreen />;
  if (access.kind === 'operational') return <Redirect href={roleHome[access.profile.role]} />;

  return (
    <AuthPanel title="Recupera tu acceso" description="Te enviaremos un enlace para elegir una nueva contraseña.">
      <AuthMessage message={error} />
      <AuthMessage success message={sent ? 'Si el correo está habilitado, recibirás un enlace. Ábrelo en este mismo dispositivo y revisa también el correo no deseado.' : null} />
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <AuthField label="Correo electrónico" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
          editable={!isSubmitting} error={fieldState.error?.message} />
      )} />
      <AuthButton label={isSubmitting ? 'Enviando…' : 'Enviar enlace'} busy={isSubmitting} onPress={() => { void submit(); }} />
      <AuthButton label="Volver al inicio de sesión" secondary wrapLabel disabled={isSubmitting}
        onPress={() => router.replace('/auth/login')} />
    </AuthPanel>
  );
}

export function PasswordSetupScreen({ flow }: { flow: PasswordFlow }) {
  const access = useAuth((state) => state.access);
  const complete = useAuth((state) => state.completePassword);
  const signOut = useAuth((state) => state.signOut);
  const link = useAuth((state) => state.link);
  const [error, setError] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(passwordForm), defaultValues: { password: '', repeatPassword: '' },
  });
  const submit = handleSubmit(async ({ password }) => {
    setError(undefined);
    try {
      await complete(flow, password);
      router.replace('/auth/login');
    } catch (issue) {
      setError(authMessage(issue));
    } finally {
      reset();
    }
  });

  const checking = !access || (link?.flow === flow && link.state === 'checking');
  const linkError = link?.flow === flow && link.state === 'error' ? link.message : undefined;
  const ready = !checking && !linkError && access?.kind === 'setup' && access.flow === flow;
  const invite = flow === 'invite';
  async function back() {
    if (access?.kind === 'operational') {
      router.replace(roleHome[access.profile.role]);
      return;
    }
    setLeaving(true);
    setError(undefined);
    try {
      if (access?.kind === 'setup') await signOut();
      router.replace('/auth/login');
    } catch (issue) {
      setError(authMessage(issue));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <AuthPanel title={invite ? 'Activa tu cuenta' : 'Crea una nueva contraseña'}
      description={ready ? 'Elige una contraseña de al menos 8 caracteres.' : 'Usa el enlace que recibiste en tu correo para continuar.'}>
      {checking && <AuthProgress text="Verificando el enlace…" />}
      <AuthMessage message={linkError ?? error} />
      {ready && (
        <>
          <Controller control={control} name="password" render={({ field, fieldState }) => (
            <AuthField label="Nueva contraseña" password value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              textContentType="newPassword" autoComplete="new-password" editable={!isSubmitting && !leaving}
              error={fieldState.error?.message} />
          )} />
          <Controller control={control} name="repeatPassword" render={({ field, fieldState }) => (
            <AuthField label="Repite la contraseña" password value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              textContentType="newPassword" autoComplete="new-password" editable={!isSubmitting && !leaving}
              error={fieldState.error?.message} />
          )} />
          <AuthButton label={isSubmitting ? 'Guardando…' : 'Guardar contraseña'} busy={isSubmitting} disabled={leaving}
            onPress={() => { void submit(); }} />
        </>
      )}
      {!ready && !checking && !invite && access?.kind !== 'operational' && (
        <AuthButton label="Solicitar otro enlace" onPress={() => router.replace('/auth/forgot-password')} />
      )}
      <AuthButton label={access?.kind === 'operational' ? 'Volver a mi inicio' : 'Volver al inicio de sesión'}
        secondary wrapLabel busy={leaving} disabled={isSubmitting || checking} onPress={() => { void back(); }} />
    </AuthPanel>
  );
}

const roleLabels: Record<Role, { title: string; description: string }> = {
  provincial: { title: 'Coordinación provincial', description: 'Tu cuenta está habilitada para la coordinación provincial.' },
  recinto: { title: 'Coordinación de recinto', description: 'Tu cuenta está habilitada para la coordinación de recinto.' },
  veedor: { title: 'Veedor', description: 'Tu cuenta está habilitada para la veeduría electoral.' },
};

export function RoleHomeScreen({ role }: { role: Role }) {
  const access = useAuth((state) => state.access);
  const signOut = useAuth((state) => state.signOut);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!access) return <OpeningScreen />;
  if (access.kind !== 'operational' || access.profile.role !== role) return <Redirect href="/" />;

  const { title, description } = roleLabels[role];
  async function leave() {
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (issue) {
      setError(authMessage(issue));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel title={title} description={description}>
      <AuthMessage message={`Sesión iniciada como ${access.profile.name}.`} success />
      {access.offline && <AuthMessage message="Sin conexión. Se conserva tu sesión en este dispositivo." />}
      <AuthMessage message={error} />
      <AuthButton label={busy ? 'Cerrando sesión…' : 'Cerrar sesión'} busy={busy} onPress={() => { void leave(); }} />
    </AuthPanel>
  );
}
