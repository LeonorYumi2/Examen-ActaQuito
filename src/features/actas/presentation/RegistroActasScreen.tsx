import { zodResolver } from '@hookform/resolvers/zod';
import { randomUUID } from 'expo-crypto';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { BrandColors, FontFamilies, Radii, Spacing } from '@/constants/tokens';
import { AuthButton, AuthField, AuthMessage, AuthPanel, AuthProgress } from '@/features/auth/presentation/AuthForm';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { cargarRecintoCaptura, repositorioActas } from '../data/repositorio-actas';
import { borradoresLocales } from '../data/borradores-locales';
import {
  cargarCatalogoOffline,
  cargarRegistroOffline,
  contarEnviosPendientes,
  detalleSincronizacionBorrador,
  encolarBorradorLocal,
  guardarCapturaLocal,
  reactivarEnvioBorrador,
  suscribirSincronizacionBorrador,
} from '../data/enviar-borrador';
import { type ReferenciaBorrador } from '../domain/enviar-borrador';
import { type BorradorLocal, type EvidenciaActa, type RecintoCaptura } from '../domain/evidencia';
import { CapturaEvidencia } from './components/CapturaEvidencia';
import {
  esquemaActa,
  guardarRegistro,
  ErrorRegistro,
  type Borrador,
  type CamposActa,
  type Candidatura,
  type Dignidad,
  type Mesa,
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
      {access?.kind === 'operational' && (
        <View style={styles.access}>
          <AuthButton label="Registro de actas" secondary onPress={() => router.push('/actas')} />
        </View>
      )}
    </View>
  );
}

export function RegistroActasScreen() {
  const access = useAuth((state) => state.access);
  const params = useLocalSearchParams<{ dignidad?: Dignidad; mesaNumero?: string }>();

  if (!access) return null;
  if (access.kind !== 'operational' || access.profile.role === 'provincial') return <Redirect href="/" />;

  return (
    <Registro
      key={access.profile.id}
      puedeIniciar={access.profile.role === 'veedor'}
      usuario={access.profile.id}
      offline={Boolean(access.offline)}
      paramDignidad={params.dignidad}
      paramMesaNumero={params.mesaNumero}
    />
  );
}

function Registro({
  puedeIniciar,
  usuario,
  offline,
  paramDignidad,
  paramMesaNumero,
}: {
  puedeIniciar: boolean;
  usuario: string;
  offline: boolean;
  paramDignidad?: Dignidad;
  paramMesaNumero?: string;
}) {
  const [mesas, setMesas] = useState<Mesa[]>();
  const [mesa, setMesa] = useState<Mesa>();
  const [dignidad, setDignidad] = useState<Dignidad>();
  const [pendientes, setPendientes] = useState<number>(0);
  const [error, setError] = useState<string>();
  const [intento, setIntento] = useState(0);

  // Cargar contador de transmisiones pendientes
  useEffect(() => {
    void contarEnviosPendientes(usuario).then(setPendientes).catch(() => {});
  }, [usuario, intento]);

  // Cargar mesas (con soporte en línea y catálogo precargado offline)
  useEffect(() => {
    let vigente = true;
    async function obtenerMesas() {
      setError(undefined);
      try {
        if (offline) {
          const catalogo = await cargarCatalogoOffline(usuario);
          if (vigente) {
            if (catalogo && catalogo.mesas.length > 0) {
              setMesas(catalogo.mesas);
            } else {
              setError('No hay un catálogo electoral precargado en este teléfono para operar sin conexión.');
            }
          }
          return;
        }

        try {
          const datos = await repositorioActas.listarMesas();
          if (vigente) setMesas(datos);
        } catch (err) {
          // Si la consulta en línea falla, recurrir al catálogo offline
          const catalogo = await cargarCatalogoOffline(usuario);
          if (vigente) {
            if (catalogo && catalogo.mesas.length > 0) {
              setMesas(catalogo.mesas);
            } else {
              setError(mensaje(err));
            }
          }
        }
      } catch (problema) {
        if (vigente) setError(mensaje(problema));
      }
    }

    void obtenerMesas();
    return () => {
      vigente = false;
    };
  }, [intento, offline, usuario]);

  // Selección automática si se recibieron parámetros de navegación
  useEffect(() => {
    if (mesas && paramMesaNumero && !mesa) {
      const encontrada = mesas.find((m) => m.numero === Number(paramMesaNumero));
      if (encontrada) {
        setMesa(encontrada);
        if (paramDignidad && (paramDignidad === 'ALCALDIA' || paramDignidad === 'PREFECTURA')) {
          setDignidad(paramDignidad);
        }
      }
    }
  }, [mesas, paramMesaNumero, paramDignidad, mesa]);

  if (mesa && dignidad) {
    return (
      <Acta
        mesa={mesa}
        dignidad={dignidad}
        puedeIniciar={puedeIniciar}
        usuario={usuario}
        volver={() => setDignidad(undefined)}
      />
    );
  }

  if (mesa) {
    return (
      <AuthPanel
        title="Elige la dignidad"
        description={`${mesa.nombre} · JRV ${String(mesa.numero).padStart(3, '0')}`}
      >
        {pendientes > 0 && (
          <AuthMessage
            message={`${pendientes} acta(s) en cola local de salida pendiente(s) de transmisión.`}
          />
        )}
        <AuthButton label={dignidades.ALCALDIA} onPress={() => setDignidad('ALCALDIA')} />
        <AuthButton label={dignidades.PREFECTURA} onPress={() => setDignidad('PREFECTURA')} />
        <AuthButton label="Cambiar de mesa" secondary onPress={() => setMesa(undefined)} />
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Actas electorales" description="Selecciona una junta receptora para abrir su acta.">
      {pendientes > 0 && (
        <AuthMessage
          message={`${pendientes} acta(s) en cola local de salida pendiente(s) de transmisión.`}
        />
      )}
      {!mesas && !error && <AuthProgress text="Cargando mesas…" />}
      <AuthMessage message={error ?? (mesas?.length === 0 ? 'No tienes mesas disponibles.' : null)} />
      {error && (
        <AuthButton
          label="Reintentar"
          onPress={() => {
            setError(undefined);
            setIntento((prev) => prev + 1);
          }}
        />
      )}
      {mesas?.map((item) => (
        <AuthButton
          key={`${item.recinto}/${item.numero}`}
          label={`${item.nombre} · JRV ${String(item.numero).padStart(3, '0')}`}
          secondary
          onPress={() => setMesa(item)}
        />
      ))}
      <AuthButton label="Volver a mi inicio" secondary onPress={() => router.replace('/')} />
    </AuthPanel>
  );
}

function Acta({
  mesa,
  dignidad,
  puedeIniciar,
  usuario,
  volver,
}: {
  mesa: Mesa;
  dignidad: Dignidad;
  puedeIniciar: boolean;
  usuario: string;
  volver: () => void;
}) {
  const usuarioLocal = puedeIniciar && Platform.OS !== 'web' ? usuario : undefined;
  const [datos, setDatos] = useState<{
    candidaturas: Candidatura[];
    borrador: Borrador | null;
    local: BorradorLocal | null;
    recinto?: RecintoCaptura;
  }>();
  const [error, setError] = useState<string>();
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      setError(undefined);
      try {
        if (usuarioLocal) {
          // Intentar primero desde el catálogo y almacenamiento offline
          const off = await cargarRegistroOffline({ usuario: usuarioLocal, mesa, dignidad });
          if (off && vigente) {
            setDatos({
              candidaturas: off.candidaturas,
              borrador: off.acta
                ? { id: off.acta.id, version: off.acta.version, cifras: off.acta.cifras }
                : null,
              local: off.borrador,
              recinto: off.recinto,
            });
            return;
          }
        }

        // Carga estándar con fallback
        const [resultado, local, recinto] = await Promise.all([
          repositorioActas.cargar(mesa, dignidad),
          usuarioLocal ? borradoresLocales.cargar(usuarioLocal, mesa, dignidad) : null,
          usuarioLocal ? cargarRecintoCaptura(mesa).catch(() => undefined) : undefined,
        ]);
        if (vigente) setDatos({ ...resultado, local, recinto });
      } catch (problema: unknown) {
        // En caso de falla de red, intentar rescate offline
        if (usuarioLocal) {
          try {
            const off = await cargarRegistroOffline({ usuario: usuarioLocal, mesa, dignidad });
            if (off && vigente) {
              setDatos({
                candidaturas: off.candidaturas,
                borrador: off.acta
                  ? { id: off.acta.id, version: off.acta.version, cifras: off.acta.cifras }
                  : null,
                local: off.borrador,
                recinto: off.recinto,
              });
              return;
            }
          } catch {
            // Continúa para reportar error original
          }
        }
        if (vigente) setError(mensaje(problema));
      }
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [mesa, dignidad, intento, usuarioLocal]);

  return (
    <AuthPanel
      title={dignidades[dignidad]}
      description={`${mesa.nombre} · JRV ${String(mesa.numero).padStart(3, '0')}`}
    >
      {!datos && !error && <AuthProgress text="Cargando borrador…" />}
      <AuthMessage message={error} />
      {error && (
        <AuthButton
          label="Reintentar"
          onPress={() => {
            setError(undefined);
            setIntento((prev) => prev + 1);
          }}
        />
      )}
      {datos && puedeIniciar && !usuarioLocal && (
        <AuthMessage message="La captura de actas requiere la aplicación móvil." />
      )}
      {datos &&
        (usuarioLocal || (!puedeIniciar && datos.borrador) ? (
          <FormularioActa
            mesa={mesa}
            dignidad={dignidad}
            candidaturas={datos.candidaturas}
            borrador={datos.borrador}
            usuarioLocal={usuarioLocal}
            local={datos.local}
            recinto={datos.recinto}
            volver={volver}
          />
        ) : (
          !puedeIniciar && <AuthMessage message="Aún no hay un borrador del veedor para esta mesa y dignidad." />
        ))}
      {(!datos || (puedeIniciar ? !usuarioLocal : !datos.borrador)) && (
        <AuthButton label="Volver" secondary onPress={volver} />
      )}
    </AuthPanel>
  );
}

function FormularioActa({
  mesa,
  dignidad,
  candidaturas,
  borrador,
  usuarioLocal,
  local,
  recinto,
  volver,
}: {
  mesa: Mesa;
  dignidad: Dignidad;
  candidaturas: Candidatura[];
  borrador: Borrador | null;
  volver: () => void;
  usuarioLocal?: string;
  local: BorradorLocal | null;
  recinto?: RecintoCaptura;
}) {
  const siglas = useMemo(() => candidaturas.map((c) => c.sigla), [candidaturas]);
  const esquema = useMemo(() => esquemaActa(siglas), [siglas]);
  const id = useRef<string>(local?.id ?? borrador?.id ?? '');
  const intentoServidor = useRef<{ huella: string; operacion: string } | null>(null);
  const guardandoRef = useRef(false);
  const enviandoRef = useRef(false);

  const [evidencia, setEvidencia] = useState<EvidenciaActa>({
    foto: local?.foto,
    ubicacion: local?.ubicacion,
  });
  const [capturando, setCapturando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [version, setVersion] = useState(borrador?.version);
  const [error, setError] = useState<string>();
  const [confirmado, setConfirmado] = useState(false);
  const [estadoSync, setEstadoSync] = useState<{ estado: string; detalle?: string } | null>(null);

  const referencia: ReferenciaBorrador = useMemo(
    () => ({ usuario: usuarioLocal ?? '', mesa, dignidad }),
    [usuarioLocal, mesa, dignidad]
  );

  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<CamposActa>({
    resolver: zodResolver(esquema),
    mode: 'onChange',
    defaultValues: local?.campos ?? {
      votos: Object.fromEntries(
        siglas.map((sigla) => [sigla, borrador ? String(borrador.cifras.votos[sigla]) : ''])
      ),
      blancos: borrador ? String(borrador.cifras.blancos) : '',
      nulos: borrador ? String(borrador.cifras.nulos) : '',
      sufragantes: borrador ? String(borrador.cifras.sufragantes) : '',
    },
  });

  // Consultar y suscribirse al estado del outbox local
  useEffect(() => {
    if (!usuarioLocal) return;
    let activo = true;

    const actualizarEstado = async () => {
      try {
        const detalle = await detalleSincronizacionBorrador(referencia);
        if (activo) {
          if (detalle) {
            setEstadoSync({ estado: detalle.estado, detalle: detalle.codigo });
          } else {
            setEstadoSync(null);
          }
        }
      } catch {
        // Ignora fallos de lectura de estado
      }
    };

    void actualizarEstado();
    const cancelar = suscribirSincronizacionBorrador(referencia, () => {
      void actualizarEstado();
    });

    return () => {
      activo = false;
      cancelar();
    };
  }, [referencia, usuarioLocal]);

  // Guardar avances locales (sin exigir evidencia completa aún)
  async function guardarBorrador(campos: CamposActa) {
    if (guardandoRef.current || enviandoRef.current || capturando) return;
    guardandoRef.current = true;
    setError(undefined);
    setConfirmado(false);

    try {
      if (usuarioLocal) {
        if (!id.current) id.current = randomUUID();
        await guardarCapturaLocal(referencia, {
          ...evidencia,
          id: id.current,
          campos,
        });
        setConfirmado(true);
        return;
      }

      // Vía en línea para otros roles o navegadores
      const huella = JSON.stringify(campos);
      if (!id.current) id.current = randomUUID();
      if (intentoServidor.current?.huella !== huella) {
        intentoServidor.current = { huella, operacion: randomUUID() };
      }
      setVersion(
        await guardarRegistro(
          repositorioActas,
          { id: id.current, operacion: intentoServidor.current.operacion, mesa, dignidad },
          campos,
          siglas
        )
      );
      intentoServidor.current = null;
      setConfirmado(true);
    } catch (problema) {
      setError(mensaje(problema));
    } finally {
      guardandoRef.current = false;
    }
  }

  // Solicitar transmisión oficial del acta (exige foto nítida y GPS válido)
  async function solicitarEnvio(campos: CamposActa) {
    if (enviandoRef.current || guardandoRef.current || capturando) return;
    setError(undefined);
    setConfirmado(false);

    // 1. Validación estricta de evidencia fotográfica
    if (!evidencia.foto?.jpegBase64) {
      setError('Debes tomar la fotografía del acta antes de solicitar el envío.');
      return;
    }

    // 2. Validación estricta de geolocalización
    const ubicacion = evidencia.ubicacion;
    if (
      !ubicacion ||
      (ubicacion.resultado !== 'dentro' && ubicacion.resultado !== 'fuera') ||
      !Number.isFinite(ubicacion.precisionMetros) ||
      ubicacion.precisionMetros <= 0
    ) {
      setError('Debes medir una ubicación GPS válida dentro o en el margen del recinto antes de enviar.');
      return;
    }

    if (!usuarioLocal) {
      setError('La transmisión de evidencias requiere la aplicación móvil.');
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);

    try {
      if (!id.current) id.current = randomUUID();
      // Guardar instantánea local más reciente
      await guardarCapturaLocal(referencia, {
        ...evidencia,
        id: id.current,
        campos,
      });

      // Encolar en el outbox con control de idempotencia
      const control = await encolarBorradorLocal(referencia, siglas);
      setEstadoSync({ estado: control.estado, detalle: control.codigo });
      setConfirmado(true);
    } catch (problema) {
      setError(mensaje(problema));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  // Auto-guardado en SQLite al actualizar evidencia (foto o GPS)
  const handleEvidenciaChange = async (nueva: EvidenciaActa) => {
    setEvidencia(nueva);
    setConfirmado(false);
    if (usuarioLocal) {
      if (!id.current) id.current = randomUUID();
      const camposActuales = getValues();
      await guardarCapturaLocal(referencia, {
        ...nueva,
        id: id.current,
        campos: camposActuales,
      }).catch(() => {});
    }
  };

  const handleReactivar = async () => {
    setError(undefined);
    try {
      await reactivarEnvioBorrador(referencia);
      const det = await detalleSincronizacionBorrador(referencia);
      if (det) setEstadoSync({ estado: det.estado, detalle: det.codigo });
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo reactivar el envío.');
    }
  };

  const campos: { nombre: FieldPath<CamposActa>; etiqueta: string }[] = [
    ...candidaturas.map((c): { nombre: FieldPath<CamposActa>; etiqueta: string } => ({
      nombre: `votos.${c.sigla}`,
      etiqueta: `${c.sigla} · ${c.candidato} · ${c.organizacion}`,
    })),
    { nombre: 'nulos', etiqueta: 'Votos nulos' },
    { nombre: 'blancos', etiqueta: 'Votos en blanco' },
    { nombre: 'sufragantes', etiqueta: 'Total de sufragantes' },
  ];

  const estaSincronizado = estadoSync?.estado === 'sincronizado';
  const estaSincronizando = estadoSync?.estado === 'sincronizando' || enviando;
  const requiereIntervencion = estadoSync?.estado === 'requiere-intervencion';

  return (
    <>
      {/* Banner de Estado de Sincronización Real */}
      {estadoSync ? (
        estaSincronizado ? (
          <AuthMessage success message="Acta y evidencia sincronizadas con éxito en el servidor." />
        ) : estaSincronizando ? (
          <AuthMessage message="Sincronizando evidencia con el servidor en segundo plano…" />
        ) : requiereIntervencion ? (
          <View style={styles.intervencionContainer}>
            <AuthMessage
              message={`Se requiere intervención: ${
                estadoSync.detalle === 'sesion'
                  ? 'Sesión expirada. Inicia sesión nuevamente.'
                  : 'Intentos agotados. Verifica tu conexión.'
              }`}
            />
            <TouchableOpacity style={styles.retryButton} onPress={() => void handleReactivar()} activeOpacity={0.8}>
              <RotateCcw size={14} color={BrandColors.blancoSuperficie} />
              <Text style={styles.retryButtonText}>Reintentar sincronización</Text>
            </TouchableOpacity>
          </View>
        ) : estadoSync.estado === 'rechazado' ? (
          <AuthMessage message="El envío fue rechazado por el servidor. Revisa las cifras y la evidencia." />
        ) : (
          <AuthMessage message="Acta encolada en este teléfono · Pendiente de sincronización automática." />
        )
      ) : (
        <AuthMessage message="Borrador en edición." />
      )}

      {error ? <AuthMessage message={error} /> : null}
      {errors.votos?.root?.message ? <AuthMessage message={errors.votos.root.message} /> : null}

      {confirmado && !error && (
        <AuthMessage
          success
          message={
            usuarioLocal
              ? estadoSync
                ? 'Acta encolada para transmisión.'
                : 'Borrador guardado en este teléfono.'
              : `Borrador guardado · versión ${version}.`
          }
        />
      )}

      {campos.map(({ nombre, etiqueta }) => (
        <Controller
          key={nombre}
          control={control}
          name={nombre}
          render={({ field, fieldState }) => (
            <AuthField
              label={etiqueta}
              value={typeof field.value === 'string' ? field.value : ''}
              onChangeText={(valor) => {
                setConfirmado(false);
                field.onChange(valor);
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              editable={!isSubmitting && !enviando}
              error={fieldState.error?.message}
            />
          )}
        />
      ))}

      {usuarioLocal && (
        <CapturaEvidencia
          recinto={recinto}
          evidencia={evidencia}
          disabled={isSubmitting || enviando}
          onBusy={setCapturando}
          onChange={(nueva) => void handleEvidenciaChange(nueva)}
        />
      )}

      {/* Botón Principal: Enviar Acta Oficial */}
      {usuarioLocal && (
        <AuthButton
          label={enviando ? 'Encolando envío…' : estaSincronizado ? 'Acta transmitida' : 'Enviar acta electoral'}
          disabled={capturando || isSubmitting || enviando || estaSincronizado}
          busy={enviando}
          onPress={() => {
            void handleSubmit(solicitarEnvio)();
          }}
        />
      )}

      {/* Botón Secundario: Guardar Borrador Parcial */}
      <AuthButton
        disabled={capturando || enviando || isSubmitting}
        label={isSubmitting ? 'Guardando…' : 'Guardar borrador local'}
        secondary
        busy={isSubmitting}
        onPress={() => {
          void handleSubmit(guardarBorrador)();
        }}
      />

      <AuthButton label="Volver" secondary disabled={isSubmitting || capturando || enviando} onPress={volver} />
    </>
  );
}

const styles = StyleSheet.create({
  portal: { flex: 1 },
  access: { padding: Spacing.md },
  intervencionContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  retryButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.blancoSuperficie,
  },
});
