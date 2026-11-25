import { zodResolver } from '@hookform/resolvers/zod';
import { randomUUID } from 'expo-crypto';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  RotateCcw,
  Clock,
  Building2,
  Vote,
  Users,
  History,
  ShieldAlert,
  MapPin,
} from 'lucide-react-native';
import {
  BrandColors,
  FontFamilies,
  Radii,
  Spacing,
  PoliticalParties,
} from '@/constants/tokens';
import { EditorialLottie } from '@/components/ui/editorial-lottie';
import { AuthButton, AuthField, AuthMessage, AuthPanel, AuthProgress } from '@/features/auth/presentation/AuthForm';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { cargarRecintoCaptura, repositorioActas } from '../data/repositorio-actas';
import { borradoresLocales } from '../data/borradores-locales';
import { capturarGpsCorreccion } from '../data/captura-nativa';
import {
  cargarCatalogoOffline,
  cargarRegistroOffline,
  contarEnviosPendientes,
  detalleSincronizacionBorrador,
  encolarBorradorLocal,
  encolarCorreccionActa,
  estadoCorreccionActa,
  guardarCapturaLocal,
  reactivarEnvioBorrador,
  suscribirSincronizacionBorrador,
} from '../data/enviar-borrador';
import { type ReferenciaBorrador } from '../domain/enviar-borrador';
import { type BorradorLocal, type EvidenciaActa, type RecintoCaptura } from '../domain/evidencia';
import { CapturaEvidencia } from './components/CapturaEvidencia';
import { DetalleActaModal } from './components/DetalleActaModal';
import {
  esquemaActa,
  guardarRegistro,
  leerCifras,
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
            usuario={usuario}
            puedeIniciar={puedeIniciar}
            local={datos.local}
            recinto={datos.recinto}
            volver={volver}
          />
        ) : (
          !puedeIniciar && (
            <EstadoVacioCoordinador
              mesa={mesa}
              dignidad={dignidad}
              volver={volver}
            />
          )
        ))}
      {(!datos || (puedeIniciar && !usuarioLocal)) && (
        <AuthButton label="Volver" secondary onPress={volver} />
      )}
    </AuthPanel>
  );
}

function EstadoVacioCoordinador({
  mesa,
  dignidad,
  volver,
}: {
  mesa: Mesa;
  dignidad: Dignidad;
  volver: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconBox}>
        <Clock size={28} color={BrandColors.azulTitulos} />
      </View>
      <Text style={styles.emptyTitle}>
        Todavía no se ha registrado el acta de {dignidades[dignidad]} para esta mesa
      </Text>

      <View style={styles.emptyPillsRow}>
        <View style={styles.emptyPill}>
          <Building2 size={12} color={BrandColors.azulTitulos} />
          <Text style={styles.emptyPillText}>{mesa.nombre}</Text>
        </View>
        <View style={styles.emptyPill}>
          <Vote size={12} color={BrandColors.azulTitulos} />
          <Text style={styles.emptyPillText}>JRV #{String(mesa.numero).padStart(3, '0')}</Text>
        </View>
        <View style={styles.emptyPill}>
          <Text style={styles.emptyPillText}>{dignidades[dignidad]}</Text>
        </View>
      </View>

      <Text style={styles.emptyDesc}>
        El veedor asignado a esta junta receptora aún no ha iniciado el registro preliminar de cifras ni capturado la fotografía reglamentaria. Esta sección se habilitará automáticamente para revisión y supervisión una vez que el veedor transmita el borrador inicial.
      </Text>

      <View style={styles.emptyActions}>
        <AuthButton label="Volver a mis mesas" secondary onPress={volver} />
        <TouchableOpacity
          style={styles.veedoresLinkButton}
          onPress={() => router.push('/recinto/veedores')}
          activeOpacity={0.8}
        >
          <Users size={14} color={BrandColors.azulTitulos} />
          <Text style={styles.veedoresLinkButtonText}>Gestionar Veedores del Recinto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FormularioActa({
  mesa,
  dignidad,
  candidaturas,
  borrador,
  usuarioLocal,
  usuario,
  puedeIniciar,
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
  usuario: string;
  puedeIniciar: boolean;
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

  // Estados para corrección con GPS e historial
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [modalCorreccion, setModalCorreccion] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [gpsMensaje, setGpsMensaje] = useState<string | null>(null);
  const [camposParaCorregir, setCamposParaCorregir] = useState<CamposActa | null>(null);

  const referencia: ReferenciaBorrador = useMemo(
    () => ({ usuario: usuarioLocal ?? usuario, mesa, dignidad }),
    [usuarioLocal, usuario, mesa, dignidad]
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
    let activo = true;

    const actualizarEstado = async () => {
      try {
        const detalle = await detalleSincronizacionBorrador(referencia);
        if (activo) {
          if (detalle) {
            setEstadoSync({ estado: detalle.estado, detalle: detalle.codigo });
          } else {
            // Verificar si hay una corrección encolada
            const estadoCorr = await estadoCorreccionActa(referencia).catch(() => null);
            if (activo && estadoCorr) {
              setEstadoSync({ estado: estadoCorr.estado, detalle: estadoCorr.codigo });
            } else if (activo) {
              setEstadoSync(null);
            }
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
  }, [referencia]);

  // Guardar avances locales del veedor
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

  // Solicitar transmisión oficial del acta por veedor (exige foto nítida y GPS válido)
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
      await guardarCapturaLocal(referencia, {
        ...evidencia,
        id: id.current,
        campos,
      });

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

  // Preparar corrección auditada por parte del coordinador
  function solicitarCorreccion(campos: CamposActa) {
    setError(undefined);
    setConfirmado(false);

    if (!borrador) {
      setError('No existe un acta base registrada para corregir.');
      return;
    }

    // Verificar si realmente cambiaron cifras
    const cifrasNuevas = leerCifras(campos);
    const votosIguales = Object.entries(cifrasNuevas.votos).every(
      ([sigla, val]) => borrador.cifras.votos[sigla] === val
    );
    const esIgual =
      votosIguales &&
      cifrasNuevas.blancos === borrador.cifras.blancos &&
      cifrasNuevas.nulos === borrador.cifras.nulos &&
      cifrasNuevas.sufragantes === borrador.cifras.sufragantes;

    if (esIgual) {
      setError('No has modificado ninguna cifra. Realiza un cambio en los votos antes de solicitar la corrección.');
      return;
    }

    setCamposParaCorregir(campos);
    setModalCorreccion(true);
  }

  // Confirmar y ejecutar corrección con GPS obligatorio (RF-12)
  async function confirmarCorreccionConGps() {
    if (!camposParaCorregir || !borrador) return;
    setCorrigiendo(true);
    setGpsMensaje('Midiendo geolocalización GPS con alta precisión…');
    setError(undefined);

    try {
      const ubicacionGps = await capturarGpsCorreccion();
      setGpsMensaje('Encolando corrección auditada con firma de recinto…');
      const control = await encolarCorreccionActa(
        referencia,
        borrador.id,
        camposParaCorregir,
        siglas,
        ubicacionGps
      );
      setModalCorreccion(false);
      setConfirmado(true);
      setEstadoSync({ estado: control.estado, detalle: control.codigo });
    } catch (problema: any) {
      setModalCorreccion(false);
      setError(mensaje(problema));
    } finally {
      setCorrigiendo(false);
      setGpsMensaje(null);
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

  const estaSincronizado = estadoSync?.estado === 'sincronizado';
  const estaSincronizando = estadoSync?.estado === 'sincronizando' || enviando || corrigiendo;
  const requiereIntervencion = estadoSync?.estado === 'requiere-intervencion';

  return (
    <>
      {/* Banner de Modo Supervisor si no es veedor */}
      {!puedeIniciar && (
        <View style={styles.supervisorBanner}>
          <ShieldAlert size={14} color={BrandColors.azulTitulos} />
          <Text style={styles.supervisorBannerText}>
            Modo Supervisión y Corrección · JRV #{String(mesa.numero).padStart(3, '0')}
          </Text>
        </View>
      )}

      {/* Botón de Historial y Evidencia */}
      {borrador?.id ? (
        <TouchableOpacity
          style={styles.historyLinkButton}
          onPress={() => setMostrarDetalle(true)}
          activeOpacity={0.8}
        >
          <History size={15} color={BrandColors.azulTitulos} />
          <Text style={styles.historyLinkButtonText}>Consultar Historial y Evidencia Fotográfica</Text>
        </TouchableOpacity>
      ) : null}

      {/* Banner de Estado de Sincronización Real */}
      {estadoSync ? (
        estaSincronizado ? (
          <AuthMessage success message="Acta y evidencia sincronizadas con éxito en el servidor." />
        ) : estaSincronizando ? (
          <AuthMessage message={gpsMensaje ?? "Sincronizando con el servidor en segundo plano…"} />
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
          <AuthMessage message="La operación fue rechazada por el servidor. Revisa las cifras y autorizaciones." />
        ) : (
          <AuthMessage message="Operación encolada en este teléfono · Pendiente de sincronización automática." />
        )
      ) : (
        <AuthMessage message={puedeIniciar ? "Borrador en edición." : "Revisión de cifras registradas."} />
      )}

      {error ? <AuthMessage message={error} /> : null}
      {errors.votos?.root?.message ? <AuthMessage message={errors.votos.root.message} /> : null}

      {confirmado && !error && (
        <AuthMessage
          success
          message={
            !puedeIniciar
              ? 'Corrección encolada y asegurada con geolocalización GPS.'
              : usuarioLocal
              ? estadoSync
                ? 'Acta encolada para transmisión.'
                : 'Borrador guardado en este teléfono.'
              : `Borrador guardado · versión ${version}.`
          }
        />
      )}

      {/* Listado de Candidaturas con Identidad Visual y Colores (Fase 1) */}
      <View style={styles.candidaturasContainer}>
        <Text style={styles.candidaturasTitle}>Votación por Organización Política</Text>
        {candidaturas.map((c) => {
          const party = (PoliticalParties as any)[c.sigla];
          const partyColor = party?.color ?? BrandColors.azulPrincipal;

          return (
            <View key={c.sigla} style={styles.candidateFieldCard}>
              <View style={styles.candidateHeader}>
                <View style={[styles.partyColorPill, { backgroundColor: partyColor }]}>
                  <Text style={styles.partySiglaBadge}>{c.sigla}</Text>
                </View>
                <View style={styles.candidateInfo}>
                  <Text style={styles.candidateName}>{c.candidato}</Text>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {c.organizacion}
                  </Text>
                </View>
              </View>

              <Controller
                control={control}
                name={`votos.${c.sigla}` as FieldPath<CamposActa>}
                render={({ field, fieldState }) => (
                  <AuthField
                    label={`Votos para ${c.sigla}`}
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChangeText={(valor) => {
                      setConfirmado(false);
                      field.onChange(valor);
                    }}
                    onBlur={field.onBlur}
                    keyboardType="number-pad"
                    editable={!isSubmitting && !enviando && !corrigiendo}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          );
        })}
      </View>

      {/* Totales y Escrutinio General */}
      <View style={styles.totalsGroupCard}>
        <Text style={styles.totalsGroupTitle}>Escrutinio General de la Junta</Text>

        <Controller
          control={control}
          name="blancos"
          render={({ field, fieldState }) => (
            <AuthField
              label="Votos en Blanco"
              value={typeof field.value === 'string' ? field.value : ''}
              onChangeText={(valor) => {
                setConfirmado(false);
                field.onChange(valor);
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              editable={!isSubmitting && !enviando && !corrigiendo}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="nulos"
          render={({ field, fieldState }) => (
            <AuthField
              label="Votos Nulos"
              value={typeof field.value === 'string' ? field.value : ''}
              onChangeText={(valor) => {
                setConfirmado(false);
                field.onChange(valor);
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              editable={!isSubmitting && !enviando && !corrigiendo}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="sufragantes"
          render={({ field, fieldState }) => (
            <AuthField
              label="Total de Sufragantes en el Padrón"
              value={typeof field.value === 'string' ? field.value : ''}
              onChangeText={(valor) => {
                setConfirmado(false);
                field.onChange(valor);
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              editable={!isSubmitting && !enviando && !corrigiendo}
              error={fieldState.error?.message}
            />
          )}
        />
      </View>

      {/* Captura de Evidencia Fotográfica y GPS para Veedores */}
      {puedeIniciar && usuarioLocal && (
        <CapturaEvidencia
          recinto={recinto}
          evidencia={evidencia}
          disabled={isSubmitting || enviando}
          onBusy={setCapturando}
          onChange={(nueva) => void handleEvidenciaChange(nueva)}
        />
      )}

      {/* Botones para Veedores */}
      {puedeIniciar && usuarioLocal && (
        <>
          <AuthButton
            label={enviando ? 'Encolando envío…' : estaSincronizado ? 'Acta transmitida' : 'Enviar acta electoral'}
            disabled={capturando || isSubmitting || enviando || estaSincronizado}
            busy={enviando}
            onPress={() => {
              void handleSubmit(solicitarEnvio)();
            }}
          />

          <AuthButton
            disabled={capturando || enviando || isSubmitting}
            label={isSubmitting ? 'Guardando…' : 'Guardar borrador local'}
            secondary
            busy={isSubmitting}
            onPress={() => {
              void handleSubmit(guardarBorrador)();
            }}
          />
        </>
      )}

      {/* Botón de Corrección con GPS para Coordinadores (Fase 3) */}
      {!puedeIniciar && (
        <AuthButton
          label={corrigiendo ? (gpsMensaje ?? 'Corrigiendo…') : 'Corregir cifras con auditoría GPS'}
          busy={corrigiendo}
          disabled={corrigiendo || isSubmitting}
          onPress={() => {
            void handleSubmit(solicitarCorreccion)();
          }}
        />
      )}

      <AuthButton
        label="Volver"
        secondary
        disabled={isSubmitting || capturando || enviando || corrigiendo}
        onPress={volver}
      />

      {/* Modal de Detalle e Historial */}
      {borrador?.id ? (
        <DetalleActaModal
          visible={mostrarDetalle}
          actaId={borrador.id}
          mesaInfo={{
            recintoNombre: mesa.nombre,
            mesaNumero: mesa.numero,
            dignidad: dignidades[dignidad],
          }}
          onClose={() => setMostrarDetalle(false)}
        />
      ) : null}

      {/* Modal de Confirmación de Corrección con GPS */}
      {modalCorreccion && camposParaCorregir && borrador ? (
        <Modal
          visible={modalCorreccion}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!corrigiendo) setModalCorreccion(false);
          }}
        >
          <View style={styles.confirmModalOverlay}>
            <View style={styles.confirmModalCard}>
              <View style={styles.confirmModalHeader}>
                <View style={styles.confirmModalIconBox}>
                  <MapPin size={20} color={BrandColors.blancoSuperficie} />
                </View>
                <View style={styles.confirmModalHeaderText}>
                  <Text style={styles.confirmModalTitle}>Confirmar Corrección de Acta</Text>
                  <Text style={styles.confirmModalSubtitle}>
                    JRV #{String(mesa.numero).padStart(3, '0')} · {dignidades[dignidad]}
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.confirmModalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.confirmNoticeText}>
                  Esta corrección creará una nueva revisión oficial en el historial. La ley electoral exige capturar la ubicación GPS precisa de tu teléfono para garantizar la trazabilidad de los cambios.
                </Text>

                <View style={styles.changesBox}>
                  <Text style={styles.changesBoxTitle}>Resumen de Modificaciones:</Text>
                  {siglas.map((sigla) => {
                    const ant = borrador.cifras.votos[sigla] ?? 0;
                    const nuevo = Number(camposParaCorregir.votos[sigla] ?? 0);
                    if (ant === nuevo) return null;
                    return (
                      <View key={sigla} style={styles.changeItemRow}>
                        <Text style={styles.changeSiglaText}>{sigla}:</Text>
                        <Text style={styles.changeOldText}>{ant} votos</Text>
                        <Text style={styles.changeArrowText}>→</Text>
                        <Text style={styles.changeNewText}>{nuevo} votos</Text>
                      </View>
                    );
                  })}
                  {Number(camposParaCorregir.blancos) !== borrador.cifras.blancos && (
                    <View style={styles.changeItemRow}>
                      <Text style={styles.changeSiglaText}>Blancos:</Text>
                      <Text style={styles.changeOldText}>{borrador.cifras.blancos}</Text>
                      <Text style={styles.changeArrowText}>→</Text>
                      <Text style={styles.changeNewText}>{camposParaCorregir.blancos}</Text>
                    </View>
                  )}
                  {Number(camposParaCorregir.nulos) !== borrador.cifras.nulos && (
                    <View style={styles.changeItemRow}>
                      <Text style={styles.changeSiglaText}>Nulos:</Text>
                      <Text style={styles.changeOldText}>{borrador.cifras.nulos}</Text>
                      <Text style={styles.changeArrowText}>→</Text>
                      <Text style={styles.changeNewText}>{camposParaCorregir.nulos}</Text>
                    </View>
                  )}
                  {Number(camposParaCorregir.sufragantes) !== borrador.cifras.sufragantes && (
                    <View style={styles.changeItemRow}>
                      <Text style={styles.changeSiglaText}>Sufragantes:</Text>
                      <Text style={styles.changeOldText}>{borrador.cifras.sufragantes}</Text>
                      <Text style={styles.changeArrowText}>→</Text>
                      <Text style={styles.changeNewText}>{camposParaCorregir.sufragantes}</Text>
                    </View>
                  )}
                </View>

                {corrigiendo && (
                  <View style={styles.gpsProgressBox}>
                    <EditorialLottie
                      type="proceso"
                      size={24}
                      loop
                      accessibilityLabel="Capturando GPS y transmitiendo corrección"
                    />
                    <Text style={styles.gpsProgressText}>
                      {gpsMensaje ?? 'Capturando GPS y transmitiendo corrección…'}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.confirmModalActions}>
                <TouchableOpacity
                  style={[styles.confirmButton, corrigiendo && styles.buttonDisabled]}
                  disabled={corrigiendo}
                  onPress={() => void confirmarCorreccionConGps()}
                  activeOpacity={0.8}
                >
                  <MapPin size={16} color={BrandColors.blancoSuperficie} />
                  <Text style={styles.confirmButtonText}>
                    {corrigiendo ? 'Midiendo GPS…' : 'Confirmar y Medir GPS'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={corrigiendo}
                  onPress={() => setModalCorreccion(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
  emptyCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radii.full,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 4,
  },
  emptyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  emptyPillText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  emptyDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 4,
  },
  emptyActions: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  veedoresLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  veedoresLinkButtonText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  supervisorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.xs,
  },
  supervisorBannerText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  historyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
  },
  historyLinkButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  candidaturasContainer: {
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  candidaturasTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
    paddingBottom: 4,
  },
  candidateFieldCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 4,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  partyColorPill: {
    borderRadius: Radii.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySiglaBadge: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11,
    color: BrandColors.blancoSuperficie,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  partyName: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoSecundario,
  },
  totalsGroupCard: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 6,
    marginVertical: Spacing.xs,
  },
  totalsGroupTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
    paddingBottom: 4,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 36, 51, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: BrandColors.azulTitulos,
  },
  confirmModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulPrincipal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalHeaderText: {
    flex: 1,
  },
  confirmModalTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.blancoSuperficie,
  },
  confirmModalSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.azulSuperficie,
  },
  confirmModalBody: {
    padding: Spacing.md,
  },
  confirmNoticeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  changesBox: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 6,
    marginBottom: Spacing.md,
  },
  changesBoxTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    marginBottom: 2,
  },
  changeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeSiglaText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    width: 80,
  },
  changeOldText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textDecorationLine: 'line-through',
  },
  changeArrowText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  changeNewText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 12,
    color: '#D97706',
    fontWeight: 'bold',
  },
  gpsProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  gpsProgressText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    flex: 1,
  },
  confirmModalActions: {
    padding: Spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulBorde,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 11,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
});
