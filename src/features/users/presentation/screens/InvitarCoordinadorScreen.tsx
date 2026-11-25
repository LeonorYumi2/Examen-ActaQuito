import { QuitoCivicIsotype } from "@/components/ui/quito-civic-isotype";
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from "@/constants/tokens";
import {
  operacionesPorRolRepositorio,
  type RecintoInfo,
} from "@/features/recintos/data/operaciones-roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Hash,
  Info,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
  Vote,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  esquemaInvitacionCoordinador,
  validarCedulaEcuatoriana,
  type FormularioInvitacionCoordinador,
  type ResultadoOperacionInvitacion,
} from "../../domain/entities/invitacion";
import { invitarCoordinadorUseCase } from "../../domain/usecases/invitar-usuario";
import { ConfirmarInvitacionModal } from "../components/ConfirmarInvitacionModal";
import { SelectorRecintoModal } from "../components/SelectorRecintoModal";

export const InvitarCoordinadorScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const [recintos, setRecintos] = useState<RecintoInfo[]>([]);
  const [cargandoRecintos, setCargandoRecintos] = useState<boolean>(true);
  const [modalRecintoVisible, setModalRecintoVisible] = useState<boolean>(false);
  const [modalConfirmacionVisible, setModalConfirmacionVisible] =
    useState<boolean>(false);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultado, setResultado] =
    useState<ResultadoOperacionInvitacion | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormularioInvitacionCoordinador>({
    resolver: zodResolver(esquemaInvitacionCoordinador),
    defaultValues: {
      cedula: "",
      nombres: "",
      apellidos: "",
      telefono: "",
      correo: "",
      recintoCodigo: "",
    },
    mode: "onChange",
  });

  const cedulaActual = watch("cedula");
  const recintoActual = watch("recintoCodigo");

  const cedulaEsValida = useMemo(() => {
    return cedulaActual ? validarCedulaEcuatoriana(cedulaActual) : false;
  }, [cedulaActual]);

  const recintoSeleccionado = useMemo(() => {
    return recintos.find((r) => r.codigo === recintoActual);
  }, [recintos, recintoActual]);

  useEffect(() => {
    let activo = true;
    operacionesPorRolRepositorio
      .listarRecintosProvincial()
      .then((datos) => {
        if (activo) {
          setRecintos(datos);
          setCargandoRecintos(false);
        }
      })
      .catch(() => {
        if (activo) setCargandoRecintos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const [datosPendientes, setDatosPendientes] =
    useState<FormularioInvitacionCoordinador | null>(null);

  const onSubmit = (datos: FormularioInvitacionCoordinador) => {
    setDatosPendientes(datos);
    setResultado(null);
    setModalConfirmacionVisible(true);
  };

  const ejecutarEnvio = async () => {
    if (!datosPendientes) return;
    setEnviando(true);
    try {
      const res = await invitarCoordinadorUseCase.ejecutar(datosPendientes);
      setResultado(res);
      setModalConfirmacionVisible(false);
      if (res.exito) {
        reset();
      }
    } catch (err: any) {
      setResultado({
        exito: false,
        estadoOperacion: "error",
        mensaje: err?.message ?? "No se pudo procesar la solicitud.",
      });
      setModalConfirmacionVisible(false);
    } finally {
      setEnviando(false);
    }
  };

  const horizontalPadding = Math.max(
    20,
    Math.min(24, Math.floor(width * 0.055)),
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BrandColors.blancoSuperficie}
      />

      {/* Header Institucional de Navegación */}
      <View
        style={[
          styles.headerContainer,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Volver al panel provincial"
        >
          <ArrowLeft size={20} color={BrandColors.azulTitulos} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerOverline}>COORDINACIÓN PROVINCIAL</Text>
          <Text style={styles.headerTitle}>Invitar Coordinador</Text>
        </View>

        <QuitoCivicIsotype size={36} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          {/* Banner de Introducción */}
          <View style={styles.introCard}>
            <View style={styles.introIconBox}>
              <UserPlus size={18} color={BrandColors.azulTitulos} />
            </View>
            <View style={styles.introTextGroup}>
              <Text style={styles.introTitle}>
                Alta Jerárquica de Personal Electoral
              </Text>
              <Text style={styles.introDesc}>
                Registra a un nuevo coordinador de recinto. Se emitirá una
                invitación por correo para que defina su contraseña de forma
                autónoma.
              </Text>
            </View>
          </View>

          {/* Feedback de Resultado */}
          {resultado ? (
            <View
              style={[
                styles.feedbackBanner,
                resultado.exito
                  ? styles.feedbackBannerSuccess
                  : resultado.estadoOperacion === "servicio_no_disponible"
                    ? styles.feedbackBannerPending
                    : styles.feedbackBannerError,
              ]}
            >
              {resultado.exito ? (
                <CheckCircle2 size={20} color={BrandColors.verdeExito} />
              ) : resultado.estadoOperacion === "servicio_no_disponible" ? (
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
                      : resultado.estadoOperacion === "servicio_no_disponible"
                        ? styles.feedbackTitlePending
                        : styles.feedbackTitleError,
                  ]}
                >
                  {resultado.exito
                    ? "Invitación Procesada"
                    : resultado.estadoOperacion === "servicio_no_disponible"
                      ? "Servicio en Desarrollo (Codex)"
                      : "Error en la Invitación"}
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
                    <Text style={styles.validBadgeText}>
                      Válida (Módulo 10)
                    </Text>
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
                    editable={!enviando}
                  />
                )}
              />
              {errors.cedula ? (
                <Text style={styles.errorText}>{errors.cedula.message}</Text>
              ) : null}
            </View>

            {/* Fila de Nombres y Apellidos */}
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
                      style={[
                        styles.input,
                        errors.nombres && styles.inputError,
                      ]}
                      placeholder="Nombres completos"
                      placeholderTextColor={BrandColors.textoMuted}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                      editable={!enviando}
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
                      style={[
                        styles.input,
                        errors.apellidos && styles.inputError,
                      ]}
                      placeholder="Apellidos completos"
                      placeholderTextColor={BrandColors.textoMuted}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                      editable={!enviando}
                    />
                  )}
                />
                {errors.apellidos ? (
                  <Text style={styles.errorText}>
                    {errors.apellidos.message}
                  </Text>
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
                    editable={!enviando}
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
                    placeholder="usuario@ejemplo.com"
                    placeholderTextColor={BrandColors.textoMuted}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!enviando}
                  />
                )}
              />
              {errors.correo ? (
                <Text style={styles.errorText}>{errors.correo.message}</Text>
              ) : null}
            </View>

            {/* Selector de Recinto Electoral */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Building2 size={13} color={BrandColors.azulPrincipal} />
                <Text style={styles.fieldLabel}>
                  Recinto Electoral Asignado
                </Text>
              </View>
              <Text style={styles.helperText}>
                Selecciona el recinto que coordinará el usuario (12 precargados
                de Quito):
              </Text>

              {cargandoRecintos ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator
                    size="small"
                    color={BrandColors.azulTitulos}
                  />
                  <Text style={styles.loadingBoxText}>
                    Cargando los 12 recintos desde Supabase…
                  </Text>
                </View>
              ) : (
                <Controller
                  control={control}
                  name="recintoCodigo"
                  render={({ field }) => {
                    const seleccionado = recintos.find((r) => r.codigo === field.value);
                    return (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.recintoSelectorTrigger,
                            errors.recintoCodigo && styles.inputError,
                            seleccionado && styles.recintoSelectorTriggerActive,
                          ]}
                          onPress={() => setModalRecintoVisible(true)}
                          disabled={enviando}
                          activeOpacity={0.8}
                        >
                          {seleccionado ? (
                            <View style={styles.recintoSelectedContainer}>
                              <View style={styles.recintoSelectedTop}>
                                <View style={styles.recintoSelectedBadge}>
                                  <Text style={styles.recintoSelectedBadgeText}>
                                    RECINTO SELECCIONADO
                                  </Text>
                                </View>
                                <Text style={styles.cambiarRecintoLink}>Cambiar</Text>
                              </View>
                              <Text style={styles.recintoSelectedNombre} numberOfLines={2}>
                                {seleccionado.nombre}
                              </Text>
                              <View style={styles.recintoSelectedMetaRow}>
                                <View style={styles.recintoSelectedMetaItem}>
                                  <MapPin size={11} color={BrandColors.textoSecundario} />
                                  <Text style={styles.recintoSelectedMetaText}>
                                    {seleccionado.parroquiaNombre ?? seleccionado.parroquiaCodigo}
                                  </Text>
                                </View>
                                <Text style={styles.recintoSelectedMetaDot}>•</Text>
                                <Text style={styles.recintoSelectedMetaText}>
                                  Cód: {seleccionado.codigo}
                                </Text>
                                <Text style={styles.recintoSelectedMetaDot}>•</Text>
                                <View style={styles.recintoSelectedMetaItem}>
                                  <Vote size={11} color={BrandColors.textoSecundario} />
                                  <Text style={styles.recintoSelectedMetaText}>
                                    {seleccionado.totalMesas} mesas
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.recintoPlaceholderContainer}>
                              <Building2 size={18} color={BrandColors.azulPrincipal} />
                              <View style={styles.recintoPlaceholderTexts}>
                                <Text style={styles.recintoPlaceholderTitle}>
                                  Seleccionar recinto electoral
                                </Text>
                                <Text style={styles.recintoPlaceholderSubtitle}>
                                  12 recintos disponibles en Quito
                                </Text>
                              </View>
                              <ChevronDown size={18} color={BrandColors.textoMuted} />
                            </View>
                          )}
                        </TouchableOpacity>

                        <SelectorRecintoModal
                          visible={modalRecintoVisible}
                          recintos={recintos}
                          recintoSeleccionadoCodigo={field.value}
                          onSeleccionar={(codigo: string) => {
                            field.onChange(codigo);
                            setModalRecintoVisible(false);
                          }}
                          onCerrar={() => setModalRecintoVisible(false)}
                        />
                      </>
                    );
                  }}
                />
              )}
              {errors.recintoCodigo ? (
                <Text style={styles.errorText}>
                  {errors.recintoCodigo.message}
                </Text>
              ) : null}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                enviando && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={enviando}
              activeOpacity={0.8}
            >
              {enviando ? (
                <View style={styles.submitRow}>
                  <ActivityIndicator
                    size="small"
                    color={BrandColors.blancoSuperficie}
                  />
                  <Text style={styles.submitButtonText}>
                    Procesando invitación…
                  </Text>
                </View>
              ) : (
                <View style={styles.submitRow}>
                  <UserPlus size={16} color={BrandColors.blancoSuperficie} />
                  <Text style={styles.submitButtonText}>
                    Continuar a Confirmación
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Confirmación Previa */}
      {datosPendientes ? (
        <ConfirmarInvitacionModal
          visible={modalConfirmacionVisible}
          busy={enviando}
          rolLabel="Coordinador de Recinto"
          datos={{
            cedula: datosPendientes.cedula,
            nombres: datosPendientes.nombres,
            apellidos: datosPendientes.apellidos,
            telefono: datosPendientes.telefono,
            correo: datosPendientes.correo,
            asignacionTexto: recintoSeleccionado
              ? `${recintoSeleccionado.nombre} (${recintoSeleccionado.codigo})`
              : datosPendientes.recintoCodigo,
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Elevations.subtle,
  },
  introIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  introTextGroup: {
    flex: 1,
  },
  introTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13.5,
    color: BrandColors.azulTitulos,
  },
  introDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    lineHeight: 16,
    marginTop: 2,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    flexDirection: "row",
    gap: Spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fieldLabel: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BrandColors.verdeExitoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.full,
    marginLeft: "auto",
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
    flexDirection: "row",
    alignItems: "center",
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
  recintoSelectorTrigger: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    padding: Spacing.sm,
    minHeight: 52,
    justifyContent: "center",
  },
  recintoSelectorTriggerActive: {
    borderColor: BrandColors.azulPrincipal,
    backgroundColor: BrandColors.blancoSuperficie,
  },
  recintoPlaceholderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  recintoPlaceholderTexts: {
    flex: 1,
  },
  recintoPlaceholderTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  recintoPlaceholderSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  recintoSelectedContainer: {
    paddingHorizontal: 2,
    gap: 4,
  },
  recintoSelectedTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recintoSelectedBadge: {
    backgroundColor: BrandColors.verdeSobrioLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 1,
    borderColor: BrandColors.verdeSobrioBorder,
  },
  recintoSelectedBadgeText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
    color: BrandColors.verdeExito,
    letterSpacing: 0.4,
  },
  cambiarRecintoLink: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11.5,
    color: BrandColors.azulPrincipal,
    textDecorationLine: "underline",
  },
  recintoSelectedNombre: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    marginTop: 2,
  },
  recintoSelectedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  recintoSelectedMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recintoSelectedMetaText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  recintoSelectedMetaDot: {
    fontSize: 11,
    color: BrandColors.textoMuted,
  },
  submitButton: {
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    ...Elevations.subtle,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
});
