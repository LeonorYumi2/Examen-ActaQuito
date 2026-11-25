import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, ReduceMotion } from 'react-native-reanimated';
import {
  Building2,
  X,
  MapPin,
  Vote,
  UserCheck,
  FileText,
  ShieldCheck,
  AlertCircle,
  Camera,
  Users,
} from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import {
  operacionesPorRolRepositorio,
  type DetalleRecintoInfo,
} from '@/features/recintos/data/operaciones-roles';

export interface DetalleRecintoModalProps {
  visible: boolean;
  recintoCodigo: string | null;
  onClose: () => void;
}

export const DetalleRecintoModal: React.FC<DetalleRecintoModalProps> = ({
  visible,
  recintoCodigo,
  onClose,
}) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleRecintoInfo | null>(null);

  useEffect(() => {
    let activo = true;
    if (visible && recintoCodigo) {
      setCargando(true);
      setError(null);
      operacionesPorRolRepositorio
        .obtenerDetalleRecinto(recintoCodigo)
        .then((res) => {
          if (activo) {
            setDetalle(res);
            setCargando(false);
          }
        })
        .catch((err: any) => {
          if (activo) {
            setError(err?.message ?? 'No fue posible cargar el detalle del recinto.');
            setCargando(false);
          }
        });
    } else {
      setDetalle(null);
    }
    return () => {
      activo = false;
    };
  }, [visible, recintoCodigo]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
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
            <View style={styles.headerIconBox}>
              <Building2 size={20} color={BrandColors.azulTitulos} />
            </View>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title} numberOfLines={2}>
                {detalle?.recinto.nombre ?? 'Detalle de Recinto Electoral'}
              </Text>
              <Text style={styles.subtitle}>
                {detalle
                  ? `Código: ${detalle.recinto.codigo} · Cantón Quito`
                  : 'Cargando información…'}
              </Text>
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

          {/* Contenido con scroll */}
          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
              <Text style={styles.loadingText}>Consultando catálogo y asignaciones…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color={BrandColors.rojoAlerta} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : detalle ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Bloque Territorial: Parroquia y Tipo */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Ubicación Territorial</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <MapPin size={12} color={BrandColors.azulTitulos} />
                    <Text style={styles.metaBadgeText}>
                      {detalle.recinto.parroquiaNombre ?? detalle.recinto.parroquiaCodigo}
                    </Text>
                  </View>

                  {detalle.recinto.parroquiaTipo ? (
                    <View
                      style={[
                        styles.tipoBadge,
                        detalle.recinto.parroquiaTipo === 'urbana'
                          ? styles.tipoBadgeUrbana
                          : styles.tipoBadgeRural,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tipoBadgeText,
                          detalle.recinto.parroquiaTipo === 'urbana'
                            ? styles.tipoBadgeTextUrbana
                            : styles.tipoBadgeTextRural,
                        ]}
                      >
                        {detalle.recinto.parroquiaTipo === 'urbana'
                          ? 'Parroquia Urbana'
                          : 'Parroquia Rural'}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.coordBadge}>
                    <Text style={styles.coordText}>
                      GPS: {detalle.recinto.latitud.toFixed(4)}, {detalle.recinto.longitud.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bloque Coordinador Asignado */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Coordinación de Recinto</Text>
                {detalle.coordinador ? (
                  <View style={styles.coordCard}>
                    <View style={styles.coordAvatar}>
                      <Text style={styles.coordAvatarText}>
                        {detalle.coordinador.nombres.charAt(0)}
                        {detalle.coordinador.apellidos.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.coordInfo}>
                      <Text style={styles.coordNombre}>
                        {detalle.coordinador.nombres} {detalle.coordinador.apellidos}
                      </Text>
                      {detalle.coordinador.correo ? (
                        <Text style={styles.coordMetaText}>{detalle.coordinador.correo}</Text>
                      ) : null}
                      {detalle.coordinador.telefono ? (
                        <Text style={styles.coordMetaText}>Tel: {detalle.coordinador.telefono}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        detalle.coordinador.habilitado
                          ? styles.statusPillActive
                          : styles.statusPillInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          detalle.coordinador.habilitado
                            ? styles.statusPillTextActive
                            : styles.statusPillTextInactive,
                        ]}
                      >
                        {detalle.coordinador.habilitado ? 'Habilitado' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyCardMini}>
                    <Users size={16} color={BrandColors.textoMuted} />
                    <Text style={styles.emptyCardMiniText}>
                      Sin coordinador asignado actualmente en este recinto.
                    </Text>
                  </View>
                )}
              </View>

              {/* Bloque Mesas JRV Reales */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Juntas Receptoras del Voto ({detalle.mesas.length})
                  </Text>
                  <Text style={styles.sectionSubtitleBadge}>Mesas oficiales</Text>
                </View>
                {detalle.mesas.length === 0 ? (
                  <View style={styles.emptyCardMini}>
                    <Vote size={16} color={BrandColors.textoMuted} />
                    <Text style={styles.emptyCardMiniText}>
                      No hay mesas JRV registradas para este recinto.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.mesasGrid}>
                    {detalle.mesas.map((m) => (
                      <View key={m.numero} style={styles.mesaChip}>
                        <Vote size={12} color={BrandColors.azulTitulos} />
                        <Text style={styles.mesaChipText}>
                          JRV #{String(m.numero).padStart(3, '0')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Bloque Estado de Actas y Veedores */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Supervisión Electoral del Recinto</Text>
                <View style={styles.statsSummaryGrid}>
                  {/* Card Veedores */}
                  <View style={styles.statBox}>
                    <View style={styles.statTopRow}>
                      <UserCheck size={14} color={BrandColors.azulPrincipal} />
                      <Text style={styles.statLabel}>Veedores</Text>
                    </View>
                    <Text style={styles.statNumber}>
                      {detalle.totalVeedoresAsignados}
                    </Text>
                    <Text style={styles.statSub}>Asignados a mesas</Text>
                  </View>

                  {/* Card Actas Totales */}
                  <View style={styles.statBox}>
                    <View style={styles.statTopRow}>
                      <FileText size={14} color={BrandColors.azulTitulos} />
                      <Text style={styles.statLabel}>Borradores</Text>
                    </View>
                    <Text style={styles.statNumber}>
                      {detalle.totalActas}
                    </Text>
                    <Text style={styles.statSub}>Actas registradas</Text>
                  </View>

                  {/* Card Evidencias */}
                  <View style={styles.statBox}>
                    <View style={styles.statTopRow}>
                      <Camera size={14} color={BrandColors.verdeExito} />
                      <Text style={styles.statLabel}>Evidencias</Text>
                    </View>
                    <Text style={styles.statNumber}>
                      {detalle.actasEvidenciadas}
                    </Text>
                    <Text style={styles.statSub}>Fotos validadas</Text>
                  </View>
                </View>

                {detalle.totalActas > 0 ? (
                  <View style={styles.dignidadesRow}>
                    <Text style={styles.dignidadesText}>
                      Desglose: {detalle.actasPorDignidad.alcaldia} Alcaldía · {detalle.actasPorDignidad.prefectura} Prefectura
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noActasText}>
                    Aún no se han transmitido borradores de actas en este recinto.
                  </Text>
                )}
              </View>
            </ScrollView>
          ) : null}

          {/* Footer con botón de cerrar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.buttonCloseModal}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonCloseModalText}>Cerrar Detalle</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    gap: 16,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionSubtitleBadge: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoMuted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  metaBadgeText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  tipoBadgeUrbana: {
    backgroundColor: BrandColors.superficieCalida,
    borderColor: BrandColors.grisAzuladoLight,
  },
  tipoBadgeRural: {
    backgroundColor: '#F3EFE6',
    borderColor: '#D4CBBF',
  },
  tipoBadgeText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  tipoBadgeTextUrbana: {
    color: BrandColors.azulPrincipal,
  },
  tipoBadgeTextRural: {
    color: '#6E5D4B',
  },
  coordBadge: {
    backgroundColor: BrandColors.superficieCalida,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  coordText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoMuted,
  },
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.sm,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  coordAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordAvatarText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.blancoSuperficie,
  },
  coordInfo: {
    flex: 1,
  },
  coordNombre: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  coordMetaText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
    marginTop: 1,
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
  emptyCardMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
  },
  emptyCardMiniText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    flex: 1,
  },
  mesasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mesaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaChipText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: Spacing.sm,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
  },
  statNumber: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
  },
  statSub: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 9.5,
    color: BrandColors.textoMuted,
    marginTop: 2,
  },
  dignidadesRow: {
    marginTop: 4,
  },
  dignidadesText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  noActasText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoMuted,
    fontStyle: 'italic',
    marginTop: 2,
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
});
