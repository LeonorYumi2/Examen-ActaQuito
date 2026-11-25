import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  TextInput,
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
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  RefreshCw,
  Shield,
  FileCheck,
} from 'lucide-react-native';
import { BrandColors, Elevations, Radii, Spacing, FontFamilies } from '@/constants/tokens';
import { InstitutionalHeader } from '@/components/ui/institutional-header';
import { useAuth } from '@/features/auth/presentation/auth-state';
import {
  operacionesPorRolRepositorio,
  type RecintoInfo,
  type CoordinadorRecintoInfo,
  type ResumenProvincial,
  type ActaProvincialInfo,
} from '@/features/recintos/data/operaciones-roles';

type TabType = 'recintos' | 'coordinadores' | 'actas';

export const ProvincialDashboardScreen: React.FC = () => {
  const access = useAuth((state) => state.access);
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabType>('recintos');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>('');

  const [resumen, setResumen] = useState<ResumenProvincial | null>(null);
  const [recintos, setRecintos] = useState<RecintoInfo[]>([]);
  const [coordinadores, setCoordinadores] = useState<CoordinadorRecintoInfo[]>([]);
  const [actas, setActas] = useState<ActaProvincialInfo[]>([]);
  const [error, setError] = useState<string>();

  const cargarDatos = async () => {
    try {
      setError(undefined);
      const [resumenRes, recintosRes, coordinadoresRes, actasRes] = await Promise.allSettled([
        operacionesPorRolRepositorio.obtenerResumenProvincial(),
        operacionesPorRolRepositorio.listarRecintosProvincial(),
        operacionesPorRolRepositorio.listarCoordinadoresProvincial(),
        operacionesPorRolRepositorio.listarActasProvincial(),
      ]);

      const errores: string[] = [];

      if (resumenRes.status === 'fulfilled') {
        setResumen(resumenRes.value);
      } else {
        errores.push(resumenRes.reason?.message ?? 'No se pudo cargar el resumen de métricas.');
      }

      if (recintosRes.status === 'fulfilled') {
        setRecintos(recintosRes.value);
      } else {
        errores.push(recintosRes.reason?.message ?? 'No se pudieron listar los recintos.');
      }

      if (coordinadoresRes.status === 'fulfilled') {
        setCoordinadores(coordinadoresRes.value);
      } else {
        errores.push(coordinadoresRes.reason?.message ?? 'No se pudieron listar los coordinadores.');
      }

      if (actasRes.status === 'fulfilled') {
        setActas(actasRes.value);
      } else {
        errores.push(actasRes.reason?.message ?? 'No se pudieron listar las actas provinciales.');
      }

      if (errores.length > 0) {
        setError(errores[0]);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Ocurrió un error inesperado al consultar los datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void cargarDatos();
  };

  const recintosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return recintos;
    const q = busqueda.toLowerCase().trim();
    return recintos.filter(
      (r) =>
        r.nombre.toLowerCase().includes(q) ||
        (r.parroquiaNombre && r.parroquiaNombre.toLowerCase().includes(q)) ||
        r.codigo.toLowerCase().includes(q)
    );
  }, [recintos, busqueda]);

  const coordinadoresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return coordinadores;
    const q = busqueda.toLowerCase().trim();
    return coordinadores.filter(
      (c) =>
        c.nombres.toLowerCase().includes(q) ||
        c.apellidos.toLowerCase().includes(q) ||
        (c.recintoNombre && c.recintoNombre.toLowerCase().includes(q))
    );
  }, [coordinadores, busqueda]);

  const actasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return actas;
    const q = busqueda.toLowerCase().trim();
    return actas.filter((a) => {
      const nombreRecinto = a.recintoNombre.toLowerCase();
      const codigo = a.recintoCodigo.toLowerCase();
      const dignidad = a.dignidadCodigo.toLowerCase();
      return nombreRecinto.includes(q) || codigo.includes(q) || dignidad.includes(q);
    });
  }, [actas, busqueda]);

  if (!access) return null;
  if (access.kind !== 'operational' || access.profile.role !== 'provincial') {
    return <Redirect href="/" />;
  }

  // Padding horizontal adaptable (20dp a 24dp)
  const horizontalPadding = Math.max(20, Math.min(24, Math.floor(width * 0.055)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.blancoSuperficie} />

      <InstitutionalHeader
        role="provincial"
        userName={access.profile.name}
        isOffline={access.offline}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: horizontalPadding },
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
        {/* Banner de error si ocurrió algún problema */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={BrandColors.rojoAlerta} style={styles.errorIcon} />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>No se pudo completar la sincronización</Text>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                void cargarDatos();
              }}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={BrandColors.azulTitulos} />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Métricas Compactas Bento (2x2) */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Recintos */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <View style={styles.metricIconBox}>
                <Building2 size={16} color={BrandColors.azulTitulos} />
              </View>
              <Text style={styles.metricLabel}>Recintos</Text>
            </View>
            <Text style={styles.metricValue}>
              {resumen ? resumen.totalRecintos : loading ? '…' : '—'}
            </Text>
            <Text style={styles.metricSubtext}>Ámbito Cantón Quito</Text>
          </View>

          {/* Card 2: Mesas JRV */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <View style={styles.metricIconBox}>
                <Vote size={16} color={BrandColors.azulTitulos} />
              </View>
              <Text style={styles.metricLabel}>Mesas JRV</Text>
            </View>
            <Text style={styles.metricValue}>
              {resumen ? resumen.totalMesas : loading ? '…' : '—'}
            </Text>
            <Text style={styles.metricSubtext}>Juntas Receptoras</Text>
          </View>

          {/* Card 3: Coordinadores */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <View style={styles.metricIconBox}>
                <Users size={16} color={BrandColors.azulTitulos} />
              </View>
              <Text style={styles.metricLabel}>Coordinadores</Text>
            </View>
            <Text style={styles.metricValue}>
              {resumen ? resumen.totalCoordinadores : loading ? '…' : '—'}
            </Text>
            <Text style={styles.metricSubtext}>Coordinación Recinto</Text>
          </View>

          {/* Card 4: Borradores vs Confirmadas */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <View style={styles.metricIconBox}>
                <FileText size={16} color={BrandColors.azulTitulos} />
              </View>
              <Text style={styles.metricLabel}>Borradores</Text>
            </View>
            <Text style={styles.metricValue}>
              {resumen ? resumen.borradoresRegistrados : loading ? '…' : '—'}
            </Text>
            <Text style={styles.metricSubtext}>
              {resumen && resumen.evidenciasConfirmadas > 0
                ? `${resumen.evidenciasConfirmadas} con evidencia`
                : 'Sin confirmación aún'}
            </Text>
          </View>
        </View>

        {/* Tab Controls */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'recintos' && styles.tabButtonActive]}
            onPress={() => setActiveTab('recintos')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'recintos' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Recintos ({recintos.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'coordinadores' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('coordinadores')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'coordinadores' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Coordinadores ({coordinadores.length})
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color={BrandColors.textoSecundario} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar en ${activeTab}…`}
            placeholderTextColor={BrandColors.textoMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Content list */}
        {loading && recintos.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
            <Text style={styles.loadingText}>Cargando catálogo electoral…</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* TAB: RECINTOS */}
            {activeTab === 'recintos' && (
              <>
                {recintosFiltrados.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Building2 size={28} color={BrandColors.grisAzulado} />
                    <Text style={styles.emptyTitle}>
                      {busqueda ? 'No hay recintos que coincidan' : 'No hay recintos registrados'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                      {busqueda
                        ? `No se encontraron resultados para "${busqueda}".`
                        : 'El catálogo provincial no cuenta con recintos cargados actualmente.'}
                    </Text>
                  </View>
                ) : (
                  recintosFiltrados.map((recinto) => (
                    <View key={recinto.codigo} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleGroup}>
                          <Text style={styles.itemTitle}>{recinto.nombre}</Text>
                          <View style={styles.itemBadgeRow}>
                            <View style={styles.chipParroquia}>
                              <MapPin size={10} color={BrandColors.azulTitulos} />
                              <Text style={styles.chipParroquiaText}>
                                {recinto.parroquiaNombre ?? recinto.parroquiaCodigo}
                              </Text>
                            </View>
                            <Text style={styles.chipCodeText}>Cód: {recinto.codigo}</Text>
                          </View>
                        </View>
                        <View style={styles.mesaCountBadge}>
                          <Text style={styles.mesaCountNumber}>{recinto.totalMesas}</Text>
                          <Text style={styles.mesaCountLabel}>Mesas</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {/* TAB: COORDINADORES */}
            {activeTab === 'coordinadores' && (
              <>
                {/* Botón de Acción Principal: Invitar Coordinador */}
                <View style={styles.sectionActionBar}>
                  <View style={styles.sectionActionTextGroup}>
                    <Text style={styles.sectionActionTitle}>Gestión de Personal</Text>
                    <Text style={styles.sectionActionSubtitle}>
                      {coordinadores.length} coordinador{coordinadores.length !== 1 ? 'es' : ''} registrado{coordinadores.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => router.push('/provincial/invitar-coordinador')}
                    activeOpacity={0.8}
                  >
                    <UserPlus size={14} color={BrandColors.blancoSuperficie} />
                    <Text style={styles.inviteButtonText}>Invitar coordinador</Text>
                  </TouchableOpacity>
                </View>

                {coordinadoresFiltrados.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Users size={28} color={BrandColors.grisAzulado} />
                    <Text style={styles.emptyTitle}>
                      {busqueda ? 'Sin coincidencias' : 'Sin coordinadores registrados'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                      {busqueda
                        ? `No se encontró ningún coordinador con "${busqueda}".`
                        : 'No hay coordinadores de recinto asignados en la base de datos.'}
                    </Text>
                  </View>
                ) : (
                  coordinadoresFiltrados.map((coord) => (
                    <View key={coord.id} style={styles.itemCard}>
                      <View style={styles.coordHeader}>
                        <View style={styles.coordAvatar}>
                          <Text style={styles.coordAvatarText}>
                            {coord.nombres.charAt(0)}
                            {coord.apellidos.charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.coordInfo}>
                          <Text style={styles.itemTitle}>
                            {coord.nombres} {coord.apellidos}
                          </Text>
                          <Text style={styles.coordRecinto}>
                            {coord.recintoNombre ?? 'Sin recinto asignado'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.chipStatus,
                            coord.habilitado
                              ? styles.chipStatusActive
                              : styles.chipStatusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipStatusText,
                              coord.habilitado
                                ? styles.chipStatusTextActive
                                : styles.chipStatusTextInactive,
                            ]}
                          >
                            {coord.habilitado ? 'Habilitado' : 'Inactivo'}
                          </Text>
                        </View>
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
                  <View style={styles.emptyCard}>
                    <FileText size={28} color={BrandColors.grisAzulado} />
                    <Text style={styles.emptyTitle}>
                      {busqueda ? 'Sin actas que coincidan' : 'Sin actas registradas'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                      {busqueda
                        ? `No se encontraron actas con el filtro "${busqueda}".`
                        : 'Aún no se han recibido borradores de actas en los recintos provinciales.'}
                    </Text>
                  </View>
                ) : (
                  actasFiltradas.map((acta) => (
                    <View key={acta.id} style={styles.itemCard}>
                      <View style={styles.actaHeader}>
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

                      <View style={styles.actaBody}>
                        <Text style={styles.itemTitle}>{acta.recintoNombre}</Text>
                        <Text style={styles.actaMesaText}>
                          Junta Receptora del Voto #{String(acta.mesaNumero).padStart(3, '0')}
                        </Text>

                        <View style={styles.actaMetaRow}>
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
                              <Shield size={12} color={BrandColors.azulPrincipal} />
                              <Text style={styles.actaMetaText}>{acta.autorNombre}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        )}
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
  },
  metricValue: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 20,
    color: BrandColors.azulTitulos,
    lineHeight: 24,
  },
  metricSubtext: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoMuted,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.rojoAlertaLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorIcon: {
    marginRight: 2,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
  },
  errorBannerText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.rojoAlerta,
    marginTop: 1,
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
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.lg,
    padding: 3,
    marginBottom: Spacing.sm,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 13,
    color: BrandColors.textoPrincipal,
    height: '100%',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 13,
    color: BrandColors.textoSecundario,
  },
  listContainer: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13.5,
    color: BrandColors.azulTitulos,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  chipParroquia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  chipParroquiaText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.azulTitulos,
  },
  chipCodeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10.5,
    color: BrandColors.textoMuted,
  },
  mesaCountBadge: {
    alignItems: 'center',
    backgroundColor: BrandColors.superficieCalida,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.md,
  },
  mesaCountNumber: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
  },
  mesaCountLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 9,
    color: BrandColors.textoSecundario,
  },
  coordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coordAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  coordAvatarText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  coordInfo: {
    flex: 1,
  },
  coordRecinto: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
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
  actaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actaDignidadBadge: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  actaDignidadText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
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
  actaBody: {
    marginTop: 2,
  },
  actaMesaText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  actaMetaRow: {
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
  emptyCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13.5,
    color: BrandColors.azulTitulos,
    marginTop: 4,
  },
  emptyDescription: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 16,
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
  inviteButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 11.5,
    color: BrandColors.blancoSuperficie,
  },
});
