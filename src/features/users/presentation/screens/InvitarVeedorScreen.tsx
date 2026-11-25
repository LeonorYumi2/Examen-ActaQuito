import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Hash,
  User,
  Vote,
  Shield,
  Info,
} from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import { QuitoCivicIsotype } from '@/components/ui/quito-civic-isotype';
import {
  esquemaInvitacionVeedor,
  validarCedulaEcuatoriana,
  type FormularioInvitacionVeedor,
  type ResultadoOperacionInvitacion,
} from '../../domain/entities/invitacion';
import { invitarVeedorUseCase } from '../../domain/usecases/invitar-usuario';
import {
  operacionesPorRolRepositorio,
  type RecintoInfo,
  type MesaJrvInfo,
} from '@/features/recintos/data/operaciones-roles';
import { ConfirmarInvitacionModal } from '../components/ConfirmarInvitacionModal';
import { useAuth } from '@/features/auth/presentation/auth-state';

export const InvitarVeedorScreen: React.FC = () => {
  const access = useAuth((state) => state.access);
  const { width } = useWindowDimensions();

  const [recinto, setRecinto] = useState<RecintoInfo | null>(null);
  const [mesas, setMesas] = useState<MesaJrvInfo[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState<boolean>(true);
  const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState<boolean>(false);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ResultadoOperacionInvitacion | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormularioInvitacionVeedor>({
    resolver: zodResolver(esquemaInvitacionVeedor),
    defaultValues: {
      cedula: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      correo: '',
      mesaNumero: undefined,
    },
    mode: 'onChange',
  });

  const cedulaActual = watch('cedula');
  const mesaActual = watch('mesaNumero');

  const cedulaEsValida = useMemo(() => {
    return cedulaActual ? validarCedulaEcuatoriana(cedulaActual) : false;
  }, [cedulaActual]);

  useEffect(() => {
    let activo = true;
    if (access?.kind === 'operational') {
      operacionesPorRolRepositorio
        .obtenerRecintoCoordinado(access.profile.id)
        .then((datos) => {
          if (activo) {
            setRecinto(datos.recinto);
            setMesas(datos.mesas);
            setCargandoDatos(false);
          }
        })
        .catch(() => {
          if (activo) setCargandoDatos(false);
        });
    } else {
      setCargandoDatos(false);
    }
    return () => {
      activo = false;
    };
  }, [access]);

  const [datosPendientes, setDatosPendientes] = useState<FormularioInvitacionVeedor | null>(null);

  const onSubmit = (datos: FormularioInvitacionVeedor) => {
    setDatosPendientes(datos);
    setResultado(null);
    setModalConfirmacionVisible(true);
  };

  const ejecutarEnvio = async () => {
    if (!datosPendientes || !recinto) return;
    setEnviando(true);
    try {
      const res = await invitarVeedorUseCase.ejecutar(datosPendientes, recinto.codigo);
      setResultado(res);
      setModalConfirmacionVisible(false);
      if (res.exito) {
        reset();
      }
    } catch (err: any) {
      setResultado({
        exito: false,
        estadoOperacion: 'error',
        mensaje: err?.message ?? 'No se pudo procesar la solicitud.',
      });
      setModalConfirmacionVisible(false);
    } finally {
      setEnviando(false);
    }
  };

  const horizontalPadding = Math.max(20, Math.min(24, Math.floor(width * 0.055)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.blancoSuperficie} />

      {/* Header Institucional de Navegación */}
      <View style={[styles.headerContainer, { paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Volver al panel de recinto"
        >
          <ArrowLeft size={20} color={BrandColors.azulTitulos} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerOverline}>COORDINACIÓN DE RECINTO</Text>
          <Text style={styles.headerTitle}>Invitar Veedor Electoral</Text>
        </View>

        <QuitoCivicIsotype size={36} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card del Recinto Coordenado */}
          {recinto ? (
            <View style={styles.recintoBanner}>
              <Building2 size={16} color={BrandColors.azulTitulos} />
              <View style={styles.recintoBannerTextGroup}>
                <Text style={styles.recintoBannerTitle}>{recinto.nombre}</Text>
                <Text style={styles.recintoBannerSubtitle}>
                  Ámbito delimitado · Código: {recinto.codigo} · {mesas.length} mesas autorizadas
                </Text>
              </View>
            </View>
          ) : !cargandoDatos ? (
            <View style={styles.noRecintoBanner}>
              <AlertCircle size={18} color={BrandColors.rojoAlerta} />
              <Text style={styles.noRecintoText}>
                No tienes un recinto asignado actualmente. Contacta al coordinador provincial.
              </Text>
            </View>
          ) : null}

          {/* Feedback de Resultado */}
          {resultado ? (
            <View
              style={[
                styles.feedbackBanner,
                resultado.exito
                  ? styles.feedbackBannerSuccess
                  : resultado.estadoOperacion === 'servicio_no_disponible'
                  ? styles.feedbackBannerPending
                  : styles.feedbackBannerError,
              ]}
            >
              {resultado.exito ? (
                <CheckCircle2 size={20} color={BrandColors.verdeExito} />
              ) : resultado.estadoOperacion === 'servicio_no_disponible' ? (
                <Info size={20} color={BrandColors.azulPrincipal} />
              ) : (
                <AlertCircle size={20} color={BrandColors.rojoAlerta} />
              )}
              <View style={styles.feedbackTextGroup}>
                <Text
                  style={[
                    styles.feedbackTitle,
                    resultado.exito
                      ? styles.feedbackTitleSuccess
                      : resultado.estadoOperacion === 'servicio_no_disponible'
                      ? styles.feedbackTitlePending
                      : styles.feedbackTitleError,
                  ]}
                >
                  {resultado.exito
                    ? 'Invitación Enviada'
                    : resultado.estadoOperacion === 'servicio_no_disponible'
                    ? 'Servicio en Desarrollo (Codex)'
                    : 'Error en la Invitación'}
                </Text>
                <Text style={styles.feedbackDesc}>{resultado.mensaje}</Text>
              </View>
            </View>
          ) : null}

          {/* Formulario */}
          <View style={styles.formCard}>
            {/* Campo: Cédula */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Hash size={13} color={BrandColors.azulPrincipal} />
                <Text style={styles.fieldLabel}>Cédula de Identidad</Text>
                {cedulaEsValida ? (
                  <View style={styles.validBadge}>
                    <CheckCircle2 size={11} color={BrandColors.verdeExito} />
                    <Text style={styles.validBadgeText}>Válida (Módulo 10)</Text>
                  </View>
                ) : null}
              </View>
              <Controller
                control={control}
                name="cedula"
                render={({ field }) => (
                  <TextInput
                    style={[
                      styles.input,
                      errors.cedula && styles.inputError,
                      cedulaEsValida && styles.inputSuccess,
                    ]}
                    placeholder="10 dígitos numéricos (ej: 1712345678)"
                    placeholderTextColor={BrandColors.textoMuted}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!enviando && !!recinto}
                  />
                )}
              />
              {errors.cedula ? (
                <Text style={styles.errorText}>{errors.cedula.message}</Text>
              ) : null}
            </View>

            {/* Fila: Nombres y Apellidos */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, styles.flexOne]}>
                <View style={styles.fieldLabelRow}>
                  <User size={13} color={BrandColors.azulPrincipal} />
                  <Text style={styles.fieldLabel}>Nombres</Text>
                </View>
                <Controller
                  control={control}
                  name="nombres"
                  render={({ field }) => (
                    <TextInput
                      style={[styles.input, errors.nombres && styles.inputError]}
                      placeholder="Nombres"
                      placeholderTextColor={BrandColors.textoMuted}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                      editable={!enviando && !!recinto}
                    />
                  )}
                />
                {errors.nombres ? (
                  <Text style={styles.errorText}>{errors.nombres.message}</Text>
                ) : null}
              </View>

              <View style={[styles.fieldGroup, styles.flexOne]}>
                <View style={styles.fieldLabelRow}>
                  <User size={13} color={BrandColors.azulPrincipal} />
                  <Text style={styles.fieldLabel}>Apellidos</Text>
                </View>
                <Controller
                  control={control}
                  name="apellidos"
                  render={({ field }) => (
                    <TextInput
                      style={[styles.input, errors.apellidos && styles.inputError]}
                      placeholder="Apellidos"
                      placeholderTextColor={BrandColors.textoMuted}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                      editable={!enviando && !!recinto}
                    />
                  )}
                />
                {errors.apellidos ? (
                  <Text style={styles.errorText}>{errors.apellidos.message}</Text>
                ) : null}
              </View>
            </View>

            {/* Campo: Teléfono */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Phone size={13} color={BrandColors.azulPrincipal} />
                <Text style={styles.fieldLabel}>Teléfono Celular</Text>
              </View>
              <Controller
                control={control}
                name="telefono"
                render={({ field }) => (
                  <TextInput
                    style={[styles.input, errors.telefono && styles.inputError]}
                    placeholder="09XXXXXXXX (10 dígitos)"
                    placeholderTextColor={BrandColors.textoMuted}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!enviando && !!recinto}
                  />
                )}
              />
              {errors.telefono ? (
                <Text style={styles.errorText}>{errors.telefono.message}</Text>
              ) : null}
            </View>

            {/* Campo: Correo Electrónico */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Mail size={13} color={BrandColors.azulPrincipal} />
                <Text style={styles.fieldLabel}>Correo Electrónico</Text>
              </View>
              <Controller
                control={control}
                name="correo"
                render={({ field }) => (
                  <TextInput
                    style={[styles.input, errors.correo && styles.inputError]}
                    placeholder="veedor@ejemplo.com"
                    placeholderTextColor={BrandColors.textoMuted}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!enviando && !!recinto}
                  />
                )}
              />
              {errors.correo ? (
                <Text style={styles.errorText}>{errors.correo.message}</Text>
              ) : null}
            </View>

            {/* Selector de Mesa JRV dentro del Recinto */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Vote size={13} color={BrandColors.azulPrincipal} />
                <Text style={styles.fieldLabel}>Junta Receptora del Voto (Mesa)</Text>
              </View>
              <Text style={styles.helperText}>
                Asignación restringida estrictamente a las mesas de tu recinto:
              </Text>

              {cargandoDatos ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
                  <Text style={styles.loadingBoxText}>Cargando mesas del recinto…</Text>
                </View>
              ) : mesas.length === 0 ? (
                <View style={styles.loadingBox}>
                  <Text style={styles.loadingBoxText}>
                    No hay mesas disponibles en este recinto.
                  </Text>
                </View>
              ) : (
                <Controller
                  control={control}
                  name="mesaNumero"
                  render={({ field }) => (
                    <View style={styles.mesasSelectorGrid}>
                      {mesas.map((m) => {
                        const seleccionada = field.value === m.numero;
                        return (
                          <TouchableOpacity
                            key={m.numero}
                            style={[
                              styles.mesaChipItem,
                              seleccionada && styles.mesaChipItemSelected,
                            ]}
                            onPress={() => field.onChange(m.numero)}
                            activeOpacity={0.7}
                            disabled={enviando}
                          >
                            <Vote
                              size={14}
                              color={
                                seleccionada
                                  ? BrandColors.blancoSuperficie
                                  : BrandColors.azulTitulos
                              }
                            />
                            <Text
                              style={[
                                styles.mesaChipText,
                                seleccionada && styles.mesaChipTextSelected,
                              ]}
                            >
                              JRV #{String(m.numero).padStart(3, '0')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                />
              )}
              {errors.mesaNumero ? (
                <Text style={styles.errorText}>{errors.mesaNumero.message}</Text>
              ) : null}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (enviando || !recinto) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={enviando || !recinto}
              activeOpacity={0.8}
            >
              {enviando ? (
                <View style={styles.submitRow}>
                  <ActivityIndicator size="small" color={BrandColors.blancoSuperficie} />
                  <Text style={styles.submitButtonText}>Procesando invitación…</Text>
                </View>
              ) : (
                <View style={styles.submitRow}>
                  <UserPlus size={16} color={BrandColors.blancoSuperficie} />
                  <Text style={styles.submitButtonText}>Continuar a Confirmación</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Confirmación Previa */}
      {datosPendientes && recinto ? (
        <ConfirmarInvitacionModal
          visible={modalConfirmacionVisible}
          busy={enviando}
          rolLabel="Veedor Electoral"
          datos={{
            cedula: datosPendientes.cedula,
            nombres: datosPendientes.nombres,
            apellidos: datosPendientes.apellidos,
            telefono: datosPendientes.telefono,
            correo: datosPendientes.correo,
            asignacionTexto: `${recinto.nombre} · JRV #${String(
              datosPendientes.mesaNumero
            ).padStart(3, '0')}`,
          }}
          onCancel={() => {
            if (!enviando) setModalConfirmacionVisible(false);
          }}
          onConfirm={() => {
            void ejecutarEnvio();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.fondoMarfil,
  },
  flexOne: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
    gap: Spacing.sm,
    ...Elevations.subtle,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: BrandColors.azulPrincipal,
  },
  headerTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
  },
  recintoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 8,
  },
  recintoBannerTextGroup: {
    flex: 1,
  },
  recintoBannerTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  recintoBannerSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  noRecintoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.rojoAlertaLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    gap: 8,
  },
  noRecintoText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    flex: 1,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: BrandColors.verdeExitoLight,
    borderColor: BrandColors.verdeSobrioBorder,
  },
  feedbackBannerPending: {
    backgroundColor: BrandColors.azulSuperficie,
    borderColor: BrandColors.azulBorde,
  },
  feedbackBannerError: {
    backgroundColor: BrandColors.rojoAlertaLight,
    borderColor: BrandColors.rojoAlertaBorder,
  },
  feedbackTextGroup: {
    flex: 1,
  },
  feedbackTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
  },
  feedbackTitleSuccess: {
    color: BrandColors.verdeExito,
  },
  feedbackTitlePending: {
    color: BrandColors.azulPrincipal,
  },
  feedbackTitleError: {
    color: BrandColors.rojoAlerta,
  },
  feedbackDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: Spacing.sm + 4,
    ...Elevations.subtle,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fieldLabel: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BrandColors.verdeExitoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.full,
    marginLeft: 'auto',
  },
  validBadgeText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
    color: BrandColors.verdeExito,
  },
  input: {
    height: 42,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 13,
    color: BrandColors.textoPrincipal,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  inputError: {
    borderColor: BrandColors.rojoAlerta,
    backgroundColor: BrandColors.rojoAlertaLight,
  },
  inputSuccess: {
    borderColor: BrandColors.verdeSobrioBorder,
  },
  errorText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.rojoAlerta,
    marginTop: 2,
  },
  helperText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginBottom: 4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
  },
  loadingBoxText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
  mesasSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mesaChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaChipItemSelected: {
    backgroundColor: BrandColors.azulTitulos,
    borderColor: BrandColors.azulTitulos,
  },
  mesaChipText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  mesaChipTextSelected: {
    color: BrandColors.blancoSuperficie,
  },
  submitButton: {
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    ...Elevations.subtle,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
});
