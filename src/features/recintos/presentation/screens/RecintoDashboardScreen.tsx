import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import {
  Building2,
  Vote,
  Users,
  UserPlus,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  RefreshCw,
} from 'lucide-react-native';
import { BrandColors, Elevations, Radii, Spacing, FontFamilies } from '@/constants/tokens';
import { InstitutionalHeader } from '@/components/ui/institutional-header';
import { CampoBusqueda } from '@/components/ui';
import { useAuth } from '@/features/auth/presentation/auth-state';
import {
  operacionesPorRolRepositorio,
  type RecintoInfo,
  type MesaJrvInfo,
  type VeedorInfo,
  type ActaProvincialInfo,
} from '@/features/recintos/data/operaciones-roles';

export type RecintoTabType = 'mesas' | 'veedores' | 'actas';

interface RecintoDashboardScreenProps {
  initialTab?: RecintoTabType;
}

export const RecintoDashboardScreen: React.FC<RecintoDashboardScreenProps> = ({
  initialTab = 'mesas',
}) => {
  const access = useAuth((state) => state.access);
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<RecintoTabType>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [recinto, setRecinto] = useState<RecintoInfo | null>(null);
  const [mesas, setMesas] = useState<MesaJrvInfo[]>([]);
  const [veedores, setVeedores] = useState<VeedorInfo[]>([]);
  const [actas, setActas] = useState<ActaProvincialInfo[]>([]);
  const [error, setError] = useState<string>();

  const cargarDatos = async () => {
    if (!access || access.kind !== 'operational') return;
    try {
      setError(undefined);
      const datosRecinto = await operacionesPorRolRepositorio.obtenerRecintoCoordinado(
        access.profile.id
      );

      setRecinto(datosRecinto.recinto);
      setMesas(datosRecinto.mesas);
      setVeedores(datosRecinto.veedores);

      if (datosRecinto.recinto) {
        const actasData = await operacionesPorRolRepositorio.listarActasRecinto(
          datosRecinto.recinto.codigo
        );
        setActas(actasData);
      } else {
        setActas([]);
      }
    } catch (err: any) {
      setError(err?.message ?? 'No fue posible cargar la información del recinto.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, [access]);

  const handleRefresh = () => {
    setRefreshing(true);
    void cargarDatos();
  };

  const mesasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return mesas;
    const q = busqueda.trim().toLowerCase();
    return mesas.filter(
      (m) =>
        String(m.numero).includes(q) ||
        `jrv ${m.numero}`.includes(q) ||
        `jrv #${m.numero}`.includes(q)
    );
  }, [mesas, busqueda]);

  const veedoresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return veedores;
    const q = busqueda.trim().toLowerCase();
    return veedores.filter(
      (v) =>
        `${v.nombres} ${v.apellidos}`.toLowerCase().includes(q) ||
        (v.mesaAsignada && String(v.mesaAsignada).includes(q))
    );
  }, [veedores, busqueda]);

  const actasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return actas;
    const q = busqueda.trim().toLowerCase();
    return actas.filter(
      (a) =>
        a.dignidadCodigo.toLowerCase().includes(q) ||
        String(a.mesaNumero).includes(q) ||
        (a.autorNombre && a.autorNombre.toLowerCase().includes(q))
    );
  }, [actas, busqueda]);

  if (!access) return null;
  if (access.kind !== 'operational' || access.profile.role !== 'recinto') {
    return <Redirect href="/" />;
  }

  // Padding horizontal adaptable (20dp a 24dp)
  const horizontalPadding = Math.max(20, Math.min(24, Math.floor(width * 0.055)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.blancoSuperficie} />

      <InstitutionalHeader
        role="recinto"
        userName={access.profile.name}
        isOffline={access.offline}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: horizontalPadding, paddingBottom: 88 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[BrandColors.azulTitulos]}
            tintColor={BrandColors.azulTitulos}
          />
        }
      >
        {/* Recinto Hero Card */}
        {recinto ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBox}>
                <Building2 size={20} color={BrandColors.azulTitulos} />
              </View>
              <View style={styles.heroTitleGroup}>
                <Text style={styles.heroOverline}>RECINTO ELECTORAL ASIGNADO</Text>
                <Text style={styles.heroTitle}>{recinto.nombre}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroChip}>
                    <MapPin size={10} color={BrandColors.azulTitulos} />
                    <Text style={styles.heroChipText}>
                      {recinto.parroquiaNombre ?? recinto.parroquiaCodigo}
                    </Text>
                  </View>
                  <Text style={styles.heroCodeText}>Cód: {recinto.codigo}</Text>
                </View>
              </View>
            </View>

            {/* Quick Metrics of Recinto */}
            <View style={styles.heroMetricsGrid}>
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{mesas.length}</Text>
                <Text style={styles.heroMetricLabel}>Mesas JRV</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{veedores.length}</Text>
                <Text style={styles.heroMetricLabel}>Veedores</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{actas.length}</Text>
                <Text style={styles.heroMetricLabel}>Borradores</Text>
              </View>
            </View>

            {/* Action Button: Revisar / Corregir Actas */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push('/actas')}
              activeOpacity={0.8}
            >
              <FileCheck2 size={16} color={BrandColors.blancoSuperficie} />
              <Text style={styles.reviewButtonText}>Revisar y Corregir Actas</Text>
              <ChevronRight size={16} color={BrandColors.blancoSuperficie} />
            </TouchableOpacity>
          </View>
        ) : !loading ? (
          <View style={styles.emptyHeroCard}>
            <AlertCircle size={28} color={BrandColors.rojoAlerta} />
            <Text style={styles.emptyHeroTitle}>Sin recinto asignado</Text>
            <Text style={styles.emptyHeroDesc}>
              Tu cuenta de coordinador de recinto no tiene una asignación activa en este momento.
              Comunícate con la coordinación provincial para asignarte un recinto electoral.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={BrandColors.rojoAlerta} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                void cargarDatos();
              }}
              activeOpacity={0.7}
            >
              <RefreshCw size={12} color={BrandColors.azulTitulos} />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tab Selector */}
        {recinto ? (
          <>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'mesas' && styles.tabButtonActive]}
                onPress={() => setActiveTab('mesas')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'mesas' && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Mesas JRV ({mesas.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'veedores' && styles.tabButtonActive]}
                onPress={() => setActiveTab('veedores')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'veedores' && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Veedores ({veedores.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'actas' && styles.tabButtonActive]}
                onPress={() => setActiveTab('actas')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'actas' && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Actas ({actas.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar con botón de limpieza instantánea */}
            <CampoBusqueda
              valor={busqueda}
              alCambiar={setBusqueda}
              placeholder={`Buscar en ${activeTab}…`}
              style={styles.searchBarWrapper}
            />

            {/* Content List */}
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
                <Text style={styles.loadingText}>Cargando datos del recinto…</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {/* TAB: MESAS JRV */}
                {activeTab === 'mesas' && (
                  <>
                    {mesasFiltradas.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Vote size={28} color={BrandColors.grisAzulado} />
                        <Text style={styles.emptyStateTitle}>
                          {busqueda ? 'No hay mesas que coincidan' : 'No hay mesas configuradas'}
                        </Text>
                        <Text style={styles.emptyStateDesc}>
                          {busqueda
                            ? `No se encontraron juntas receptoras con "${busqueda}".`
                            : 'Este recinto no tiene Juntas Receptoras del Voto registradas.'}
                        </Text>
                      </View>
                    ) : (
                      mesasFiltradas.map((m) => {
                        const veedorMesa = veedores.find((v) => v.mesaAsignada === m.numero);
                        const actasMesa = actas.filter((a) => a.mesaNumero === m.numero);
                        return (
                          <View key={m.numero} style={styles.mesaCard}>
                            <View style={styles.mesaHeader}>
                              <View style={styles.mesaNumberBox}>
                                <Text style={styles.mesaNumberText}>
                                  JRV {String(m.numero).padStart(3, '0')}
                                </Text>
                              </View>
                              <View style={styles.actaCountPill}>
                                <Text style={styles.actaCountText}>
                                  {actasMesa.length} acta{actasMesa.length !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.mesaFooter}>
                              <View style={styles.mesaVeedorRow}>
                                <UserCheck size={13} color={BrandColors.azulPrincipal} />
                                <Text style={styles.mesaVeedorText}>
                                  {veedorMesa
                                    ? `${veedorMesa.nombres} ${veedorMesa.apellidos}`
                                    : 'Sin veedor asignado'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </>
                )}

                {/* TAB: VEEDORES */}
                {activeTab === 'veedores' && (
                  <>
                    {/* Botón de Acción Principal: Invitar Veedor */}
                    <View style={styles.sectionActionBar}>
                      <View style={styles.sectionActionTextGroup}>
                        <Text style={styles.sectionActionTitle}>Veeduría del Recinto</Text>
                        <Text style={styles.sectionActionSubtitle}>
                          {veedores.length} veedor{veedores.length !== 1 ? 'es' : ''} registrado{veedores.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.inviteButton, !recinto && styles.inviteButtonDisabled]}
                        onPress={() => {
                          if (recinto) router.push('/recinto/invitar-veedor');
                        }}
                        disabled={!recinto}
                        activeOpacity={0.8}
                      >
                        <UserPlus size={14} color={BrandColors.blancoSuperficie} />
                        <Text style={styles.inviteButtonText}>Invitar veedor</Text>
                      </TouchableOpacity>
                    </View>

                    {veedoresFiltrados.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Users size={28} color={BrandColors.grisAzulado} />
                        <Text style={styles.emptyStateTitle}>
                          {busqueda ? 'Sin coincidencias' : 'Sin veedores registrados'}
                        </Text>
                        <Text style={styles.emptyStateDesc}>
                          {busqueda
                            ? `No se encontró ningún veedor con "${busqueda}".`
                            : 'No hay veedores con asignación en este recinto electoral.'}
                        </Text>
                      </View>
                    ) : (
                      veedoresFiltrados.map((v) => (
                        <View key={v.id} style={styles.veedorCard}>
                          <View style={styles.veedorAvatar}>
                            <Text style={styles.veedorAvatarText}>
                              {v.nombres.charAt(0)}
                              {v.apellidos.charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.veedorInfo}>
                            <Text style={styles.veedorName}>
                              {v.nombres} {v.apellidos}
                            </Text>
                            <Text style={styles.veedorMesa}>
                              {v.mesaAsignada !== undefined
                                ? `Asignado a JRV #${String(v.mesaAsignada).padStart(3, '0')}`
                                : 'Sin mesa específica asignada'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.chipStatus,
                              v.habilitado ? styles.chipStatusActive : styles.chipStatusInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipStatusText,
                                v.habilitado
                                  ? styles.chipStatusTextActive
                                  : styles.chipStatusTextInactive,
                              ]}
                            >
                              {v.habilitado ? 'Habilitado' : 'Inactivo'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </>
                )}

                {/* TAB: ACTAS */}
                {activeTab === 'actas' && (
                  <>
                    {actasFiltradas.length === 0 ? (
                      <View style={styles.emptyState}>
                        <FileText size={28} color={BrandColors.grisAzulado} />
                        <Text style={styles.emptyStateTitle}>
                          {busqueda ? 'Sin coincidencias' : 'Sin actas en este recinto'}
                        </Text>
                        <Text style={styles.emptyStateDesc}>
                          {busqueda
                            ? `No se encontraron actas con "${busqueda}".`
                            : 'Aún no se han recibido actas de veedores para las mesas de este recinto.'}
                        </Text>
                      </View>
                    ) : (
                      actasFiltradas.map((acta) => (
                        <View key={acta.id} style={styles.actaCard}>
                          <View style={styles.actaTop}>
                            <View style={styles.actaDignidadBadge}>
                              <Text style={styles.actaDignidadText}>
                                {acta.dignidadCodigo === 'ALCALDIA'
                                  ? 'Alcaldía de Quito'
                                  : 'Prefectura Pichincha'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.actaEvidenciaBadge,
                                acta.tieneEvidencia
                                  ? styles.actaEvidenciaBadgeSuccess
                                  : styles.actaEvidenciaBadgeDraft,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.actaEvidenciaText,
                                  acta.tieneEvidencia
                                    ? styles.actaEvidenciaTextSuccess
                                    : styles.actaEvidenciaTextDraft,
                                ]}
                              >
                                {acta.tieneEvidencia ? 'Evidencia confirmada' : 'Borrador'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.actaMesaNumber}>
                            Junta Receptora del Voto #{String(acta.mesaNumero).padStart(3, '0')}
                          </Text>

                          <View style={styles.actaBottom}>
                            <View style={styles.actaMetaItem}>
                              <Clock size={12} color={BrandColors.textoSecundario} />
                              <Text style={styles.actaMetaText}>
                                {new Date(acta.creadaEn).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </View>
                            {acta.autorNombre ? (
                              <View style={styles.actaMetaItem}>
                                <ShieldCheck size={12} color={BrandColors.azulPrincipal} />
                                <Text style={styles.actaMetaText}>{acta.autorNombre}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))
                    )}
                  </>
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.fondoMarfil,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.md,
    ...Elevations.subtle,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  heroTitleGroup: {
    flex: 1,
  },
  heroOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: BrandColors.azulPrincipal,
  },
  heroTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  heroChipText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.azulTitulos,
  },
  heroCodeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoMuted,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    paddingVertical: 8,
    marginTop: 12,
  },
  heroMetricItem: {
    alignItems: 'center',
  },
  heroMetricValue: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
  },
  heroMetricLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  heroMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: BrandColors.azulBorde,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: 10,
    marginTop: 12,
  },
  reviewButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.blancoSuperficie,
  },
  emptyHeroCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    marginBottom: Spacing.md,
    gap: 4,
  },
  emptyHeroTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.rojoAlerta,
    marginTop: 4,
  },
  emptyHeroDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.rojoAlertaLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.rojoAlerta,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.blancoSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  retryButtonText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.azulTitulos,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.lg,
    padding: 3,
    marginBottom: Spacing.sm,
  },
  searchBarWrapper: {
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  tabButtonActive: {
    backgroundColor: BrandColors.blancoSuperficie,
    ...Elevations.subtle,
  },
  tabButtonText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  tabButtonTextActive: {
    color: BrandColors.azulTitulos,
    fontFamily: FontFamilies.titleBold,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12.5,
    color: BrandColors.textoSecundario,
  },
  listContainer: {
    gap: 8,
  },
  mesaCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  mesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mesaNumberBox: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  mesaNumberText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  actaCountPill: {
    backgroundColor: BrandColors.superficieCalida,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  actaCountText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
  },
  mesaFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  mesaVeedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mesaVeedorText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
  },
  veedorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 10,
    ...Elevations.subtle,
  },
  veedorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  veedorAvatarText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  veedorInfo: {
    flex: 1,
  },
  veedorName: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  veedorMesa: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  chipStatus: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  chipStatusActive: {
    backgroundColor: BrandColors.verdeExitoLight,
    borderColor: BrandColors.verdeSobrioBorder,
  },
  chipStatusInactive: {
    backgroundColor: BrandColors.superficieCalida,
    borderColor: BrandColors.azulBorde,
  },
  chipStatusText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 9.5,
  },
  chipStatusTextActive: {
    color: BrandColors.verdeExito,
  },
  chipStatusTextInactive: {
    color: BrandColors.textoMuted,
  },
  actaCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  actaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actaDignidadBadge: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  actaDignidadText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10.5,
    color: BrandColors.azulPrincipal,
  },
  actaEvidenciaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  actaEvidenciaBadgeSuccess: {
    backgroundColor: BrandColors.verdeExitoLight,
    borderColor: BrandColors.verdeSobrioBorder,
  },
  actaEvidenciaBadgeDraft: {
    backgroundColor: BrandColors.superficieCalida,
    borderColor: BrandColors.azulBorde,
  },
  actaEvidenciaText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 9.5,
  },
  actaEvidenciaTextSuccess: {
    color: BrandColors.verdeExito,
  },
  actaEvidenciaTextDraft: {
    color: BrandColors.textoSecundario,
  },
  actaMesaNumber: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
    marginTop: 4,
  },
  actaBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  actaMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actaMetaText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
  },
  emptyState: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 4,
  },
  emptyStateTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13.5,
    color: BrandColors.azulTitulos,
    marginTop: 4,
  },
  emptyStateDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
  },
  sectionActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: 6,
    ...Elevations.subtle,
  },
  sectionActionTextGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  sectionActionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  sectionActionSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.azulTitulos,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    ...Elevations.subtle,
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11.5,
    color: BrandColors.blancoSuperficie,
  },
});
