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
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
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
  Vote,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import { EditorialLottie } from '@/components/ui/editorial-lottie';
import type { VeedorInfo, MesaJrvInfo, RecintoInfo } from '@/features/recintos/data/operaciones-roles';
import { repositorioInvitaciones } from '@/features/users/data/repositorio-invitaciones';

export interface DetalleVeedorModalProps {
  visible: boolean;
  veedor: VeedorInfo | null;
  recinto: RecintoInfo | null;
  mesas: MesaJrvInfo[];
  onClose: () => void;
  onAsignacionExitosa?: () => void;
}

export const DetalleVeedorModal: React.FC<DetalleVeedorModalProps> = ({
  visible,
  veedor,
  recinto,
  mesas,
  onClose,
  onAsignacionExitosa,
}) => {
  const [veedorLocal, setVeedorLocal] = useState<VeedorInfo | null>(veedor);
  const [selectorVisible, setSelectorVisible] = useState<boolean>(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaJrvInfo | null>(null);
  const [confirmacionVisible, setConfirmacionVisible] = useState<boolean>(false);
  const [cargandoAsignacion, setCargandoAsignacion] = useState<boolean>(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [exitoAsignacion, setExitoAsignacion] = useState<string | null>(null);

  useEffect(() => {
    setVeedorLocal(veedor);
    setErrorAsignacion(null);
    setExitoAsignacion(null);
    setConfirmacionVisible(false);
    setMesaSeleccionada(null);
    setSelectorVisible(false);
  }, [veedor, visible]);

  if (!visible || !veedorLocal) return null;

  const tieneMesa = veedorLocal.mesaAsignada !== undefined;

  const handleSeleccionarMesa = (m: MesaJrvInfo) => {
    setErrorAsignacion(null);
    setExitoAsignacion(null);
    setMesaSeleccionada(m);
    setConfirmacionVisible(true);
  };

  const handleConfirmarAsignacion = async () => {
    if (!veedorLocal || !recinto || !mesaSeleccionada || cargandoAsignacion) return;

    setCargandoAsignacion(true);
    setErrorAsignacion(null);
    setExitoAsignacion(null);

    try {
      const res = await repositorioInvitaciones.asignarVeedorExistente(
        recinto.codigo,
        mesaSeleccionada.numero,
        veedorLocal.id,
        mesaSeleccionada.asignacionVigenteId
      );

      if (res.exito) {
        setExitoAsignacion(res.mensaje);
        setVeedorLocal((prev) =>
          prev ? { ...prev, mesaAsignada: mesaSeleccionada.numero } : prev
        );
        setConfirmacionVisible(false);
        setSelectorVisible(false);
        setMesaSeleccionada(null);

        if (onAsignacionExitosa) {
          onAsignacionExitosa();
        }
      } else {
        setErrorAsignacion(res.mensaje);
      }
    } catch (err: any) {
      setErrorAsignacion(err?.message ?? 'No se pudo completar la asignación.');
    } finally {
      setCargandoAsignacion(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(200)}
          exiting={ZoomOut.duration(160)}
          style={styles.modalCard}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBadge}>
                <UserCheck size={18} color={BrandColors.blancoSuperficie} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerOverline}>VEEDURÍA ELECTORAL CIUDADANA · ADR-02</Text>
                <Text style={styles.headerTitle}>Ficha del Veedor</Text>
                <Text style={styles.headerSubtitle}>
                  {recinto?.nombre ?? 'Recinto'} ({recinto?.codigo})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Cerrar modal"
              activeOpacity={0.7}
            >
              <X size={20} color={BrandColors.azulTitulos} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Tarjeta de Identidad */}
            <View style={styles.identityCard}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {veedorLocal.nombres.charAt(0)}
                    {veedorLocal.apellidos.charAt(0)}
                  </Text>
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.veedorFullName}>
                    {veedorLocal.nombres} {veedorLocal.apellidos}
                  </Text>
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        veedorLocal.habilitado
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <ShieldCheck
                        size={12}
                        color={
                          veedorLocal.habilitado
                            ? BrandColors.verdeExito
                            : BrandColors.textoSecundario
                        }
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          veedorLocal.habilitado
                            ? styles.statusBadgeTextActive
                            : styles.statusBadgeTextInactive,
                        ]}
                      >
                        {veedorLocal.habilitado ? 'Habilitado' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Datos de Contacto */}
              <View style={styles.contactDetails}>
                {veedorLocal.cedula && (
                  <View style={styles.contactItem}>
                    <CreditCard size={14} color={BrandColors.azulPrincipal} />
                    <Text style={styles.contactLabel}>C.I.:</Text>
                    <Text style={styles.contactValue}>{veedorLocal.cedula}</Text>
                  </View>
                )}

                {veedorLocal.correo && (
                  <View style={styles.contactItem}>
                    <Mail size={14} color={BrandColors.azulPrincipal} />
                    <Text style={styles.contactLabel}>Correo:</Text>
                    <Text style={styles.contactValue}>{veedorLocal.correo}</Text>
                  </View>
                )}

                {veedorLocal.telefono && (
                  <View style={styles.contactItem}>
                    <Phone size={14} color={BrandColors.azulPrincipal} />
                    <Text style={styles.contactLabel}>Celular:</Text>
                    <Text style={styles.contactValue}>{veedorLocal.telefono}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Banners de Feedback */}
            {exitoAsignacion && (
              <View style={styles.successBanner}>
                <EditorialLottie
                  type="exito"
                  size={28}
                  loop={false}
                  accessibilityLabel="Asignación confirmada con éxito"
                />
                <Text style={styles.successBannerText}>{exitoAsignacion}</Text>
              </View>
            )}

            {errorAsignacion && (
              <View style={styles.errorBanner}>
                <EditorialLottie
                  type="error"
                  size={28}
                  loop={false}
                  accessibilityLabel="Error en la asignación"
                />
                <Text style={styles.errorBannerText}>{errorAsignacion}</Text>
              </View>
            )}

            {/* Estado de Asignación de Mesa */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionTitleRow}>
                <Vote size={16} color={BrandColors.azulTitulos} />
                <Text style={styles.sectionTitle}>Asignación de Junta Receptora del Voto</Text>
              </View>

              {tieneMesa ? (
                <View style={styles.mesaAsignadaCard}>
                  <View style={styles.mesaAsignadaTop}>
                    <Text style={styles.mesaAsignadaLabel}>Mesa Oficial Asignada</Text>
                    <View style={styles.activePill}>
                      <CheckCircle2 size={11} color={BrandColors.verdeExito} />
                      <Text style={styles.activePillText}>Activa</Text>
                    </View>
                  </View>

                  <Text style={styles.mesaAsignadaNumber}>
                    Junta Receptora #{String(veedorLocal.mesaAsignada).padStart(3, '0')}
                  </Text>
                  <Text style={styles.mesaAsignadaRecinto}>
                    {recinto?.nombre ?? 'Recinto electoral asignado'}
                  </Text>
                </View>
              ) : (
                <View style={styles.sinMesaCard}>
                  <View style={styles.sinMesaIconBox}>
                    <AlertCircle size={22} color="#D97706" />
                  </View>
                  <View style={styles.sinMesaTextGroup}>
                    <Text style={styles.sinMesaTitle}>Sin mesa específica asignada</Text>
                    <Text style={styles.sinMesaDesc}>
                      El veedor ya activó su cuenta pero requiere una JRV asignada para registrar y transmitir actas de Alcaldía y Prefectura.
                    </Text>
                  </View>
                </View>
              )}

              {/* Botón Principal para Abrir Selector */}
              {!selectorVisible && !confirmacionVisible && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectorVisible(true);
                    setErrorAsignacion(null);
                    setExitoAsignacion(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Vote size={15} color={BrandColors.blancoSuperficie} />
                  <Text style={styles.actionButtonText}>
                    {tieneMesa ? 'Reasignar a otra mesa JRV' : 'Asignar mesa JRV'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Selector de Mesas del Recinto */}
            {selectorVisible && !confirmacionVisible && (
              <View style={styles.selectorContainer}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Mesas del Recinto {recinto?.nombre}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectorVisible(false)}
                    style={styles.selectorCloseBtn}
                  >
                    <Text style={styles.selectorCloseBtnText}>Ocultar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mesasList}>
                  {mesas.map((m) => {
                    const esActual = m.numero === veedorLocal.mesaAsignada;
                    const ocupada = Boolean(m.veedorAsignadoNombre && !esActual);

                    return (
                      <TouchableOpacity
                        key={m.numero}
                        style={[
                          styles.mesaOptionCard,
                          esActual && styles.mesaOptionActual,
                          ocupada && styles.mesaOptionOcupada,
                        ]}
                        disabled={esActual}
                        onPress={() => handleSeleccionarMesa(m)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.mesaOptionLeft}>
                          <View
                            style={[
                              styles.mesaNumberBox,
                              esActual && styles.mesaNumberBoxActual,
                              ocupada && styles.mesaNumberBoxOcupada,
                            ]}
                          >
                            <Text
                              style={[
                                styles.mesaNumberText,
                                esActual && styles.mesaNumberTextActual,
                              ]}
                            >
                              JRV {String(m.numero).padStart(3, '0')}
                            </Text>
                          </View>

                          <View style={styles.mesaStatusGroup}>
                            {esActual ? (
                              <View style={styles.pillActual}>
                                <Text style={styles.pillActualText}>Asignación actual</Text>
                              </View>
                            ) : ocupada ? (
                              <View style={styles.pillOcupada}>
                                <Text style={styles.pillOcupadaText} numberOfLines={1}>
                                  Ocupada · Veedor: {m.veedorAsignadoNombre}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.pillDisponible}>
                                <Text style={styles.pillDisponibleText}>Disponible · Sin veedor</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {!esActual && (
                          <ChevronRight size={16} color={BrandColors.azulTitulos} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Confirmación antes de Asignar (ADR-02) */}
            {confirmacionVisible && mesaSeleccionada && (
              <View style={styles.confirmBox}>
                <View style={styles.confirmHeaderRow}>
                  {mesaSeleccionada.veedorAsignadoNombre ? (
                    <AlertTriangle size={18} color="#D97706" />
                  ) : (
                    <Vote size={18} color={BrandColors.azulTitulos} />
                  )}
                  <Text style={styles.confirmTitle}>
                    {mesaSeleccionada.veedorAsignadoNombre
                      ? 'Confirmar Reemplazo de Asignación'
                      : 'Confirmar Asignación de Mesa'}
                  </Text>
                </View>

                {mesaSeleccionada.veedorAsignadoNombre ? (
                  <Text style={styles.confirmWarningText}>
                    La JRV #{String(mesaSeleccionada.numero).padStart(3, '0')} está asignada actualmente a{' '}
                    <Text style={styles.boldText}>{mesaSeleccionada.veedorAsignadoNombre}</Text>. Al confirmar,
                    su asignación finalizará formalmente y se registrará la trazabilidad oficial del
                    reemplazo en el sistema (ADR-02). Las actas previas registradas conservan su validez histórica.
                  </Text>
                ) : (
                  <Text style={styles.confirmStandardText}>
                    Se asignará a <Text style={styles.boldText}>{veedorLocal.nombres} {veedorLocal.apellidos}</Text> a
                    la <Text style={styles.boldText}>JRV #{String(mesaSeleccionada.numero).padStart(3, '0')}</Text> de{' '}
                    {recinto?.nombre}.
                  </Text>
                )}

                <View style={styles.confirmActionsRow}>
                  <TouchableOpacity
                    style={[styles.btnConfirmar, cargandoAsignacion && styles.btnDisabled]}
                    disabled={cargandoAsignacion}
                    onPress={() => void handleConfirmarAsignacion()}
                    activeOpacity={0.8}
                  >
                    {cargandoAsignacion ? (
                      <EditorialLottie
                        type="proceso"
                        size={22}
                        loop
                        accessibilityLabel="Procesando asignación oficial en servidor"
                      />
                    ) : (
                      <>
                        <Vote size={15} color={BrandColors.blancoSuperficie} />
                        <Text style={styles.btnConfirmarText}>
                          {mesaSeleccionada.veedorAsignadoNombre
                            ? 'Confirmar Reemplazo'
                            : 'Confirmar Asignación'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnCancelar}
                    disabled={cargandoAsignacion}
                    onPress={() => {
                      setConfirmacionVisible(false);
                      setMesaSeleccionada(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              disabled={cargandoAsignacion}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Cerrar Ficha</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 36, 51, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  backdropPressable: {
    flex: 1,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: BrandColors.fondoMarfil,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Elevations.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
    backgroundColor: BrandColors.blancoSuperficie,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9,
    color: BrandColors.azulPrincipal,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 17,
    color: BrandColors.azulTitulos,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  modalScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  identityCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: Spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BrandColors.azulBorde,
  },
  avatarLargeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 18,
    color: BrandColors.azulTitulos,
  },
  identityInfo: {
    flex: 1,
  },
  veedorFullName: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.azulTitulos,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#EBF5EE',
    borderColor: '#B8E0C2',
  },
  statusBadgeInactive: {
    backgroundColor: BrandColors.superficieCalida,
    borderColor: BrandColors.azulBorde,
  },
  statusBadgeText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10.5,
  },
  statusBadgeTextActive: {
    color: BrandColors.verdeExito,
  },
  statusBadgeTextInactive: {
    color: BrandColors.textoSecundario,
  },
  contactDetails: {
    borderTopWidth: 1,
    borderTopColor: BrandColors.superficieCalida,
    paddingTop: Spacing.xs,
    gap: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactLabel: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    width: 52,
  },
  contactValue: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.azulTitulos,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5EE',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#B8E0C2',
  },
  successBannerText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 12,
    color: BrandColors.verdeExito,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlerta,
  },
  errorBannerText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    flex: 1,
  },
  sectionBox: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  mesaAsignadaCard: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaAsignadaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mesaAsignadaLabel: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF5EE',
    borderRadius: Radii.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#B8E0C2',
  },
  activePillText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    color: BrandColors.verdeExito,
  },
  mesaAsignadaNumber: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 17,
    color: BrandColors.azulTitulos,
  },
  mesaAsignadaRecinto: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  sinMesaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sinMesaIconBox: {
    marginTop: 2,
  },
  sinMesaTextGroup: {
    flex: 1,
  },
  sinMesaTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: '#92400E',
  },
  sinMesaDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 10,
  },
  actionButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.blancoSuperficie,
  },
  selectorContainer: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 10,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
    paddingBottom: 6,
  },
  selectorTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  selectorCloseBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectorCloseBtnText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  mesasList: {
    gap: 8,
  },
  mesaOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaOptionActual: {
    backgroundColor: BrandColors.azulSuperficie,
    borderColor: BrandColors.azulPrincipal,
    opacity: 0.7,
  },
  mesaOptionOcupada: {
    borderColor: '#FDE68A',
  },
  mesaOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mesaNumberBox: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaNumberBoxActual: {
    backgroundColor: BrandColors.azulTitulos,
    borderColor: BrandColors.azulTitulos,
  },
  mesaNumberBoxOcupada: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  mesaNumberText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  mesaNumberTextActual: {
    color: BrandColors.blancoSuperficie,
  },
  mesaStatusGroup: {
    flex: 1,
  },
  pillActual: {
    backgroundColor: BrandColors.azulTitulos,
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  pillActualText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10,
    color: BrandColors.blancoSuperficie,
  },
  pillOcupada: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillOcupadaText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10,
    color: '#92400E',
  },
  pillDisponible: {
    backgroundColor: '#EBF5EE',
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#B8E0C2',
  },
  pillDisponibleText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10,
    color: BrandColors.verdeExito,
  },
  confirmBox: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: BrandColors.azulBorde,
    gap: 10,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
    paddingBottom: 6,
  },
  confirmTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  confirmWarningText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    lineHeight: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  confirmStandardText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    lineHeight: 17,
  },
  boldText: {
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  btnConfirmar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnConfirmarText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.blancoSuperficie,
  },
  btnCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.superficieCalida,
  },
  btnCancelarText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
  modalFooter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: BrandColors.blancoSuperficie,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulBorde,
  },
  doneButton: {
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
});