import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BrandColors,
  Radii,
  Spacing,
  Elevations,
  FontFamilies,
  PoliticalParties,
} from '@/constants/tokens';
import { SyncStatusBar } from '@/components/ui/sync-status-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { PartyVoteBar } from '@/components/ui/party-vote-bar';
import { CivicDisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { VectorIcon } from '@/components/ui/vector-icon';
import { QuitoSkylineIllustration } from '@/components/ui/quito-skyline-illustration';
import { FloatingBottomBar, ProvincialTabId } from '@/components/ui/floating-bottom-bar';

type DignidadFiltro = 'alcaldia' | 'prefectura';
type ParroquiaFiltro = 'todas' | 'urbanas' | 'rurales';

/**
 * BentoDashboardDemoScreen - EDITORIAL PREMIUM + GUIDED EXPERIENCE
 *
 * Coordinador Provincial · Cantón Quito (Pichincha)
 *
 * Características de la nueva dirección visual:
 * - Composición editorial abierta, tipografía protagonista y lectura jerárquica.
 * - Paleta sobria y elegante: Azul grisáceo (#405C79), Azul títulos (#253D59), Fondo marfil (#F7F4EF).
 * - Rojo institucional Quito (#C83349) empleado únicamente en sutiles acentos gráficos de 2.5px.
 * - Arte lineal arquitectónico vectorial representativo de Quito (Pichincha, Basílica, Panecillo).
 * - Declaración escultórica de progreso (77.8% en 52pt con acento cívico fino).
 * - 3 Portales de Exploración Guiada que despliegan vistas profundas sin saturar la pantalla principal.
 * - Barra inferior flotante en cápsula alargada con respeto estricto de safe area insets y cero desbordes.
 */
export const BentoDashboardDemoScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProvincialTabId>('inicio');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(2);
  const [dignidad, setDignidad] = useState<DignidadFiltro>('alcaldia');
  const [selectedRecintoIndex, setSelectedRecintoIndex] = useState<number | null>(null);
  const [filtroParroquia, setFiltroParroquia] = useState<ParroquiaFiltro>('todas');

  // Datos simulados fieles a S-01 y S-02 (12 recintos de Quito, 36 mesas, 72 actas)
  const totalMesas = 36;
  const mesasReportadas = 28;
  const mesasPendientes = 8;
  const porcentajeAvance = ((mesasReportadas / totalMesas) * 100).toFixed(1);
  const actasRecibidas = 56;
  const actasEsperadas = 72;

  // Lista canónica de los 12 recintos de Quito (Supuesto S-01)
  const RECINTOS_S01 = [
    { id: 1, name: 'Colegio La Condamine', parroquia: 'Iñaquito', tipo: 'urbana', mesas: '3/3', status: 'completo', lat: -0.1726, lon: -78.4829, dist: '42m' },
    { id: 2, name: 'U.E. República de Bolivia', parroquia: 'Iñaquito', tipo: 'urbana', mesas: '3/3', status: 'completo', lat: -0.1829, lon: -78.4883, dist: '85m' },
    { id: 3, name: 'U.E. Municipal Quitumbe', parroquia: 'Quitumbe', tipo: 'urbana', mesas: '3/3', status: 'completo', lat: -0.2809, lon: -78.5487, dist: '60m' },
    { id: 4, name: 'U.E. Aurelio Bayas', parroquia: 'Quitumbe', tipo: 'urbana', mesas: '2/3', status: 'parcial', lat: -0.2965, lon: -78.5318, dist: '110m' },
    { id: 5, name: 'Colegio Amazonas', parroquia: 'La Magdalena', tipo: 'urbana', mesas: '2/3', status: 'alerta', lat: -0.2455, lon: -78.5267, dist: '340m (⚠ Fuera de rango)' },
    { id: 6, name: 'U.E. Fernández Salvador', parroquia: 'La Magdalena', tipo: 'urbana', mesas: '3/3', status: 'completo', lat: -0.2432, lon: -78.5189, dist: '70m' },
    { id: 7, name: 'U.E. Nicolás Jiménez', parroquia: 'Calderón', tipo: 'rural', mesas: '2/3', status: 'parcial', lat: -0.0834, lon: -78.4226, dist: '95m' },
    { id: 8, name: 'U.E. Luxemburgo', parroquia: 'Calderón', tipo: 'rural', mesas: '2/3', status: 'parcial', lat: -0.0944, lon: -78.4514, dist: '140m' },
    { id: 9, name: 'U.E. Tumbaco', parroquia: 'Tumbaco', tipo: 'rural', mesas: '3/3', status: 'completo', lat: -0.2246, lon: -78.3760, dist: '55m' },
    { id: 10, name: 'Escuela Roberto Espinoza', parroquia: 'Tumbaco', tipo: 'rural', mesas: '2/3', status: 'parcial', lat: -0.2113, lon: -78.4045, dist: '130m' },
    { id: 11, name: 'C.F. Eduardo Salazar Gómez', parroquia: 'Pifo', tipo: 'rural', mesas: '2/3', status: 'parcial', lat: -0.2273, lon: -78.3432, dist: '165m' },
    { id: 12, name: 'Inst. Fiscal Ricardo Rodríguez', parroquia: 'Pifo', tipo: 'rural', mesas: '1/3', status: 'parcial', lat: -0.2245, lon: -78.3366, dist: '90m' },
  ];

  const recintosFiltrados = RECINTOS_S01.filter((r) => {
    if (filtroParroquia === 'urbanas') return r.tipo === 'urbana';
    if (filtroParroquia === 'rurales') return r.tipo === 'rural';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.fondoMarfil} />

      {/* 1. Barra Persistente de Conectividad (RF-13) */}
      <SyncStatusBar
        isOnline={isOnline}
        pendingCount={pendingCount}
        onToggleConnectionMock={() => setIsOnline(!isOnline)}
        onPressPending={() => setPendingCount(pendingCount > 0 ? 0 : 2)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* VISTA 1: INICIO EDITORIAL (HERO, PROGRESO ESCULTÓRICO Y 3 PORTALES)       */}
        {/* ========================================================================= */}
        {(activeTab === 'inicio' || activeTab === 'resumen') && (
          <>
            {/* Encabezado Editorial con Monograma Quiteño */}
            <View style={styles.editorialHeader}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.dateContextLabel}>DOMINGO DE ELECCIONES · 17:42</Text>
                  <Text style={styles.brandTitle}>ActaQuito</Text>
                  <Text style={styles.jurisdictionSubtitle}>
                    Control Electoral Partidario · Cantón Quito
                  </Text>
                </View>

                {/* Monograma Cívico Q */}
                <View style={styles.monogramContainer}>
                  <Text style={styles.monogramLetter}>Q</Text>
                  <View style={styles.monogramSubtleAccent} />
                </View>
              </View>

              {/* Tag de Rol Cívico */}
              <View style={styles.roleBadgeRow}>
                <View style={styles.roleBadge}>
                  <VectorIcon name="shield-check" size={13} color={BrandColors.azulTitulos} />
                  <Text style={styles.roleBadgeText}>Coordinador Provincial</Text>
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Cómputo en curso</Text>
                </View>
              </View>

              {/* Ilustración de Arte Lineal Quiteño */}
              <View style={styles.illustrationWrapper}>
                <QuitoSkylineIllustration height={64} opacity={0.55} />
              </View>
            </View>

            {/* Aviso de Transparencia Cívica (S-06) */}
            <CivicDisclaimerBanner />

            {/* ===================================================================== */}
            {/* DECLARACIÓN ESCULTÓRICA DE PROGRESO (HERO EDITORIAL PROTAGONISTA)     */}
            {/* ===================================================================== */}
            <View style={styles.sculpturalProgressContainer}>
              <Text style={styles.sectionOverline}>ESTADO DEL ESCRUTINIO CANTONAL</Text>
              
              <View style={styles.percentageRow}>
                <Text style={styles.sculpturalPercentNumber}>{porcentajeAvance}%</Text>
                <View style={styles.sculpturalContextBlock}>
                  <Text style={styles.sculpturalStatusHeading}>Avance General</Text>
                  <Text style={styles.sculpturalMesasFraction}>
                    {mesasReportadas} de {totalMesas} mesas computadas
                  </Text>
                </View>
              </View>

              {/* Barra de progreso de trazo fino con filete Rojo Quito */}
              <View style={styles.sculpturalTrack}>
                <View
                  style={[
                    styles.sculpturalFill,
                    { width: `${porcentajeAvance}%` as DimensionValue },
                  ]}
                />
                {/* Acento Rojo Quito discreto de 2.5px en el borde de avance */}
                <View
                  style={[
                    styles.sculpturalRedAccent,
                    { left: `${porcentajeAvance}%` as DimensionValue },
                  ]}
                />
              </View>

              {/* Tríada de métricas editoriales de apoyo */}
              <View style={styles.editorialMetricsRow}>
                <View style={styles.editorialMetricCell}>
                  <Text style={styles.editorialMetricNumber}>{mesasReportadas}</Text>
                  <Text style={styles.editorialMetricLabel}>Mesas Recibidas</Text>
                </View>

                <View style={styles.editorialMetricDivider} />

                <View style={styles.editorialMetricCell}>
                  <Text style={styles.editorialMetricNumber}>{mesasPendientes}</Text>
                  <Text style={styles.editorialMetricLabel}>Mesas Pendientes</Text>
                </View>

                <View style={styles.editorialMetricDivider} />

                <View style={styles.editorialMetricCell}>
                  <Text style={styles.editorialMetricNumber}>{actasRecibidas}</Text>
                  <Text style={styles.editorialMetricLabel}>Actas Digitalizadas</Text>
                </View>
              </View>
            </View>

            {/* ===================================================================== */}
            {/* 3 PORTALES DE EXPLORACIÓN GUIADA (PROGRESSIVE DISCLOSURE)             */}
            {/* ===================================================================== */}
            <View style={styles.portalsSectionHeader}>
              <Text style={styles.sectionOverline}>PORTALES DE CONTROL Y AUDITORÍA</Text>
              <Text style={styles.portalsSectionTitle}>Exploración Guiada</Text>
            </View>

            {/* PORTAL 1: Resultados Preliminares */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('resultados')}
              style={styles.guidedPortalCard}
              accessibilityRole="button"
              accessibilityLabel="Abrir portal de resultados preliminares"
            >
              <View style={styles.portalAccentLine} />
              <View style={styles.portalContent}>
                <View style={styles.portalHeaderRow}>
                  <View style={styles.portalIconContainer}>
                    <VectorIcon name="chart" size={20} color={BrandColors.azulTitulos} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.portalTitle}>Resultados Preliminares</Text>
                    <Text style={styles.portalSubtitle}>
                      Alcaldía y Prefectura · 5 candidaturas (S-02)
                    </Text>
                  </View>
                  <View style={styles.portalBadge}>
                    <Text style={styles.portalBadgeText}>MFC lidera 36.2%</Text>
                  </View>
                </View>

                <Text style={styles.portalDescription}>
                  Cómputo partidario en tiempo real con separación estricta de votos blancos y nulos (RF-16).
                </Text>

                <View style={styles.portalActionRow}>
                  <Text style={styles.portalActionText}>Explorar escrutinio detallado</Text>
                  <VectorIcon name="chevron-right" size={14} color={BrandColors.azulPrincipal} />
                </View>
              </View>
            </TouchableOpacity>

            {/* PORTAL 2: Recintos y Veedores en Territorio */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('recintos')}
              style={styles.guidedPortalCard}
              accessibilityRole="button"
              accessibilityLabel="Abrir portal de recintos electorales"
            >
              <View style={styles.portalAccentLine} />
              <View style={styles.portalContent}>
                <View style={styles.portalHeaderRow}>
                  <View style={styles.portalIconContainer}>
                    <VectorIcon name="table" size={20} color={BrandColors.azulTitulos} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.portalTitle}>Recintos y Veedores</Text>
                    <Text style={styles.portalSubtitle}>
                      12 recintos · 6 parroquias urbanas y rurales (S-01)
                    </Text>
                  </View>
                  <View style={styles.portalBadge}>
                    <Text style={styles.portalBadgeText}>11/12 conformes</Text>
                  </View>
                </View>

                <Text style={styles.portalDescription}>
                  Monitoreo de asistencia de veedores, mesas abiertas y control del umbral de geolocalización de 200m (S-08).
                </Text>

                <View style={styles.portalActionRow}>
                  <Text style={styles.portalActionText}>Ver lista de recintos y mesas</Text>
                  <VectorIcon name="chevron-right" size={14} color={BrandColors.azulPrincipal} />
                </View>
              </View>
            </TouchableOpacity>

            {/* PORTAL 3: Cartografía Georreferenciada */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('mapa')}
              style={styles.guidedPortalCard}
              accessibilityRole="button"
              accessibilityLabel="Abrir portal cartográfico georreferenciado"
            >
              <View style={styles.portalAccentLine} />
              <View style={styles.portalContent}>
                <View style={styles.portalHeaderRow}>
                  <View style={styles.portalIconContainer}>
                    <VectorIcon name="map-pin" size={20} color={BrandColors.azulTitulos} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.portalTitle}>Mapa Georreferenciado</Text>
                    <Text style={styles.portalSubtitle}>
                      Trazabilidad espacial y geocercas (ADR-04)
                    </Text>
                  </View>
                  <View style={[styles.portalBadge, { backgroundColor: BrandColors.rojoAlertaLight }]}>
                    <Text style={[styles.portalBadgeText, { color: BrandColors.rojoAlerta }]}>
                      1 Alerta GPS
                    </Text>
                  </View>
                </View>

                <Text style={styles.portalDescription}>
                  Auditoría cartográfica del Colegio Amazonas (340m fuera de rango). Visualización sobre OpenStreetMap.
                </Text>

                <View style={styles.portalActionRow}>
                  <Text style={styles.portalActionText}>Abrir mapa de Pichincha</Text>
                  <VectorIcon name="chevron-right" size={14} color={BrandColors.azulPrincipal} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Estado de Cola Local Offline (RF-14, RNF-06) */}
            <View style={styles.outboxBar}>
              <View style={styles.outboxLeft}>
                <VectorIcon name="refresh" size={14} color={BrandColors.azulPrincipal} />
                <Text style={styles.outboxText}>
                  Cola SQLite: {pendingCount} {pendingCount === 1 ? 'acta cifrada' : 'actas cifradas'} con SecureStore
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPendingCount(pendingCount > 0 ? 0 : 2)}
                style={styles.outboxButton}
              >
                <Text style={styles.outboxButtonText}>
                  {pendingCount > 0 ? 'Sincronizar' : 'Simular 2'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: RESULTADOS PRELIMINARES DETALLADOS (RF-16, S-02)                 */}
        {/* ========================================================================= */}
        {activeTab === 'resultados' && (
          <View style={styles.detailedSection}>
            <TouchableOpacity
              onPress={() => setActiveTab('inicio')}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>← Volver a Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.sectionOverline}>CÓMPUTO PRELIMINAR PARTIDARIO</Text>
            <Text style={styles.detailedSectionTitle}>Resultados Electorales</Text>
            <Text style={styles.detailedSectionSubtitle}>
              Datos preliminares proyectados sobre 28 de 36 mesas (77.8% del cantón).
            </Text>

            {/* Selector Segmentado de Dignidad */}
            <View style={styles.segmentedFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  dignidad === 'alcaldia' && styles.segmentButtonActive,
                ]}
                onPress={() => setDignidad('alcaldia')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    dignidad === 'alcaldia' && styles.segmentTextActive,
                  ]}
                >
                  Alcaldía de Quito
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  dignidad === 'prefectura' && styles.segmentButtonActive,
                ]}
                onPress={() => setDignidad('prefectura')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    dignidad === 'prefectura' && styles.segmentTextActive,
                  ]}
                >
                  Prefectura de Pichincha
                </Text>
              </TouchableOpacity>
            </View>

            {/* Listado de 5 Candidaturas con Colores Exactos S-02 */}
            <View style={styles.resultsCard}>
              {dignidad === 'alcaldia' ? (
                <>
                  <PartyVoteBar
                    code={PoliticalParties.MFC.code}
                    name={PoliticalParties.MFC.name}
                    candidate={PoliticalParties.MFC.candidates.alcaldia}
                    color={PoliticalParties.MFC.color}
                    votes={3240}
                    percentage={36.2}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.ARP.code}
                    name={PoliticalParties.ARP.name}
                    candidate={PoliticalParties.ARP.candidates.alcaldia}
                    color={PoliticalParties.ARP.color}
                    votes={2480}
                    percentage={27.7}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.MUC.code}
                    name={PoliticalParties.MUC.name}
                    candidate={PoliticalParties.MUC.candidates.alcaldia}
                    color={PoliticalParties.MUC.color}
                    votes={1650}
                    percentage={18.4}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.FDP.code}
                    name={PoliticalParties.FDP.name}
                    candidate={PoliticalParties.FDP.candidates.alcaldia}
                    color={PoliticalParties.FDP.color}
                    votes={980}
                    percentage={10.9}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.MNE.code}
                    name={PoliticalParties.MNE.name}
                    candidate={PoliticalParties.MNE.candidates.alcaldia}
                    color={PoliticalParties.MNE.color}
                    votes={610}
                    percentage={6.8}
                  />
                </>
              ) : (
                <>
                  <PartyVoteBar
                    code={PoliticalParties.MFC.code}
                    name={PoliticalParties.MFC.name}
                    candidate={PoliticalParties.MFC.candidates.prefectura}
                    color={PoliticalParties.MFC.color}
                    votes={3110}
                    percentage={34.8}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.ARP.code}
                    name={PoliticalParties.ARP.name}
                    candidate={PoliticalParties.ARP.candidates.prefectura}
                    color={PoliticalParties.ARP.color}
                    votes={2590}
                    percentage={29.0}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.MUC.code}
                    name={PoliticalParties.MUC.name}
                    candidate={PoliticalParties.MUC.candidates.prefectura}
                    color={PoliticalParties.MUC.color}
                    votes={1720}
                    percentage={19.3}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.FDP.code}
                    name={PoliticalParties.FDP.name}
                    candidate={PoliticalParties.FDP.candidates.prefectura}
                    color={PoliticalParties.FDP.color}
                    votes={940}
                    percentage={10.5}
                  />
                  <PartyVoteBar
                    code={PoliticalParties.MNE.code}
                    name={PoliticalParties.MNE.name}
                    candidate={PoliticalParties.MNE.candidates.prefectura}
                    color={PoliticalParties.MNE.color}
                    votes={570}
                    percentage={6.4}
                  />
                </>
              )}

              {/* Desglose Votos Blancos y Nulos (RF-16) */}
              <View style={styles.votosNoValidosContainer}>
                <Text style={styles.votosNoValidosTitle}>VOTOS NO VÁLIDOS (RF-16)</Text>
                <View style={styles.votosNoValidosRow}>
                  <View style={styles.votoChip}>
                    <Text style={styles.votoChipLabel}>Blancos:</Text>
                    <Text style={styles.votoChipValue}>140 (1.5%)</Text>
                  </View>
                  <View style={styles.votoChip}>
                    <Text style={styles.votoChipLabel}>Nulos:</Text>
                    <Text style={styles.votoChipValue}>210 (2.3%)</Text>
                  </View>
                  <View style={styles.votoChip}>
                    <Text style={styles.votoChipLabel}>Total Votos:</Text>
                    <Text style={styles.votoChipValue}>9,310</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VISTA 3: RECINTOS Y VEEDORES DETALLADOS (S-01)                            */}
        {/* ========================================================================= */}
        {activeTab === 'recintos' && (
          <View style={styles.detailedSection}>
            <TouchableOpacity
              onPress={() => setActiveTab('inicio')}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>← Volver a Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.sectionOverline}>CONTROL TERRITORIAL (SUPUESTO S-01)</Text>
            <Text style={styles.detailedSectionTitle}>Recintos Electorales</Text>
            <Text style={styles.detailedSectionSubtitle}>
              12 recintos en 6 parroquias del cantón Quito · 3 mesas de muestra c/u.
            </Text>

            {/* Filtro de Parroquias */}
            <View style={styles.segmentedFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  filtroParroquia === 'todas' && styles.segmentButtonActive,
                ]}
                onPress={() => setFiltroParroquia('todas')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    filtroParroquia === 'todas' && styles.segmentTextActive,
                  ]}
                >
                  Todas (12)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  filtroParroquia === 'urbanas' && styles.segmentButtonActive,
                ]}
                onPress={() => setFiltroParroquia('urbanas')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    filtroParroquia === 'urbanas' && styles.segmentTextActive,
                  ]}
                >
                  Urbanas (6)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  filtroParroquia === 'rurales' && styles.segmentButtonActive,
                ]}
                onPress={() => setFiltroParroquia('rurales')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    filtroParroquia === 'rurales' && styles.segmentTextActive,
                  ]}
                >
                  Rurales (6)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Listado de Recintos */}
            <View style={styles.recintosListContainer}>
              {recintosFiltrados.map((recinto) => {
                const isSelected = selectedRecintoIndex === recinto.id;
                const isAlert = recinto.status === 'alerta';
                return (
                  <TouchableOpacity
                    key={recinto.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedRecintoIndex(isSelected ? null : recinto.id)}
                    style={[
                      styles.recintoCard,
                      isAlert && styles.recintoCardAlert,
                      isSelected && styles.recintoCardSelected,
                    ]}
                  >
                    <View style={styles.recintoMainRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.recintoName}>{recinto.name}</Text>
                        <Text style={styles.recintoParroquia}>
                          Parroquia {recinto.parroquia} ({recinto.tipo})
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <StatusBadge
                          status={isAlert ? 'error' : recinto.status === 'completo' ? 'success' : 'pending'}
                          customLabel={recinto.mesas}
                        />
                        <Text
                          style={[
                            styles.recintoDistText,
                            isAlert && { color: BrandColors.rojoAlerta, fontWeight: '700' },
                          ]}
                        >
                          GPS: {recinto.dist}
                        </Text>
                      </View>
                    </View>

                    {/* Despliegue interactivo del recinto */}
                    {isSelected && (
                      <View style={styles.recintoExpandedBox}>
                        <View style={styles.recintoExpandedRow}>
                          <Text style={styles.recintoCoordLabel}>Coordenadas:</Text>
                          <Text style={styles.recintoCoordValue}>
                            Lat {recinto.lat}, Lon {recinto.lon}
                          </Text>
                        </View>
                        <Text style={styles.recintoMesaDesc}>
                          Mesas JRV: 001-M, 002-M, 003-F (Demostración). 2 dignidades por mesa.
                        </Text>
                        {isAlert && (
                          <View style={styles.alertaGpsExplanation}>
                            <VectorIcon name="alert-triangle" size={14} color={BrandColors.rojoAlerta} />
                            <Text style={styles.alertaGpsText}>
                              Acta capturada a 340m del recinto. Supera el radio de tolerancia de 200m (S-08). Registrada con advertencia para auditoría provincial.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VISTA 4: MAPA GEORREFERENCIADO Y GEOFENCING (ADR-04)                       */}
        {/* ========================================================================= */}
        {activeTab === 'mapa' && (
          <View style={styles.detailedSection}>
            <TouchableOpacity
              onPress={() => setActiveTab('inicio')}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>← Volver a Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.sectionOverline}>TRAZABILIDAD ESPACIAL (ADR-04, S-08)</Text>
            <Text style={styles.detailedSectionTitle}>Mapa de Recintos</Text>
            <Text style={styles.detailedSectionSubtitle}>
              Auditoría de perímetro georreferenciado con radio de tolerancia de 200m.
            </Text>

            <View style={styles.mapContainerCard}>
              <View style={styles.mapMockCanvas}>
                <QuitoSkylineIllustration height={80} opacity={0.35} />
                <View style={styles.mapPinPulseOuter}>
                  <View style={styles.mapPinPulseInner} />
                </View>
                <Text style={styles.mapCanvasTitle}>Cartografía Vectorial Abierta</Text>
                <Text style={styles.mapCanvasDesc}>
                  OpenStreetMap + Leaflet embebido en WebView local sin costos de API (ADR-04).
                </Text>
              </View>

              <View style={styles.mapSummaryRow}>
                <View style={styles.mapStatItem}>
                  <Text style={styles.mapStatNumber}>11</Text>
                  <Text style={styles.mapStatLabel}>En rango (&lt;200m)</Text>
                </View>
                <View style={styles.mapStatDivider} />
                <View style={styles.mapStatItem}>
                  <Text style={[styles.mapStatNumber, { color: BrandColors.rojoAlerta }]}>1</Text>
                  <Text style={styles.mapStatLabel}>Fuera de rango</Text>
                </View>
                <View style={styles.mapStatDivider} />
                <View style={styles.mapStatItem}>
                  <Text style={styles.mapStatNumber}>91.7%</Text>
                  <Text style={styles.mapStatLabel}>Conformidad GPS</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Espaciador de seguridad para garantizar que la barra flotante no solape nada */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* 2. Barra de Navegación Inferior Flotante (FloatingBottomBar) */}
      <FloatingBottomBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedRecintoIndex(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.fondoMarfil,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: 130, // Protección explícita para evitar solapamiento con FloatingBottomBar
  },

  // Encabezado Editorial
  editorialHeader: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleGroup: {
    flex: 1,
  },
  dateContextLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.textoMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -0.6,
  },
  jurisdictionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  monogramContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monogramLetter: {
    fontSize: 20,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
  },
  monogramSubtleAccent: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BrandColors.rojoQuito,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: FontFamilies.bodySemiBold,
    color: BrandColors.azulTitulos,
    marginLeft: 6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BrandColors.verdeExito,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
  illustrationWrapper: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  // Declaración Escultórica de Progreso
  sculpturalProgressContainer: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  sectionOverline: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    letterSpacing: 0.9,
    color: BrandColors.textoMuted,
    marginBottom: 4,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  sculpturalPercentNumber: {
    fontSize: 52,
    lineHeight: 56,
    fontFamily: FontFamilies.titleExtraBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -1.5,
  },
  sculpturalContextBlock: {
    marginLeft: 14,
    justifyContent: 'center',
  },
  sculpturalStatusHeading: {
    fontSize: 15,
    fontFamily: FontFamilies.titleSemiBold,
    color: BrandColors.azulTitulos,
  },
  sculpturalMesasFraction: {
    fontSize: 12,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  sculpturalTrack: {
    height: 6,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
    marginVertical: Spacing.xs,
  },
  sculpturalFill: {
    height: '100%',
    backgroundColor: BrandColors.azulPrincipal,
    borderRadius: 3,
  },
  sculpturalRedAccent: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2.5,
    backgroundColor: BrandColors.rojoQuito,
    borderRadius: 1,
  },
  editorialMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  editorialMetricCell: {
    flex: 1,
    alignItems: 'center',
  },
  editorialMetricNumber: {
    fontSize: 18,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
  },
  editorialMetricLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  editorialMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: BrandColors.azulSuperficie,
  },

  // Sección Portales Guiados
  portalsSectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  portalsSectionTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -0.3,
  },
  guidedPortalCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Elevations.subtle,
  },
  portalAccentLine: {
    width: 4,
    backgroundColor: BrandColors.azulPrincipal,
  },
  portalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  portalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitle: {
    fontSize: 16,
    fontFamily: FontFamilies.titleSemiBold,
    color: BrandColors.azulTitulos,
  },
  portalSubtitle: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 1,
  },
  portalBadge: {
    backgroundColor: BrandColors.azulSuperficie,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  portalBadgeText: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.azulTitulos,
  },
  portalDescription: {
    fontSize: 12,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  portalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  portalActionText: {
    fontSize: 12,
    fontFamily: FontFamilies.bodySemiBold,
    color: BrandColors.azulPrincipal,
    marginRight: 4,
  },

  // Outbox Status
  outboxBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.superficieCalida,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  outboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  outboxText: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginLeft: 8,
  },
  outboxButton: {
    backgroundColor: BrandColors.blancoSuperficie,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  outboxButtonText: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.azulTitulos,
  },

  // Vistas Detalladas (Resultados, Recintos, Mapa)
  detailedSection: {
    paddingTop: Spacing.xs,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.full,
    marginBottom: Spacing.sm,
  },
  backButtonText: {
    fontSize: 12,
    fontFamily: FontFamilies.bodySemiBold,
    color: BrandColors.azulTitulos,
  },
  detailedSectionTitle: {
    fontSize: 24,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -0.5,
  },
  detailedSectionSubtitle: {
    fontSize: 13,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  segmentedFilterContainer: {
    flexDirection: 'row',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.full,
    padding: 3,
    marginBottom: Spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  segmentButtonActive: {
    backgroundColor: BrandColors.blancoSuperficie,
    ...Elevations.subtle,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
  segmentTextActive: {
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.azulTitulos,
  },
  resultsCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  votosNoValidosContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  votosNoValidosTitle: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.textoMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  votosNoValidosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  votoChip: {
    backgroundColor: BrandColors.superficieCalida,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: Radii.xs,
  },
  votoChipLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
  votoChipValue: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },

  // Recintos
  recintosListContainer: {
    marginTop: Spacing.xs,
  },
  recintoCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  recintoCardAlert: {
    borderColor: BrandColors.rojoAlertaBorder,
    backgroundColor: '#FFFDFD',
  },
  recintoCardSelected: {
    borderColor: BrandColors.azulPrincipal,
  },
  recintoMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recintoName: {
    fontSize: 14,
    fontFamily: FontFamilies.titleSemiBold,
    color: BrandColors.azulTitulos,
  },
  recintoParroquia: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  recintoDistText: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoMuted,
    marginTop: 2,
  },
  recintoExpandedBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  recintoExpandedRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  recintoCoordLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.bodySemiBold,
    color: BrandColors.textoSecundario,
    width: 90,
  },
  recintoCoordValue: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.azulTitulos,
  },
  recintoMesaDesc: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 4,
  },
  alertaGpsExplanation: {
    flexDirection: 'row',
    backgroundColor: BrandColors.rojoAlertaLight,
    padding: 8,
    borderRadius: Radii.sm,
    marginTop: 6,
    alignItems: 'flex-start',
  },
  alertaGpsText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.rojoAlerta,
    marginLeft: 6,
    lineHeight: 16,
  },

  // Mapa
  mapContainerCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  mapMockCanvas: {
    height: 200,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    position: 'relative',
  },
  mapPinPulseOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(64, 92, 121, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapPinPulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.azulPrincipal,
  },
  mapCanvasTitle: {
    fontSize: 14,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    marginTop: 4,
  },
  mapCanvasDesc: {
    fontSize: 11,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 280,
  },
  mapSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  mapStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mapStatNumber: {
    fontSize: 18,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
  },
  mapStatLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  mapStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: BrandColors.azulSuperficie,
  },
});
