import { zodResolver } from '@hookform/resolvers/zod';
import { randomUUID } from 'expo-crypto';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';
import { AuthButton, AuthField, AuthMessage, AuthPanel, AuthProgress } from '@/features/auth/presentation/AuthForm';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { cargarRecintoCaptura, repositorioActas } from '../data/repositorio-actas';
import { borradoresLocales } from '../data/borradores-locales';
import { guardarBorradorLocal, type BorradorLocal, type EvidenciaActa, type RecintoCaptura } from '../domain/evidencia';
import { CapturaEvidencia } from './components/CapturaEvidencia';
import {
  esquemaActa, guardarRegistro, ErrorRegistro, type Borrador, type CamposActa, type Candidatura, type Dignidad, type Mesa,
} from '../domain/registro';

const dignidades = { ALCALDIA: 'Alcaldía', PREFECTURA: 'Prefectura' } as const;

function mensaje(error: unknown) {
  return error instanceof ErrorRegistro ? error.message : 'No pudimos completar la operación. Inténtalo de nuevo.';
}

export function AccesoRegistroActas({ children }: { children: ReactNode }) {
  const access = useAuth((state) => state.access);
  return (
    <View style={styles.portal}>
      {children}
      {access?.kind === 'operational' && !access.offline && (
        <View style={styles.access}>
          <AuthButton label="Registro de actas" secondary onPress={() => router.push('/actas')} />
        </View>
      )}
    </View>
  );
}

export function RegistroActasScreen() {
  const access = useAuth((state) => state.access);
  if (!access) return null;
  if (access.kind !== 'operational' || access.profile.role === 'provincial') return <Redirect href="/" />;
  if (access.offline) {
    return <AuthPanel title="Actas electorales" description="Este registro necesita conexión.">
      <AuthButton label="Volver" secondary onPress={() => router.replace('/')} />
    </AuthPanel>;
  }
  return <Registro key={access.profile.id} puedeIniciar={access.profile.role === 'veedor'} usuario={access.profile.id} />;
}

function Registro({ puedeIniciar, usuario }: { puedeIniciar: boolean; usuario: string }) {
  const [mesas, setMesas] = useState<Mesa[]>();
  const [mesa, setMesa] = useState<Mesa>();
  const [dignidad, setDignidad] = useState<Dignidad>();
  const [error, setError] = useState<string>();
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    repositorioActas.listarMesas().then((datos) => {
      if (vigente) setMesas(datos);
    }).catch((problema: unknown) => {
      if (vigente) setError(mensaje(problema));
    });
    return () => { vigente = false; };
  }, [intento]);

  if (mesa && dignidad) {
    return <Acta mesa={mesa} dignidad={dignidad} puedeIniciar={puedeIniciar} usuario={usuario} volver={() => setDignidad(undefined)} />;
  }
  if (mesa) {
    return <AuthPanel title="Elige la dignidad" description={`${mesa.nombre} · JRV ${String(mesa.numero).padStart(3, '0')}`}>
      <AuthButton label={dignidades.ALCALDIA} onPress={() => setDignidad('ALCALDIA')} />
      <AuthButton label={dignidades.PREFECTURA} onPress={() => setDignidad('PREFECTURA')} />
      <AuthButton label="Cambiar de mesa" secondary onPress={() => setMesa(undefined)} />
    </AuthPanel>;
  }
  return (
    <AuthPanel title="Actas electorales" description="Selecciona una mesa para abrir un borrador.">
      {!mesas && !error && <AuthProgress text="Cargando mesas…" />}
      <AuthMessage message={error ?? (mesas?.length === 0 ? 'No tienes mesas disponibles.' : null)} />
      {error && <AuthButton label="Reintentar" onPress={() => { setError(undefined); setIntento(intento + 1); }} />}
      {mesas?.map((item) => (
        <AuthButton key={`${item.recinto}/${item.numero}`} label={`${item.nombre} · JRV ${String(item.numero).padStart(3, '0')}`}
          secondary onPress={() => setMesa(item)} />
      ))}
      <AuthButton label="Volver a mi inicio" secondary onPress={() => router.replace('/')} />
    </AuthPanel>
  );
}

function Acta({ mesa, dignidad, puedeIniciar, usuario, volver }: {
  mesa: Mesa; dignidad: Dignidad; puedeIniciar: boolean; usuario: string; volver: () => void;
}) {
  const usuarioLocal = puedeIniciar && Platform.OS !== 'web' ? usuario : undefined;
  const [datos, setDatos] = useState<{
    candidaturas: Candidatura[]; borrador: Borrador | null; local: BorradorLocal | null; recinto?: RecintoCaptura;
  }>();
  const [error, setError] = useState<string>();
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    Promise.all([
      repositorioActas.cargar(mesa, dignidad),
      usuarioLocal ? borradoresLocales.cargar(usuarioLocal, mesa, dignidad) : null,
      usuarioLocal ? cargarRecintoCaptura(mesa).catch(() => undefined) : undefined,
    ]).then(([resultado, local, recinto]) => {
      if (vigente) setDatos({ ...resultado, local, recinto });
    }).catch((problema: unknown) => {
      if (vigente) setError(mensaje(problema));
    });
    return () => { vigente = false; };
  }, [mesa, dignidad, intento, usuarioLocal]);

  return (
    <AuthPanel title={dignidades[dignidad]} description={`${mesa.nombre} · JRV ${String(mesa.numero).padStart(3, '0')}`}>
      {!datos && !error && <AuthProgress text="Cargando borrador…" />}
      <AuthMessage message={error} />
      {error && <AuthButton label="Reintentar" onPress={() => { setError(undefined); setIntento(intento + 1); }} />}
      {datos && puedeIniciar && !usuarioLocal && <AuthMessage message="La captura de actas requiere la aplicación móvil." />}
      {datos && (usuarioLocal || (!puedeIniciar && datos.borrador)
        ? <FormularioActa mesa={mesa} dignidad={dignidad} candidaturas={datos.candidaturas} borrador={datos.borrador}
            usuarioLocal={usuarioLocal} local={datos.local} recinto={datos.recinto} volver={volver} />
        : !puedeIniciar && <AuthMessage message="Aún no hay un borrador del veedor para esta mesa y dignidad." />)}
      {(!datos || (puedeIniciar ? !usuarioLocal : !datos.borrador)) && <AuthButton label="Volver" secondary onPress={volver} />}
    </AuthPanel>
  );
}

function FormularioActa({ mesa, dignidad, candidaturas, borrador, usuarioLocal, local, recinto, volver }: {
  mesa: Mesa; dignidad: Dignidad; candidaturas: Candidatura[]; borrador: Borrador | null; volver: () => void;
  usuarioLocal?: string; local: BorradorLocal | null; recinto?: RecintoCaptura;
}) {
  const siglas = useMemo(() => candidaturas.map((c) => c.sigla), [candidaturas]);
  const esquema = useMemo(() => esquemaActa(siglas), [siglas]);
  const id = useRef<string>(local?.id ?? borrador?.id ?? '');
  const intento = useRef<{ huella: string; operacion: string } | null>(null);
  const guardando = useRef(false);
  const [evidencia, setEvidencia] = useState<EvidenciaActa>({ foto: local?.foto, ubicacion: local?.ubicacion });
  const [capturando, setCapturando] = useState(false);
  const [version, setVersion] = useState(borrador?.version);
  const [error, setError] = useState<string>();
  const [confirmado, setConfirmado] = useState(false);
  const { control, handleSubmit, formState: { isSubmitting, errors } } = useForm<CamposActa>({
    resolver: zodResolver(esquema),
    mode: 'onChange',
    defaultValues: local?.campos ?? {
      votos: Object.fromEntries(siglas.map((sigla) => [sigla, borrador ? String(borrador.cifras.votos[sigla]) : ''])),
      blancos: borrador ? String(borrador.cifras.blancos) : '',
      nulos: borrador ? String(borrador.cifras.nulos) : '',
      sufragantes: borrador ? String(borrador.cifras.sufragantes) : '',
    },
  });
  async function guardar(campos: CamposActa) {
    if (guardando.current || capturando) return;
    guardando.current = true;
    setError(undefined);
    setConfirmado(false);
    try {
      if (usuarioLocal) {
        if (!id.current) id.current = randomUUID();
        await guardarBorradorLocal(borradoresLocales, usuarioLocal, mesa, dignidad, {
          ...evidencia, id: id.current, campos,
        }, siglas);
        setConfirmado(true);
        return;
      }
      const huella = JSON.stringify(campos);
      if (!id.current) id.current = randomUUID();
      if (intento.current?.huella !== huella) intento.current = { huella, operacion: randomUUID() };
      setVersion(await guardarRegistro(repositorioActas, {
        id: id.current, operacion: intento.current.operacion, mesa, dignidad,
      }, campos, siglas));
      intento.current = null;
      setConfirmado(true);
    } catch (problema) {
      setError(mensaje(problema));
    } finally {
      guardando.current = false;
    }
  }
  const campos: { nombre: FieldPath<CamposActa>; etiqueta: string }[] = [
    ...candidaturas.map((c): { nombre: FieldPath<CamposActa>; etiqueta: string } => ({
      nombre: `votos.${c.sigla}`, etiqueta: `${c.sigla} · ${c.candidato} · ${c.organizacion}`,
    })),
    { nombre: 'nulos', etiqueta: 'Votos nulos' },
    { nombre: 'blancos', etiqueta: 'Votos en blanco' },
    { nombre: 'sufragantes', etiqueta: 'Total de sufragantes' },
  ];
  return (
    <>
      <AuthMessage message="Borrador sin enviar." />
      <AuthMessage message={error ?? errors.votos?.root?.message} />
      {confirmado && <AuthMessage success message={usuarioLocal ? "Borrador guardado en este teléfono. Pendiente de envío." : `Borrador guardado · versión ${version}.`} />}
      {campos.map(({ nombre, etiqueta }) => (
        <Controller key={nombre} control={control} name={nombre} render={({ field, fieldState }) => (
          <AuthField label={etiqueta} value={typeof field.value === 'string' ? field.value : ''}
            onChangeText={(valor) => { setConfirmado(false); field.onChange(valor); }} onBlur={field.onBlur}
            keyboardType="number-pad" editable={!isSubmitting} error={fieldState.error?.message} />
        )} />
      ))}
      {usuarioLocal && <CapturaEvidencia recinto={recinto} evidencia={evidencia} disabled={isSubmitting}
        onBusy={setCapturando} onChange={(nueva) => { setEvidencia(nueva); setConfirmado(false); }} />}
      <AuthButton disabled={capturando} label={isSubmitting ? 'Guardando…' : 'Guardar borrador'} busy={isSubmitting} onPress={() => { void handleSubmit(guardar)(); }} />
      <AuthButton label="Volver" secondary disabled={isSubmitting || capturando} onPress={volver} />
    </>
  );
}

const styles = StyleSheet.create({
  portal: { flex: 1 },
  access: { padding: 16 },
});
