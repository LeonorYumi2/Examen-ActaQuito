import React, { useEffect, useState } from 'react';
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
  FileText,
  MapPin,
  Camera,
  Lock,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { BrandColors, Elevations, Radii, Spacing, FontFamilies } from '@/constants/tokens';
import { InstitutionalHeader } from '@/components/ui/institutional-header';
import { useAuth } from '@/features/auth/presentation/auth-state';
import {
  operacionesPorRolRepositorio,
  type VeedorDashboardData,
} from '@/features/recintos/data/operaciones-roles';

export const VeedorDashboardScreen: React.FC = () => {
  const access = useAuth((state) => state.access);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [datos, setDatos] = useState<VeedorDashboardData>({ mesas: [] });
  const [error, setError] = useState<string>();

  const cargarDatos = async () => {
    try {
      setError(undefined);
      const data = await operacionesPorRolRepositorio.obtenerDatosVeedor();
      setDatos(data);
    } catch (err: any) {
      setError(err?.message ?? 'No fue posible cargar las mesas asignadas.');
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

  if (!access) return null;
  if (access.kind !== 'operational' || access.profile.role !== 'veedor') {
    return <Redirect href="/" />;
  }

  const primeraMesa = datos.mesas[0];
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(20, Math.min(24, Math.floor(width * 0.055)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.blancoSuperficie} />

      <InstitutionalHeader
        role="veedor"
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
        {/* Recinto & Mesas Hero Card */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={BrandColors.azulTitulos} />
            <Text style={styles.loadingText}>Cargando mesas asignadas…</Text>
          </View>
        ) : datos.mesas.length > 0 ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconBox}>
                <Building2 size={20} color={BrandColors.azulTitulos} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroOverline}>RECINTO ASIGNADO</Text>
                <Text style={styles.heroTitle}>{datos.recintoNombre}</Text>
                <Text style={styles.heroSubtitle}>Código: {datos.recintoCodigo}</Text>
              </View>
            </View>

            {/* Assigned Mesas Chips */}
            <View style={styles.mesasSection}>
              <Text style={styles.mesasSectionTitle}>JUNTAS RECEPTORAS ASIGNADAS</Text>
              <View style={styles.mesasChipsRow}>
                {datos.mesas.map((m) => (
                  <View key={m.mesaNumero} style={styles.mesaChip}>
                    <Vote size={12} color={BrandColors.azulTitulos} />
                    <Text style={styles.mesaChipText}>
                      JRV #{String(m.mesaNumero).padStart(3, '0')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyHeroCard}>
            <AlertCircle size={28} color={BrandColors.rojoAlerta} />
            <Text style={styles.emptyHeroTitle}>Sin asignación de mesa</Text>
            <Text style={styles.emptyHeroDesc}>
              Tu cuenta de veedor no cuenta con mesas asignadas actualmente. Contacta al coordinador de
              tu recinto electoral para habilitar tu asignación.
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={BrandColors.rojoAlerta} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Section: Actas por Dignidad */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registro de Actas Electorales</Text>
          <Text style={styles.sectionSubtitle}>
            Ingreso de votos y evidencia fotográfica para cada dignidad
          </Text>
        </View>

        {/* Alcaldía Card */}
        <View style={styles.dignidadCard}>
          <View style={styles.dignidadTopRow}>
            <View style={styles.dignidadIconBox}>
              <Building2 size={20} color={BrandColors.azulTitulos} />
            </View>
            <View style={styles.dignidadInfo}>
              <Text style={styles.dignidadTitle}>Alcaldía de Quito</Text>
              <Text style={styles.dignidadDesc}>
                5 candidaturas oficiales registradas en el catálogo cantonal
              </Text>
            </View>
          </View>

          {primeraMesa && primeraMesa.alcaldiaEstado ? (
            <View style={styles.dignidadStatusRow}>
              <CheckCircle2 size={14} color={BrandColors.verdeExito} />
              <Text style={styles.dignidadStatusText}>
                Acta registrada · Estado: {primeraMesa.alcaldiaEstado}
              </Text>
            </View>
          ) : (
            <View style={styles.dignidadStatusRowPending}>
              <Clock size={14} color={BrandColors.textoSecundario} />
              <Text style={styles.dignidadStatusTextPending}>
                Pendiente de captura y registro
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.dignidadButton}
            onPress={() => router.push('/actas')}
            activeOpacity={0.8}
          >
            <Text style={styles.dignidadButtonText}>
              {primeraMesa?.alcaldiaActaId ? 'Continuar Acta de Alcaldía' : 'Iniciar Registro Alcaldía'}
            </Text>
            <ChevronRight size={16} color={BrandColors.blancoSuperficie} />
          </TouchableOpacity>
        </View>

        {/* Prefectura Card */}
        <View style={styles.dignidadCard}>
          <View style={styles.dignidadTopRow}>
            <View style={styles.dignidadIconBox}>
              <Vote size={20} color={BrandColors.azulTitulos} />
            </View>
            <View style={styles.dignidadInfo}>
              <Text style={styles.dignidadTitle}>Prefectura de Pichincha</Text>
              <Text style={styles.dignidadDesc}>
                5 candidaturas provinciales listas para escrutinio
              </Text>
            </View>
          </View>

          {primeraMesa && primeraMesa.prefecturaEstado ? (
            <View style={styles.dignidadStatusRow}>
              <CheckCircle2 size={14} color={BrandColors.verdeExito} />
              <Text style={styles.dignidadStatusText}>
                Acta registrada · Estado: {primeraMesa.prefecturaEstado}
              </Text>
            </View>
          ) : (
            <View style={styles.dignidadStatusRowPending}>
              <Clock size={14} color={BrandColors.textoSecundario} />
              <Text style={styles.dignidadStatusTextPending}>
                Pendiente de captura y registro
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.dignidadButton}
            onPress={() => router.push('/actas')}
            activeOpacity={0.8}
          >
            <Text style={styles.dignidadButtonText}>
              {primeraMesa?.prefecturaActaId ? 'Continuar Acta Prefectura' : 'Iniciar Registro Prefectura'}
            </Text>
            <ChevronRight size={16} color={BrandColors.blancoSuperficie} />
          </TouchableOpacity>
        </View>

        {/* Security & Validation Capabilities */}
        <View style={styles.techCard}>
          <Text style={styles.techCardTitle}>Garantías Técnicas y Seguridad</Text>

          <View style={styles.techItem}>
            <MapPin size={16} color={BrandColors.azulPrincipal} style={styles.techIcon} />
            <View style={styles.techTextGroup}>
              <Text style={styles.techItemTitle}>Validación Territorial GPS</Text>
              <Text style={styles.techItemDesc}>
                Geocerca automática activa dentro del perímetro autorizado (200m del recinto).
              </Text>
            </View>
          </View>

          <View style={styles.techDivider} />

          <View style={styles.techItem}>
            <Camera size={16} color={BrandColors.azulPrincipal} style={styles.techIcon} />
            <View style={styles.techTextGroup}>
              <Text style={styles.techItemTitle}>Cámara y Detección de Nitidez</Text>
              <Text style={styles.techItemDesc}>
                Algoritmo de varianza Laplaciana para asegurar legibilidad en el acta fotografiada.
              </Text>
            </View>
          </View>

          <View style={styles.techDivider} />

          <View style={styles.techItem}>
            <Lock size={16} color={BrandColors.azulPrincipal} style={styles.techIcon} />
            <View style={styles.techTextGroup}>
              <Text style={styles.techItemTitle}>Cifrado Local Offline</Text>
              <Text style={styles.techItemDesc}>
                Borradores protegidos en SQLite con clave AES-256 en el SecureStore del dispositivo.
              </Text>
            </View>
          </View>
        </View>

        {/* Big Full Access Button */}
        <TouchableOpacity
          style={styles.fullAccessButton}
          onPress={() => router.push('/actas')}
          activeOpacity={0.8}
        >
          <FileText size={16} color={BrandColors.azulTitulos} />
          <Text style={styles.fullAccessButtonText}>Flujo Completo de Actas</Text>
        </TouchableOpacity>
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 13,
    color: BrandColors.textoSecundario,
  },
  heroCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.md,
    ...Elevations.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  heroInfo: {
    flex: 1,
  },
  heroOverline: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: BrandColors.azulPrincipal,
  },
  heroTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.azulTitulos,
    marginTop: 2,
  },
  heroSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  mesasSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulSuperficie,
  },
  mesasSectionTitle: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: BrandColors.textoSecundario,
    marginBottom: Spacing.xs,
  },
  mesasChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  mesaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  mesaChipText: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 11.5,
    color: BrandColors.azulTitulos,
  },
  emptyHeroCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  emptyHeroTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.rojoAlerta,
    marginTop: 4,
  },
  emptyHeroDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: BrandColors.rojoAlertaLight,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 15,
    color: BrandColors.azulTitulos,
  },
  sectionSubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  dignidadCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
    ...Elevations.card,
  },
  dignidadTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dignidadIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  dignidadInfo: {
    flex: 1,
  },
  dignidadTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14.5,
    color: BrandColors.azulTitulos,
  },
  dignidadDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
    marginTop: 2,
  },
  dignidadStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.verdeExitoLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  dignidadStatusText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11,
    color: BrandColors.verdeExito,
  },
  dignidadStatusRowPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.superficieCalida,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  dignidadStatusTextPending: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
  },
  dignidadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.sm,
  },
  dignidadButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 12.5,
    color: BrandColors.blancoSuperficie,
  },
  techCard: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Elevations.card,
  },
  techCardTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    marginBottom: Spacing.sm,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  techIcon: {
    marginTop: 2,
  },
  techTextGroup: {
    flex: 1,
  },
  techItemTitle: {
    fontFamily: FontFamilies.bodyBold,
    fontSize: 12,
    color: BrandColors.azulTitulos,
  },
  techItemDesc: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    marginTop: 1,
    lineHeight: 15,
  },
  techDivider: {
    height: 1,
    backgroundColor: BrandColors.superficieCalida,
    marginVertical: Spacing.xs + 2,
  },
  fullAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: BrandColors.azulSuperficie,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  fullAccessButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
});
