import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import {
  FileText,
  X,
  Camera,
  History,
  ShieldCheck,
  MapPin,
  Clock,
  Vote,
  Maximize2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  User,
} from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
  PoliticalParties,
} from '@/constants/tokens';
import {
  repositorioDetalleActa,
} from '@/features/actas/data/repositorio-detalle-acta';
import {
  type HistorialActa,
} from '@/features/actas/domain/historial-acta';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DetalleActaModalProps {
  visible: boolean;
  actaId: string | null;
  mesaInfo?: {
    recintoNombre?: string;
    mesaNumero?: number;
    dignidad?: string;
  };
  onClose: () => void;
}

export const DetalleActaModal: React.FC<DetalleActaModalProps> = ({
  visible,
  actaId,
  mesaInfo,
  onClose,
}) => {
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(true);
  const [historial, setHistorial] = useState<HistorialActa | null>(null);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const [cargandoFoto, setCargandoFoto] = useState<boolean>(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<boolean>(false);

  useEffect(() => {
    let activo = true;
    if (visible && actaId) {
      setCargandoHistorial(true);
      setErrorHistorial(null);
      setFotoUri(null);
      setErrorFoto(null);

      repositorioDetalleActa
        .cargarHistorial(actaId)
        .then((datos) => {
          if (activo) {
            setHistorial(datos);
            setCargandoHistorial(false);
          }
        })
        .catch((err: any) => {
          if (activo) {
            setErrorHistorial(err?.message ?? 'No se pudo cargar el historial del acta.');
            setCargandoHistorial(false);
          }
        });
    } else {
      setHistorial(null);
      setFotoUri(null);
      setErrorFoto(null);
      setFotoAmpliada(false);
    }

    return () => {
      activo = false;
      // Descartar imagen y datos privados de memoria inmediatamente
      setFotoUri(null);
      setHistorial(null);
    };
  }, [visible, actaId]);

  const descargarFoto = async () => {
    if (!actaId || cargandoFoto) return;
    setCargandoFoto(true);
    setErrorFoto(null);
    try {
      const res = await repositorioDetalleActa.descargarFotografia(actaId);
      setFotoUri(res.uri);
    } catch (err: any) {
      setErrorFoto(err?.message ?? 'No se pudo descargar la evidencia fotográfica.');
    } finally {
      setCargandoFoto(false);
    }
  };

  if (!visible) return null;

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
                <FileText size={18} color={BrandColors.blancoSuperficie} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerOverline}>AUDITORÍA ELECTORAL OFICIAL</Text>
                <Text style={styles.headerTitle}>Detalle e Historial de Acta</Text>
                <Text style={styles.headerSubtitle}>
                  {mesaInfo?.recintoNombre ?? 'Recinto Electoral'} · JRV #
                  {String(mesaInfo?.mesaNumero ?? 0).padStart(3, '0')} ·{' '}
                  {mesaInfo?.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'}
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
            {/* Sección: Evidencia Fotográfica */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionTitleRow}>
                <Camera size={16} color={BrandColors.azulTitulos} />
                <Text style={styles.sectionTitle}>Evidencia Fotográfica del Acta</Text>
              </View>

              {fotoUri ? (
                <View style={styles.photoContainer}>
                  <TouchableOpacity
                    style={styles.photoPreviewWrapper}
                    onPress={() => setFotoAmpliada(true)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <View style={styles.zoomPill}>
                      <Maximize2 size={13} color={BrandColors.blancoSuperficie} />
                      <Text style={styles.zoomPillText}>Tocar para ampliar</Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.photoPrivacyNote}>
                    Evidencia oficial descifrada en memoria para supervisión. No se almacena en disco.
                  </Text>
                </View>
              ) : cargandoFoto ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={BrandColors.azulPrincipal} />
                  <Text style={styles.loadingText}>
                    Descargando fotografía cifrada desde el servidor seguro…
                  </Text>
                </View>
              ) : (
                <View style={styles.downloadPromptBox}>
                  <Text style={styles.downloadPromptText}>
                    La fotografía oficial fue capturada y sellada criptográficamente por el veedor de mesa.
                  </Text>
                  {errorFoto && (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={14} color={BrandColors.rojoAlerta} />
                      <Text style={styles.errorText}>{errorFoto}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={descargarFoto}
                    activeOpacity={0.8}
                  >
                    <Camera size={15} color={BrandColors.blancoSuperficie} />
                    <Text style={styles.downloadButtonText}>Descargar fotografía oficial</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Sección: Historial de Versiones */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionTitleRow}>
                <History size={16} color={BrandColors.azulTitulos} />
                <Text style={styles.sectionTitle}>Historial de Revisiones y Correcciones</Text>
              </View>

              {cargandoHistorial ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={BrandColors.azulPrincipal} />
                  <Text style={styles.loadingText}>Consultando historial auditado…</Text>
                </View>
              ) : errorHistorial ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={BrandColors.rojoAlerta} />
                  <Text style={styles.errorText}>{errorHistorial}</Text>
                </View>
              ) : historial && historial.length > 0 ? (
                <View style={styles.timelineContainer}>
                  {historial.map((rev, index) => {
                    const esUltima = index === historial.length - 1;
                    const esInicial = rev.version === 1;

                    return (
                      <View key={rev.version} style={styles.revisionCard}>
                        {/* Header de la revisión */}
                        <View style={styles.revisionHeader}>
                          <View style={styles.versionBadge}>
                            <Text style={styles.versionBadgeText}>
                              {esInicial ? 'Versión 1 · Original' : `Versión ${rev.version} · Corrección`}
                            </Text>
                          </View>
                          {esUltima && (
                            <View style={styles.activeBadge}>
                              <CheckCircle2 size={11} color={BrandColors.verdeExito} />
                              <Text style={styles.activeBadgeText}>Vigente</Text>
                            </View>
                          )}
                        </View>

                        {/* Metadatos de autoría y fecha */}
                        <View style={styles.authorRow}>
                          <View style={styles.authorItem}>
                            <User size={13} color={BrandColors.azulPrincipal} />
                            <Text style={styles.authorText}>
                              {rev.nombres} {rev.apellidos}
                            </Text>
                          </View>
                          <View style={styles.authorItem}>
                            <ShieldCheck size={13} color={BrandColors.azulPrincipal} />
                            <Text style={styles.authorText}>C.I. {rev.cedula_enmascarada}</Text>
                          </View>
                        </View>

                        <View style={styles.timeRow}>
                          <Clock size={12} color={BrandColors.textoSecundario} />
                          <Text style={styles.timeText}>
                            {new Date(rev.recibida_en).toLocaleString('es-EC', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </Text>
                        </View>

                        {/* Geolocalización de corrección (si existe) */}
                        {rev.ubicacion && (
                          <View style={styles.gpsBox}>
                            <MapPin size={13} color={BrandColors.azulTitulos} />
                            <Text style={styles.gpsText}>
                              GPS verificado: Lat {rev.ubicacion.latitud.toFixed(5)}, Lon{' '}
                              {rev.ubicacion.longitud.toFixed(5)} (±
                              {Math.round(rev.ubicacion.precision_metros)}m)
                            </Text>
                          </View>
                        )}

                        {/* Comparación de cifras o desglose */}
                        <View style={styles.figuresTable}>
                          <View style={styles.figuresTableHeader}>
                            <Text style={styles.figuresColTitle}>Organización / Candidatura</Text>
                            {rev.anterior && (
                              <Text style={styles.figuresColHeader}>Anterior</Text>
                            )}
                            <Text style={styles.figuresColHeader}>
                              {rev.anterior ? 'Nueva' : 'Votos'}
                            </Text>
                          </View>

                          {/* Filas de votos por sigla */}
                          {Object.entries(rev.nuevo.votos).map(([sigla, valor]) => {
                            const party = (PoliticalParties as any)[sigla];
                            const valorAnterior = rev.anterior?.votos[sigla];
                            const cambio = valorAnterior != null && valorAnterior !== valor;

                            return (
                              <View
                                key={sigla}
                                style={[
                                  styles.figuresRow,
                                  cambio && styles.figuresRowHighlight,
                                ]}
                              >
                                <View style={styles.figuresPartyCell}>
                                  <View
                                    style={[
                                      styles.partyDot,
                                      { backgroundColor: party?.color ?? BrandColors.azulPrincipal },
                                    ]}
                                  />
                                  <Text style={styles.partySiglaText}>{sigla}</Text>
                                  <Text
                                    style={styles.candidateNameText}
                                    numberOfLines={1}
                                  >
                                    {party?.name ?? ''}
                                  </Text>
                                </View>

                                {rev.anterior && (
                                  <Text style={styles.figuresOldValue}>
                                    {valorAnterior ?? '-'}
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.figuresNewValue,
                                    cambio && styles.figuresNewValueBold,
                                  ]}
                                >
                                  {valor}
                                </Text>
                              </View>
                            );
                          })}

                          {/* Blancos */}
                          <View style={styles.figuresRow}>
                            <Text style={styles.figuresLabel}>Votos en blanco</Text>
                            {rev.anterior && (
                              <Text style={styles.figuresOldValue}>
                                {rev.anterior.blancos}
                              </Text>
                            )}
                            <Text style={styles.figuresNewValue}>{rev.nuevo.blancos}</Text>
                          </View>

                          {/* Nulos */}
                          <View style={styles.figuresRow}>
                            <Text style={styles.figuresLabel}>Votos nulos</Text>
                            {rev.anterior && (
                              <Text style={styles.figuresOldValue}>
                                {rev.anterior.nulos}
                              </Text>
                            )}
                            <Text style={styles.figuresNewValue}>{rev.nuevo.nulos}</Text>
                          </View>

                          {/* Sufragantes */}
                          <View style={[styles.figuresRow, styles.figuresRowTotal]}>
                            <Text style={styles.figuresLabelTotal}>Total Sufragantes</Text>
                            {rev.anterior && (
                              <Text style={styles.figuresOldValue}>
                                {rev.anterior.sufragantes}
                              </Text>
                            )}
                            <Text style={styles.figuresTotalValue}>
                              {rev.nuevo.sufragantes}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyHistorialBox}>
                  <Text style={styles.emptyHistorialText}>
                    No hay revisiones registradas aún para esta acta.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Cerrar Detalle</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Modal Pantalla Completa para Fotografía Ampliada */}
        {fotoAmpliada && fotoUri && (
          <Modal
            visible={fotoAmpliada}
            transparent
            animationType="fade"
            onRequestClose={() => setFotoAmpliada(false)}
          >
            <View style={styles.fullPhotoOverlay}>
              <TouchableOpacity
                style={styles.fullPhotoCloseButton}
                onPress={() => setFotoAmpliada(false)}
                activeOpacity={0.8}
              >
                <X size={24} color={BrandColors.blancoSuperficie} />
              </TouchableOpacity>
              <Image
                source={{ uri: fotoUri }}
                style={styles.fullPhotoImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
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
    maxWidth: 540,
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
  sectionBox: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
  },
  photoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 190,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: BrandColors.azulSuperficie,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(37, 61, 89, 0.85)',
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  zoomPillText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.blancoSuperficie,
  },
  photoPrivacyNote: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
  },
  downloadPromptBox: {
    paddingVertical: Spacing.xs,
    gap: 10,
  },
  downloadPromptText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    lineHeight: 17,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  downloadButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
  loadingBox: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlerta,
  },
  errorText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    flex: 1,
  },
  timelineContainer: {
    gap: Spacing.md,
  },
  revisionCard: {
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  revisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  versionBadge: {
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  versionBadgeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF5EE',
    borderRadius: Radii.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#B8E0C2',
  },
  activeBadgeText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10,
    color: BrandColors.verdeExito,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: 4,
  },
  authorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  timeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  gpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: 8,
  },
  gpsText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10,
    color: BrandColors.azulTitulos,
  },
  figuresTable: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  figuresTableHeader: {
    flexDirection: 'row',
    backgroundColor: BrandColors.azulSuperficie,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
  },
  figuresColTitle: {
    flex: 1,
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    color: BrandColors.azulTitulos,
  },
  figuresColHeader: {
    width: 50,
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    color: BrandColors.azulTitulos,
    textAlign: 'right',
  },
  figuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.superficieCalida,
  },
  figuresRowHighlight: {
    backgroundColor: '#FEF3C7',
  },
  figuresRowTotal: {
    backgroundColor: BrandColors.azulSuperficie,
    borderBottomWidth: 0,
  },
  figuresPartyCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
  },
  partySiglaText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  candidateNameText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    flex: 1,
  },
  figuresLabel: {
    flex: 1,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  figuresLabelTotal: {
    flex: 1,
    fontFamily: FontFamilies.titleBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  figuresOldValue: {
    width: 50,
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'right',
    textDecorationLine: 'line-through',
  },
  figuresNewValue: {
    width: 50,
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
    textAlign: 'right',
  },
  figuresNewValueBold: {
    fontFamily: FontFamilies.titleBold,
    color: '#D97706',
  },
  figuresTotalValue: {
    width: 50,
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
    textAlign: 'right',
  },
  emptyHistorialBox: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyHistorialText: {
    fontFamily: FontFamilies.bodyRegular,
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
  fullPhotoOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPhotoCloseButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  fullPhotoImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
});