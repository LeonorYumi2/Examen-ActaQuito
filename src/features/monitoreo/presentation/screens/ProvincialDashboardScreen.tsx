import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import { WebView } from 'react-native-webview';
import {
  documentoMapaElectoral,
  actualizarMapaElectoral,
  leerMensajeMapa,
} from '@/features/monitoreo/data/mapa-leaflet';
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
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react-native';
import { BrandColors, Elevations, Radii, Spacing, FontFamilies } from '@/constants/tokens';
import { InstitutionalHeader } from '@/components/ui/institutional-header';
import { CampoBusqueda } from '@/components/ui';
import { DetalleRecintoModal } from '@/features/recintos/presentation/components';
import { DetalleCoordinadorModal } from '@/features/users/presentation/components';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { useSeguimientoElectoral } from '../hooks/useSeguimientoElectoral';
import {
  operacionesPorRolRepositorio,
  type RecintoInfo,
  type CoordinadorRecintoInfo,
  type ResumenProvincial,
  type ActaProvincialInfo,
} from '@/features/recintos/data/operaciones-roles';

export type TabType = 'recintos' | 'coordinadores' | 'actas';
export type ProvincialSection = 'resumen' | 'recintos' | 'resultados' | 'mapa';

interface ProvincialDashboardScreenProps {
  activeSection?: ProvincialSection;
}

export const ProvincialDashboardScreen: React.FC<ProvincialDashboardScreenProps> = ({
  activeSection = 'resumen',
}) => {
  const access = useAuth((state) => state.access);
  const { width } = useWindowDimensions();
  const seguimiento = useSeguimientoElectoral(activeSection === 'resultados' || activeSection === 'mapa');
  const [activeTab, setActiveTab] = useState<TabType>('recintos');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>('');
  const [recintoDetalleCodigo, setRecintoDetalleCodigo] = useState<string | null>(null);
  const [coordinadorDetalle, setCoordinadorDetalle] = useState<CoordinadorRecintoInfo | null>(null);
  const [resumen, setResumen] = useState<ResumenProvincial | null>(null);
  const [recintos, setRecintos] = useState<RecintoInfo[]>([]);
  const [coordinadores, setCoordinadores] = useState<CoordinadorRecintoInfo[]>([]);
  const [actas, setActas] = useState<ActaProvincialInfo[]>([]);
  const [error, setError] = useState<string>();

  // Referencias y estado para el mapa interactivo Leaflet
  const webViewRef = useRef<WebView>(null);
  const mapaListoRef = useRef<boolean>(false);

  const docMapa = useMemo(() => {
    const urlBase = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://actaquito.supabase.co';
    try {
      return documentoMapaElectoral(urlBase);
    } catch {
      return documentoMapaElectoral('https://actaquito.supabase.co');
    }
  }, []);

  // Consolidar datos reales para el mapa: prioridad a instantánea RPC de monitoreo
  const datosMapa = useMemo(() => {
    if (seguimiento.datos?.recintos && seguimiento.datos.recintos.length > 0) {
      return {
        recintos: seguimiento.datos.recintos,
        actas: seguimiento.datos.actas ?? [],
      };
    }
    // Fallback con los 12 recintos autorizados de Supabase
    return {
      recintos: recintos.map((r) => ({
        codigo: r.codigo,
        nombre: r.nombre,
        parroquia_codigo: r.parroquiaCodigo,
        parroquia: r.parroquiaNombre ?? 'Pichincha',
        latitud: r.latitud,
        longitud: r.longitud,
        total_mesas: r.totalMesas,
        mesas_reportadas: 0,
        mesas_pendientes: r.totalMesas,
        mesas: [],
      })),
      actas: [],
    };
  }, [seguimiento.datos, recintos]);

  // Actualizar marcadores y geocercas en el WebView sin recrear la instancia
  useEffect(() => {
    if (mapaListoRef.current && activeSection === 'mapa') {
      const script = actualizarMapaElectoral(datosMapa);
      webViewRef.current?.injectJavaScript(script);
    }
  }, [datosMapa, activeSection]);

  const handleMensajeMapa = (event: any) => {
    const msg = leerMensajeMapa(event.nativeEvent.data);
    if (!msg) return;

    if (msg.tipo === 'mapa-listo') {
      mapaListoRef.current = true;
      const script = actualizarMapaElectoral(datosMapa);
      webViewRef.current?.injectJavaScript(script);
      return;
    }

    if (msg.tipo === 'recinto') {
      // Abre la ficha completa del recinto seleccionado desde el marcador
      setRecintoDetalleCodigo(msg.codigo);
      return;
    }
  };

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
    void Promise.allSettled([cargarDatos(), seguimiento.actualizar()]).finally(() => {
      setRefreshing(false);
    });
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
          { paddingHorizontal: horizontalPadding, paddingBottom: 100 },
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

        {/* 1. SECCIÓN: RESUMEN */}
        {activeSection === 'resumen' && (
          <>
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

            {/* Card de Avance del Escrutinio Provincial */}
            <View style={styles.escrutinioCard}>
              <View style={styles.escrutinioTopRow}>
                <View style={styles.escrutinioIconBox}>
                  <TrendingUp size={16} color={BrandColors.azulTitulos} />
                </View>
                <View style={styles.escrutinioInfo}>
                  <Text style={styles.escrutinioOverline}>ESCRUTINIO PROVINCIAL</Text>
                  <Text style={styles.escrutinioTitle}>Avance de Recepción y Cómputo</Text>
                </View>
                <View style={styles.escrutinioBadge}>
                  <Text style={styles.escrutinioBadgeText}>
                    {resumen && resumen.totalMesas > 0
                      ? `${Math.round((resumen.borradoresRegistrados / (resumen.totalMesas * 2)) * 100)}%`
                      : '0%'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        resumen && resumen.totalMesas > 0
                          ? Math.round((resumen.borradoresRegistrados / (resumen.totalMesas * 2)) * 100)
                          : 0
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.escrutinioFooter}>
                {resumen?.borradoresRegistrados ?? 0} actas recibidas de {(resumen?.totalMesas ?? 36) * 2} esperadas (Alcaldía y Prefectura)
              </Text>
            </View>

            {/* Atajos de Navegación Rápida */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/provincial/recintos')}
                activeOpacity={0.8}
              >
                <Building2 size={16} color={BrandColors.azulTitulos} />
                <Text style={styles.quickActionText}>Ver 12 Recintos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/provincial/mapa')}
                activeOpacity={0.8}
              >
                <MapPin size={16} color={BrandColors.azulTitulos} />
                <Text style={styles.quickActionText}>Mapa Territorial</Text>
              </TouchableOpacity>
            </View>

            {/* Coordinación Provincial: Lista y Botón de Invitar */}
            <View style={styles.sectionHeaderCard}>
              <View style={styles.sectionActionBar}>
                <View style={styles.sectionActionTextGroup}>
                  <Text style={styles.sectionActionTitle}>Coordinación de Recintos</Text>
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

              {coordinadores.slice(0, 4).map((coord) => (
                <TouchableOpacity
                  key={coord.id}
                  style={styles.itemCard}
                  onPress={() => setCoordinadorDetalle(coord)}
                  activeOpacity={0.7}
                >
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
                        coord.habilitado ? styles.chipStatusActive : styles.chipStatusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipStatusText,
                          coord.habilitado ? styles.chipStatusTextActive : styles.chipStatusTextInactive,
                        ]}
                      >
                        {coord.habilitado ? 'Habilitado' : 'Inactivo'}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={BrandColors.textoMuted} style={styles.itemChevron} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Resumen de Últimas Actas */}
            {actas.length > 0 && (
              <View style={styles.sectionHeaderCard}>
                <Text style={styles.sectionActionTitle}>Últimas Actas Recibidas</Text>
                <Text style={styles.sectionActionSubtitle}>
                  Transmisión y recepción en tiempo real
                </Text>
                {actas.slice(0, 3).map((acta) => (
                  <View key={acta.id} style={styles.itemCard}>
                    <View style={styles.actaHeader}>
                      <View style={styles.actaDignidadBadge}>
                        <Text style={styles.actaDignidadText}>
                          {acta.dignidadCodigo === 'ALCALDIA' ? 'Alcaldía de Quito' : 'Prefectura Pichincha'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.actaEvidenciaBadge,
                          acta.tieneEvidencia ? styles.actaEvidenciaBadgeSuccess : styles.actaEvidenciaBadgeDraft,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actaEvidenciaText,
                            acta.tieneEvidencia ? styles.actaEvidenciaTextSuccess : styles.actaEvidenciaTextDraft,
                          ]}
                        >
                          {acta.tieneEvidencia ? 'Evidencia confirmada' : 'Borrador'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actaBody}>
                      <Text style={styles.itemTitle}>{acta.recintoNombre}</Text>
                      <Text style={styles.actaMesaText}>
                        Junta Receptora #{String(acta.mesaNumero).padStart(3, '0')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 2. SECCIÓN: RECINTOS */}
        {activeSection === 'recintos' && (
          <>
            <View style={styles.sectionHeroHeader}>
              <Text style={styles.sectionHeroOverline}>CATÁLOGO ELECTORAL · DMQ</Text>
              <Text style={styles.sectionHeroTitle}>Recintos Electorales</Text>
              <Text style={styles.sectionHeroSubtitle}>
                {recintosFiltrados.length} recintos oficiales en el Distrito Metropolitano de Quito
              </Text>
            </View>

            {/* Buscador con limpieza instantánea */}
            <CampoBusqueda
              valor={busqueda}
              alCambiar={setBusqueda}
              placeholder="Buscar por recinto, parroquia o código…"
              style={styles.searchBarWrapper}
            />

            {loading && recintos.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
                <Text style={styles.loadingText}>Cargando catálogo electoral…</Text>
              </View>
            ) : recintosFiltrados.length === 0 ? (
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
                <TouchableOpacity
                  key={recinto.codigo}
                  style={styles.itemCard}
                  onPress={() => setRecintoDetalleCodigo(recinto.codigo)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Ver detalle de recinto ${recinto.nombre}`}
                >
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
                        {recinto.parroquiaTipo ? (
                          <View
                            style={[
                              styles.chipTipo,
                              recinto.parroquiaTipo === 'urbana'
                                ? styles.chipTipoUrbana
                                : styles.chipTipoRural,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipTipoText,
                                recinto.parroquiaTipo === 'urbana'
                                  ? styles.chipTipoTextUrbana
                                  : styles.chipTipoTextRural,
                              ]}
                            >
                              {recinto.parroquiaTipo === 'urbana' ? 'Urbana' : 'Rural'}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.chipCodeText}>Cód: {recinto.codigo}</Text>
                      </View>
                    </View>
                    <View style={styles.mesaCountBadge}>
                      <Text style={styles.mesaCountNumber}>{recinto.totalMesas}</Text>
                      <Text style={styles.mesaCountLabel}>Mesas</Text>
                    </View>
                    <ChevronRight size={15} color={BrandColors.textoMuted} style={styles.itemChevron} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* 3. SECCIÓN: RESULTADOS */}
        {activeSection === 'resultados' && (() => {
          const resultadosTotales = seguimiento.datos?.resultados?.filter((r) => r.recinto_codigo === null) ?? [];
          const hayResultadosConfirmados = resultadosTotales.some((r) => r.actas_confirmadas > 0);

          return (
            <>
              <View style={styles.sectionHeroHeader}>
                <Text style={styles.sectionHeroOverline}>ESCRUTINIO PRELIMINAR</Text>
                <Text style={styles.sectionHeroTitle}>Resultados Electorales</Text>
                <Text style={styles.sectionHeroSubtitle}>
                  Consolidación oficial de actas escrutadas para el Cantón Quito y Pichincha
                </Text>
              </View>

              {hayResultadosConfirmados ? (
                resultadosTotales.map((res) => (
                  <View key={res.dignidad_codigo} style={[styles.itemCard, { marginBottom: Spacing.sm }]}>
                    <View style={styles.actaHeader}>
                      <Text style={styles.itemTitle}>
                        {res.dignidad_codigo === 'ALCALDIA' ? 'Alcaldía de Quito' : 'Prefectura de Pichincha'}
                      </Text>
                      <Text style={styles.chipCodeText}>{res.actas_confirmadas} actas confirmadas</Text>
                    </View>
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {res.candidaturas.map((cand) => (
                        <View key={cand.sigla}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontFamily: FontFamilies.bodyBold, fontSize: 12, color: BrandColors.azulTitulos }}>
                              {cand.sigla} · {cand.candidato}
                            </Text>
                            <Text style={{ fontFamily: FontFamilies.titleBold, fontSize: 12, color: BrandColors.azulTitulos }}>
                              {cand.porcentaje_votos_validos !== null ? `${cand.porcentaje_votos_validos}%` : '—'} ({cand.votos} votos)
                            </Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: BrandColors.superficieCalida, borderRadius: 3, overflow: 'hidden' }}>
                            <View
                              style={{
                                height: '100%',
                                width: `${cand.porcentaje_votos_validos ?? 0}%`,
                                backgroundColor: cand.color || BrandColors.azulPrincipal,
                                borderRadius: 3,
                              }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: BrandColors.azulSuperficie }}>
                      <Text style={styles.actaMetaText}>Blancos: {res.blancos}</Text>
                      <Text style={styles.actaMetaText}>Nulos: {res.nulos}</Text>
                      <Text style={styles.actaMetaText}>Válidos: {res.votos_validos}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <>
                  {/* Tarjeta Oficial de Estado */}
                  <View style={styles.infoStateCard}>
                    <View style={styles.infoStateBadge}>
                      <Clock size={12} color="#D97706" />
                      <Text style={styles.infoStateBadgeText}>EN ESPERA DE CIERRE DE URNAS (17:00)</Text>
                    </View>
                    <Text style={styles.infoStateTitle}>Cómputo Programado post-escrutinio</Text>
                    <Text style={styles.infoStateDesc}>
                      El cálculo y consolidación de resultados preliminares para Alcaldía de Quito y Prefectura de Pichincha se activará automáticamente con la transmisión de las primeras actas oficiales firmadas por las Juntas Receptoras.
                    </Text>
                  </View>

                  {/* Documentación de Dependencia Backend (Regla 6) */}
                  <View style={styles.dependencyCard}>
                    <View style={styles.dependencyTopRow}>
                      <ShieldCheck size={18} color={BrandColors.azulPrincipal} />
                      <Text style={styles.dependencyTitle}>Servicio Backend de Consolidación (ADR-01 / Fase 8)</Text>
                    </View>
                    <Text style={styles.dependencyDesc}>
                      Conforme a los ADR-01 y las políticas de seguridad RLS en PostgreSQL, las cifras de votación residen en tablas inmutables (<Text style={styles.codeText}>actas_revisiones</Text>). La agregación preliminar por candidato se habilitará mediante el servicio RPC consolidado del backend que procesa únicamente actas con evidencias confirmadas.
                    </Text>
                  </View>

                  {/* Estadísticas Reales de Recepción */}
                  <View style={styles.statsOverviewCard}>
                    <Text style={styles.statsCardTitle}>Estado de Preparación de Evidencias</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{resumen?.evidenciasConfirmadas ?? 0}</Text>
                        <Text style={styles.statBoxLabel}>Actas con Evidencia</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{(resumen?.totalMesas ?? 36) * 2}</Text>
                        <Text style={styles.statBoxLabel}>Actas Totales (72)</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{resumen?.totalRecintos ?? 12}</Text>
                        <Text style={styles.statBoxLabel}>Recintos en Cobertura</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          );
        })()}

        {/* 4. SECCIÓN: MAPA ELECTORAL INTERACTIVO */}
        {activeSection === 'mapa' && (
          <>
            <View style={styles.sectionHeroHeader}>
              <View style={styles.mapBadgeHeaderRow}>
                <Text style={styles.sectionHeroOverline}>CARTOGRAFÍA LEAFLET & OPENSTREETMAP (ADR-04)</Text>
                <View style={styles.geocercaBadge}>
                  <Text style={styles.geocercaBadgeText}>RADIO 200M</Text>
                </View>
              </View>
              <Text style={styles.sectionHeroTitle}>Mapa Territorial Interactivo</Text>
              <Text style={styles.sectionHeroSubtitle}>
                Supervisión perimetral y cobertura de los 12 recintos electorales del Cantón Quito
              </Text>
            </View>

            {/* Mapa Interactivo Principal en WebView */}
            <View style={styles.mapCard}>
              <View style={styles.mapCardTopRow}>
                <View style={styles.mapCardTitleGroup}>
                  <MapPin size={16} color={BrandColors.azulTitulos} />
                  <Text style={styles.mapCardTitle}>Recintos Electorales Georreferenciados</Text>
                </View>
                <TouchableOpacity
                  style={styles.mapRefreshBtn}
                  onPress={() => {
                    void seguimiento.actualizar();
                    if (mapaListoRef.current) {
                      const script = actualizarMapaElectoral(datosMapa);
                      webViewRef.current?.injectJavaScript(script);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={13} color={BrandColors.azulTitulos} />
                  <Text style={styles.mapRefreshBtnText}>Actualizar</Text>
                </TouchableOpacity>
              </View>

              {/* WebView Nativa de Leaflet */}
              <View style={styles.webViewContainer}>
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: docMapa.html, baseUrl: docMapa.baseUrl }}
                  style={styles.webView}
                  onMessage={handleMensajeMapa}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  applicationNameForUserAgent="ActaQuito/1.0"
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.mapLoadingOverlay}>
                      <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
                      <Text style={styles.mapLoadingText}>Cargando mapa electoral...</Text>
                    </View>
                  )}
                  renderError={() => (
                    <View style={styles.mapErrorOverlay}>
                      <AlertCircle size={20} color={BrandColors.rojoAlerta} />
                      <Text style={styles.mapErrorTitle}>No se pudo cargar el mapa</Text>
                      <Text style={styles.mapErrorDesc}>
                        Verifica la conexión para cargar las teselas libres de OpenStreetMap.
                      </Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.mapCardFooter}>
                <Text style={styles.mapCardFooterText}>
                  Toca un marcador en el mapa para ver mesas reportadas y abrir la ficha del recinto.
                </Text>
              </View>
            </View>

            {/* Cobertura Territorial de los 12 Recintos (Lista Complementaria) */}
            <View style={styles.sectionHeaderCard}>
              <View style={styles.mapHeaderRow}>
                <Text style={styles.sectionActionTitle}>Recintos de la Jurisdicción</Text>
                <View style={styles.geocercaBadge}>
                  <Text style={styles.geocercaBadgeText}>{datosMapa.recintos.length} RECINTOS</Text>
                </View>
              </View>
              <Text style={styles.sectionActionSubtitle}>
                Coordenadas GPS oficiales y asignación de mesas JRV
              </Text>

              {recintos.map((recinto) => (
                <TouchableOpacity
                  key={recinto.codigo}
                  style={styles.itemCard}
                  onPress={() => setRecintoDetalleCodigo(recinto.codigo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleGroup}>
                      <Text style={styles.itemTitle}>{recinto.nombre}</Text>
                      <View style={styles.itemBadgeRow}>
                        <View style={styles.chipParroquia}>
                          <MapPin size={10} color={BrandColors.azulTitulos} />
                          <Text style={styles.chipParroquiaText}>
                            GPS: {recinto.latitud.toFixed(4)}, {recinto.longitud.toFixed(4)}
                          </Text>
                        </View>
                        <Text style={styles.chipCodeText}>Cód: {recinto.codigo}</Text>
                      </View>
                    </View>
                    <View style={styles.mesaCountBadge}>
                      <Text style={styles.mesaCountNumber}>{recinto.totalMesas}</Text>
                      <Text style={styles.mesaCountLabel}>Mesas</Text>
                    </View>
                    <ChevronRight size={15} color={BrandColors.textoMuted} style={styles.itemChevron} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de Detalle de Recinto */}
      <DetalleRecintoModal
        visible={Boolean(recintoDetalleCodigo)}
        recintoCodigo={recintoDetalleCodigo}
        onClose={() => setRecintoDetalleCodigo(null)}
      />

      {/* Modal de Detalle de Coordinador */}
      <DetalleCoordinadorModal
        visible={Boolean(coordinadorDetalle)}
        coordinador={coordinadorDetalle}
        recintosDisponibles={recintos}
        onClose={() => setCoordinadorDetalle(null)}
        onAsignacionExitosa={() => {
          void cargarDatos();
        }}
      />
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
  searchBarWrapper: {
    marginBottom: Spacing.md,
  },
  chipTipo: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  chipTipoUrbana: {
    backgroundColor: BrandColors.superficieCalida,
    borderColor: BrandColors.grisAzuladoLight,
  },
  chipTipoRural: {
    backgroundColor: '#F3EFE6',
    borderColor: '#D4CBBF',
  },
  chipTipoText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 9.5,
  },
  chipTipoTextUrbana: {
    color: BrandColors.azulPrincipal,
  },
  chipTipoTextRural: {
    color: '#6E5D4B',
  },
  itemChevron: {
    marginLeft: 4,
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
  escrutinioCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
    ...Elevations.subtle,
  },
  escrutinioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  escrutinioIconBox: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrutinioInfo: {
    flex: 1,
  },
  escrutinioOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: BrandColors.azulPrincipal,
  },
  escrutinioTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13.5,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },
  escrutinioBadge: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  escrutinioBadgeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.verdeExito,
    borderRadius: Radii.full,
  },
  escrutinioFooter: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.blancoSuperficie,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  quickActionText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  sectionHeaderCard: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionHeroHeader: {
    marginBottom: Spacing.sm,
  },
  sectionHeroOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    letterSpacing: 1,
    color: BrandColors.azulPrincipal,
  },
  sectionHeroTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 18,
    color: BrandColors.azulTitulos,
    marginTop: 2,
  },
  sectionHeroSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  infoStateCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
    ...Elevations.subtle,
  },
  infoStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  infoStateBadgeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    color: '#B45309',
  },
  infoStateTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
    marginBottom: 4,
  },
  infoStateDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    lineHeight: 17,
  },
  dependencyCard: {
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
  },
  dependencyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dependencyTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  dependencyDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    lineHeight: 16,
  },
  codeText: {
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.azulTitulos,
  },
  statsOverviewCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
    ...Elevations.subtle,
  },
  statsCardTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: BrandColors.superficieCalida,
    padding: 10,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  statBoxNum: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
  },
  statBoxLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 9.5,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    marginTop: 2,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  geocercaBadge: {
    backgroundColor: BrandColors.verdeExitoLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  geocercaBadgeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9.5,
    color: BrandColors.verdeExito,
  },
  mapBadgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mapCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Elevations.card,
  },
  mapCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: BrandColors.superficieCalida,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
  },
  mapCardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mapCardTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.azulTitulos,
  },
  mapRefreshBtn: {
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
  mapRefreshBtnText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11,
    color: BrandColors.azulTitulos,
  },
  webViewContainer: {
    height: 380,
    width: '100%',
    backgroundColor: '#E5E3DF',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(247, 244, 239, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  mapLoadingText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  mapErrorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: 6,
    zIndex: 10,
  },
  mapErrorTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.rojoAlerta,
  },
  mapErrorDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
  },
  mapCardFooter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: BrandColors.superficieCalida,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulBorde,
  },
  mapCardFooterText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
});
