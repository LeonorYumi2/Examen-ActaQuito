import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, ReduceMotion } from 'react-native-reanimated';
import {
  User,
  X,
  Mail,
  Phone,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Check,
} from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import type { CoordinadorRecintoInfo, RecintoInfo } from '@/features/recintos/data/operaciones-roles';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { repositorioInvitaciones } from '@/features/users/data/repositorio-invitaciones';
import { SelectorRecintoModal } from './SelectorRecintoModal';

export interface DetalleCoordinadorModalProps {
  visible: boolean;
  coordinador: CoordinadorRecintoInfo | null;
  recintosDisponibles?: RecintoInfo[];
  onClose: () => void;
  onAsignacionExitosa?: () => void;
}

export const DetalleCoordinadorModal: React.FC<DetalleCoordinadorModalProps> = ({
  visible,
  coordinador,
  recintosDisponibles = [],
  onClose,
  onAsignacionExitosa,
}) => {
  const [coordinadorLocal, setCoordinadorLocal] = useState<CoordinadorRecintoInfo | null>(coordinador);
  const [selectorVisible, setSelectorVisible] = useState<boolean>(false);
  const [recintoSeleccionado, setRecintoSeleccionado] = useState<RecintoInfo | null>(null);
  const [confirmacionVisible, setConfirmacionVisible] = useState<boolean>(false);
  const [cargandoAsignacion, setCargandoAsignacion] = useState<boolean>(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [exitoAsignacion, setExitoAsignacion] = useState<string | null>(null);

  // Sincronizar estado local y enriquecer datos de contacto si no vinieron en la lista
  useEffect(() => {
    setCoordinadorLocal(coordinador);
    setErrorAsignacion(null);
    setExitoAsignacion(null);
    setConfirmacionVisible(false);
    setRecintoSeleccionado(null);
    setSelectorVisible(false);

    if (coordinador && (!coordinador.correo || !coordinador.cedula || !coordinador.telefono)) {
      void mobileSupabase()
        .from('usuarios')
        .select('cedula,correo,telefono,creado_en')
        .eq('id', coordinador.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCoordinadorLocal((prev) =>
              prev && prev.id === coordinador.id
                ? {
                    ...prev,
                    cedula: data.cedula ?? prev.cedula,
                    correo: data.correo ?? prev.correo,
                    telefono: data.telefono ?? prev.telefono,
                    creadoEn: data.creado_en ?? prev.creadoEn,
                  }
                : prev
            );
          }
        });
    }
  }, [coordinador]);

  if (!visible || !coordinadorLocal) return null;

  const tieneRecinto = Boolean(
    coordinadorLocal.recintoCodigo &&
      coordinadorLocal.recintoCodigo !== 'Sin asignar' &&
      coordinadorLocal.recintoNombre !== 'Sin recinto asignado'
  );

  const fechaFormateada = coordinadorLocal.creadoEn
    ? new Date(coordinadorLocal.creadoEn).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const handleAbrirSelector = () => {
    setErrorAsignacion(null);
    setExitoAsignacion(null);

    if (!coordinadorLocal.habilitado) {
      setErrorAsignacion('El coordinador está suspendido administrativamente. Habilítelo antes de asignarle un recinto.');
      return;
    }

    if (recintosDisponibles.length === 0) {
      setErrorAsignacion('No se encontraron recintos electorales disponibles en la jurisdicción provincial.');
      return;
    }

    setSelectorVisible(true);
  };

  const handleSeleccionarRecinto = (codigo: string) => {
    setSelectorVisible(false);
    const seleccionado = recintosDisponibles.find((r) => r.codigo === codigo);
    if (!seleccionado) {
      setErrorAsignacion('El recinto seleccionado no es válido.');
      return;
    }

    // Validación de jurisdicción provincial (Pichincha)
    if (!recintosDisponibles.some((r) => r.codigo === codigo)) {
      setErrorAsignacion('El recinto seleccionado se encuentra fuera de la jurisdicción provincial autorizada.');
      return;
    }

    setRecintoSeleccionado(seleccionado);
    setErrorAsignacion(null);
    setConfirmacionVisible(true);
  };

  const handleConfirmarAsignacion = async () => {
    if (!recintoSeleccionado || !coordinadorLocal) return;

    // Validación de jurisdicción
    if (!recintosDisponibles.some((r) => r.codigo === recintoSeleccionado.codigo)) {
      setErrorAsignacion('El recinto seleccionado se encuentra fuera de la jurisdicción provincial autorizada.');
      return;
    }

    setCargandoAsignacion(true);
    setErrorAsignacion(null);

    try {
      const res = await repositorioInvitaciones.asignarCoordinadorExistente(
        recintoSeleccionado.codigo,
        coordinadorLocal.id
      );

      if (res.exito) {
        const nuevoCodigo = recintoSeleccionado.codigo;
        const nuevoNombre = recintoSeleccionado.nombre;
        const nuevaParroquia = recintoSeleccionado.parroquiaNombre;

        setCoordinadorLocal((prev) =>
          prev
            ? {
                ...prev,
                recintoCodigo: nuevoCodigo,
                recintoNombre: nuevoNombre,
                parroquiaNombre: nuevaParroquia,
              }
            : null
        );

        setExitoAsignacion(res.mensaje || 'Coordinador asignado al recinto exitosamente.');
        setConfirmacionVisible(false);
        setRecintoSeleccionado(null);

        // Notificar al dashboard provincial para refrescar métricas y listas
        onAsignacionExitosa?.();
      } else {
        setErrorAsignacion(res.mensaje);
      }
    } catch (err) {
      setErrorAsignacion(
        err instanceof Error ? err.message : 'Error inesperado al asignar el recinto.'
      );
    } finally {
      setCargandoAsignacion(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !selectorVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(150)}
            style={styles.backdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            entering={ZoomIn.duration(200).reduceMotion(ReduceMotion.System)}
            exiting={ZoomOut.duration(150).reduceMotion(ReduceMotion.System)}
            style={styles.card}
          >
            {/* Header del Modal */}
            <View style={styles.header}>
              <View style={styles.coordAvatar}>
                <Text style={styles.coordAvatarText}>
                  {coordinadorLocal.nombres.charAt(0)}
                  {coordinadorLocal.apellidos.charAt(0)}
                </Text>
              </View>
              <View style={styles.headerTitleGroup}>
                <Text style={styles.title} numberOfLines={2}>
                  {coordinadorLocal.nombres} {coordinadorLocal.apellidos}
                </Text>
                <Text style={styles.subtitle}>Coordinador de Recinto Electoral</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar detalle"
              >
                <X size={18} color={BrandColors.azulTitulos} />
              </TouchableOpacity>
            </View>

            {/* Vista de Confirmación de Asignación */}
            {confirmacionVisible && recintoSeleccionado ? (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.confirmScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.confirmHeader}>
                  <View style={styles.confirmIconContainer}>
                    <Building2 size={24} color={BrandColors.azulTitulos} />
                  </View>
                  <Text style={styles.confirmTitle}>¿Confirmar asignación de recinto?</Text>
                  <Text style={styles.confirmSubtitle}>
                    Se vinculará la coordinación oficial del recinto conforme al ADR-02.
                  </Text>
                </View>

                {/* Datos del Coordinador */}
                <View style={styles.confirmBlock}>
                  <Text style={styles.confirmLabel}>COORDINADOR</Text>
                  <Text style={styles.confirmValue}>
                    {coordinadorLocal.nombres} {coordinadorLocal.apellidos}
                  </Text>
                  {coordinadorLocal.cedula ? (
                    <Text style={styles.confirmSub}>Cédula: {coordinadorLocal.cedula}</Text>
                  ) : null}
                </View>

                {/* Datos del Recinto a Asignar */}
                <View style={styles.confirmBlock}>
                  <Text style={styles.confirmLabel}>RECINTO A ASIGNAR</Text>
                  <Text style={styles.confirmValue}>{recintoSeleccionado.nombre}</Text>
                  <Text style={styles.confirmSub}>
                    Código: {recintoSeleccionado.codigo}
                    {recintoSeleccionado.parroquiaNombre
                      ? ` · Parroquia ${recintoSeleccionado.parroquiaNombre}`
                      : ''}
                  </Text>
                </View>

                {/* Advertencia si reemplaza una asignación existente */}
                {tieneRecinto ? (
                  <View style={styles.confirmWarnBox}>
                    <AlertCircle size={15} color="#854D0E" />
                    <Text style={styles.confirmWarnText}>
                      Reemplazo de recinto: El coordinador ya tiene asignado "{coordinadorLocal.recintoNombre}". Esta acción registrará la finalización de la asignación previa e iniciará la nueva.
                    </Text>
                  </View>
                ) : null}

                {/* Banner de error en confirmación */}
                {errorAsignacion ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={15} color={BrandColors.rojoAlerta} />
                    <Text style={styles.errorBannerText}>{errorAsignacion}</Text>
                  </View>
                ) : null}

                {/* Botones de acción en Confirmación */}
                <View style={styles.confirmActionsRow}>
                  <TouchableOpacity
                    style={styles.confirmBtnCancel}
                    onPress={() => {
                      setConfirmacionVisible(false);
                      setRecintoSeleccionado(null);
                      setErrorAsignacion(null);
                    }}
                    disabled={cargandoAsignacion}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmBtnSubmit,
                      cargandoAsignacion && styles.confirmBtnSubmitDisabled,
                    ]}
                    onPress={handleConfirmarAsignacion}
                    disabled={cargandoAsignacion}
                    activeOpacity={0.8}
                  >
                    {cargandoAsignacion ? (
                      <ActivityIndicator size="small" color={BrandColors.blancoSuperficie} />
                    ) : (
                      <>
                        <Check size={16} color={BrandColors.blancoSuperficie} />
                        <Text style={styles.confirmBtnSubmitText}>Confirmar asignación</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Vista Principal de Detalle */
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
              >
                {/* Banner de Éxito */}
                {exitoAsignacion ? (
                  <View style={styles.exitoBanner}>
                    <CheckCircle2 size={16} color="#0D6832" />
                    <Text style={styles.exitoBannerText}>{exitoAsignacion}</Text>
                  </View>
                ) : null}

                {/* Banner de Error General */}
                {errorAsignacion && !confirmacionVisible ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={16} color={BrandColors.rojoAlerta} />
                    <Text style={styles.errorBannerText}>{errorAsignacion}</Text>
                  </View>
                ) : null}

                {/* Bloque: Asignación Territorial */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Recinto Asignado</Text>
                    {tieneRecinto ? (
                      <View style={styles.asignadoPill}>
                        <Check size={11} color="#0D6832" />
                        <Text style={styles.asignadoPillText}>Asignación Vigente</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.recintoCard}>
                    <View style={styles.recintoIconBox}>
                      <Building2 size={16} color={BrandColors.azulTitulos} />
                    </View>
                    <View style={styles.recintoInfo}>
                      <Text style={styles.recintoNombre}>
                        {coordinadorLocal.recintoNombre ?? 'Sin recinto asignado'}
                      </Text>
                      <Text style={styles.recintoMeta}>
                        {tieneRecinto
                          ? `Código: ${coordinadorLocal.recintoCodigo}${
                              coordinadorLocal.parroquiaNombre
                                ? ` · Parroquia ${coordinadorLocal.parroquiaNombre}`
                                : ''
                            }`
                          : 'Pendiente de vinculación territorial'}
                      </Text>
                    </View>
                  </View>

                  {/* Botón Asignar / Reasignar Recinto */}
                  <TouchableOpacity
                    style={[
                      tieneRecinto ? styles.btnReasignarRecinto : styles.btnAsignarRecinto,
                      !coordinadorLocal.habilitado && styles.btnActionDisabled,
                    ]}
                    onPress={handleAbrirSelector}
                    activeOpacity={0.8}
                    disabled={!coordinadorLocal.habilitado}
                  >
                    <Building2
                      size={15}
                      color={tieneRecinto ? BrandColors.azulTitulos : BrandColors.blancoSuperficie}
                    />
                    <Text
                      style={
                        tieneRecinto
                          ? styles.btnReasignarRecintoText
                          : styles.btnAsignarRecintoText
                      }
                    >
                      {tieneRecinto ? 'Reasignar recinto' : 'Asignar recinto electoral'}
                    </Text>
                  </TouchableOpacity>

                  {!coordinadorLocal.habilitado ? (
                    <Text style={styles.alertaInactivoText}>
                      Cuenta suspendida administrativamente. No se puede asignar recinto hasta reactivarla.
                    </Text>
                  ) : null}
                </View>

                {/* Bloque: Diferenciación de Estados (Habilitación vs Activación) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Estado Operativo y de Cuenta</Text>

                  {/* 1. Habilitación Administrativa */}
                  <View style={styles.statusBox}>
                    <View style={styles.statusBoxTop}>
                      <View style={styles.statusBoxLabelGroup}>
                        <ShieldCheck size={14} color={BrandColors.azulTitulos} />
                        <Text style={styles.statusBoxLabel}>Habilitación Administrativa</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          coordinadorLocal.habilitado
                            ? styles.statusPillActive
                            : styles.statusPillInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            coordinadorLocal.habilitado
                              ? styles.statusPillTextActive
                              : styles.statusPillTextInactive,
                          ]}
                        >
                          {coordinadorLocal.habilitado ? 'Habilitado' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.statusBoxDesc}>
                      {coordinadorLocal.habilitado
                        ? 'Autorizado operativamente para coordinar recintos y gestionar veedores.'
                        : 'Cuenta suspendida administrativamente para funciones operativas.'}
                    </Text>
                  </View>

                  {/* 2. Estado de Activación y Acceso al Sistema */}
                  <View style={styles.statusBox}>
                    <View style={styles.statusBoxTop}>
                      <View style={styles.statusBoxLabelGroup}>
                        <UserCheck size={14} color={BrandColors.azulPrincipal} />
                        <Text style={styles.statusBoxLabel}>Acceso al Sistema (ADR-02)</Text>
                      </View>
                      <View
                        style={[
                          styles.activationPill,
                          tieneRecinto && styles.activationPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.activationPillText,
                            tieneRecinto && styles.activationPillTextActive,
                          ]}
                        >
                          {tieneRecinto ? 'Cuenta Activada' : 'Perfil Registrado'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.statusBoxDesc}>
                      {tieneRecinto
                        ? 'El coordinador confirmó su correo, definió su contraseña personal y cuenta con asignación vigente.'
                        : 'La asignación de recinto requiere que el titular haya confirmado su correo e iniciado sesión con su contraseña.'}
                    </Text>
                    {fechaFormateada ? (
                      <View style={styles.fechaRow}>
                        <Calendar size={11} color={BrandColors.textoMuted} />
                        <Text style={styles.fechaText}>Alta en sistema: {fechaFormateada}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Bloque: Información de Contacto */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Datos de Contacto Oficial</Text>

                  {coordinadorLocal.cedula ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconBox}>
                        <CreditCard size={14} color={BrandColors.azulPrincipal} />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Cédula de Ciudadanía</Text>
                        <Text style={styles.contactValue}>{coordinadorLocal.cedula}</Text>
                      </View>
                    </View>
                  ) : null}

                  {coordinadorLocal.correo ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconBox}>
                        <Mail size={14} color={BrandColors.azulPrincipal} />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Correo Electrónico</Text>
                        <Text style={styles.contactValue}>{coordinadorLocal.correo}</Text>
                      </View>
                    </View>
                  ) : null}

                  {coordinadorLocal.telefono ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconBox}>
                        <Phone size={14} color={BrandColors.azulPrincipal} />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Teléfono Celular</Text>
                        <Text style={styles.contactValue}>{coordinadorLocal.telefono}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.buttonCloseModal}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonCloseModalText}>Regresar al Listado</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Selector de Recintos Reutilizado */}
      <SelectorRecintoModal
        visible={selectorVisible}
        recintos={recintosDisponibles}
        recintoSeleccionadoCodigo={
          tieneRecinto ? coordinadorLocal.recintoCodigo : undefined
        }
        onSeleccionar={handleSeleccionarRecinto}
        onCerrar={() => setSelectorVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(37, 61, 89, 0.55)',
  },
  card: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.hero,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
  },
  coordAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordAvatarText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.blancoSuperficie,
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.azulTitulos,
  },
  subtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.superficieCalida,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    gap: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
    letterSpacing: 0.2,
  },
  asignadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  asignadoPillText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
    color: '#0D6832',
  },
  btnAsignarRecinto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.azulTitulos,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginTop: 4,
    ...Elevations.subtle,
  },
  btnAsignarRecintoText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.blancoSuperficie,
  },
  btnReasignarRecinto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.superficieCalida,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginTop: 4,
  },
  btnReasignarRecintoText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  btnActionDisabled: {
    opacity: 0.5,
  },
  alertaInactivoText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.rojoAlerta,
    marginTop: 2,
  },
  statusBox: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 4,
  },
  statusBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBoxLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBoxLabel: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11.5,
    color: BrandColors.azulTitulos,
  },
  statusBoxDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    lineHeight: 15,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  statusPillActive: {
    backgroundColor: BrandColors.verdeSobrioLight,
  },
  statusPillInactive: {
    backgroundColor: BrandColors.superficieCalida,
  },
  statusPillText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
  },
  statusPillTextActive: {
    color: BrandColors.verdeExito,
  },
  statusPillTextInactive: {
    color: BrandColors.textoMuted,
  },
  activationPill: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  activationPillActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  activationPillText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
    color: BrandColors.azulPrincipal,
  },
  activationPillTextActive: {
    color: '#0D6832',
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  fechaText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoMuted,
  },
  recintoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BrandColors.superficieCalida,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  recintoIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recintoInfo: {
    flex: 1,
  },
  recintoNombre: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  recintoMeta: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BrandColors.superficieCalida,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  contactIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoMuted,
  },
  contactValue: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },
  exitoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  exitoBannerText: {
    flex: 1,
    fontFamily: FontFamilies.bodyBold,
    fontSize: 11.5,
    color: '#0D6832',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    flex: 1,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.rojoAlerta,
  },
  footer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.superficieCalida,
    marginTop: 4,
  },
  buttonCloseModal: {
    height: 40,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCloseModalText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.blancoSuperficie,
  },

  // Estilos de Vista de Confirmación
  confirmScrollContent: {
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  confirmHeader: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  confirmIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  confirmTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14.5,
    color: BrandColors.azulTitulos,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 15,
  },
  confirmBlock: {
    backgroundColor: BrandColors.superficieCalida,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 2,
  },
  confirmLabel: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
    color: BrandColors.textoMuted,
    letterSpacing: 0.5,
  },
  confirmValue: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  confirmSub: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  confirmWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF9C3',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  confirmWarnText: {
    flex: 1,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: '#854D0E',
    lineHeight: 14,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  confirmBtnCancel: {
    flex: 1,
    height: 40,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnCancelText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  confirmBtnSubmit: {
    flex: 1.5,
    height: 40,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Elevations.subtle,
  },
  confirmBtnSubmitDisabled: {
    opacity: 0.6,
  },
  confirmBtnSubmitText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.blancoSuperficie,
  },
});
