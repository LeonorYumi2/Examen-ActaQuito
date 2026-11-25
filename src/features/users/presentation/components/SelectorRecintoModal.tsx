import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, ReduceMotion } from 'react-native-reanimated';
import {
  Building2,
  MapPin,
  Vote,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { CampoBusqueda } from '@/components/ui';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import type { RecintoInfo } from '@/features/recintos/data/operaciones-roles';

export interface SelectorRecintoModalProps {
  visible: boolean;
  recintos: RecintoInfo[];
  recintoSeleccionadoCodigo?: string;
  onSelect?: (codigo: string) => void;
  onSeleccionar?: (codigo: string) => void;
  onClose?: () => void;
  onCerrar?: () => void;
}

export const SelectorRecintoModal: React.FC<SelectorRecintoModalProps> = ({
  visible,
  recintos,
  recintoSeleccionadoCodigo,
  onSelect,
  onSeleccionar,
  onClose,
  onCerrar,
}) => {
  const [busqueda, setBusqueda] = useState<string>('');

  const handleSelect = (codigo: string) => {
    onSelect?.(codigo);
    onSeleccionar?.(codigo);
  };

  const handleClose = () => {
    onClose?.();
    onCerrar?.();
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

  const handleSeleccionar = (codigo: string) => {
    handleSelect(codigo);
    handleClose();
    setBusqueda('');
  };

  const handleCerrar = () => {
    handleClose();
    setBusqueda('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCerrar}
    >
      <View style={styles.overlay}>
        {/* Backdrop animado */}
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCerrar} />
        </Animated.View>

        {/* Contenedor Modal con soporte de teclado */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <Animated.View
            entering={ZoomIn.duration(200).reduceMotion(ReduceMotion.System)}
            exiting={ZoomOut.duration(150).reduceMotion(ReduceMotion.System)}
            style={styles.card}
          >
            {/* Header del Modal */}
            <View style={styles.header}>
              <View style={styles.headerTitleGroup}>
                <Text style={styles.title}>Seleccionar Recinto Electoral</Text>
                <Text style={styles.subtitle}>
                  Cantón Quito · {recintos.length} recintos disponibles
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCerrar}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar selector de recintos"
              >
                <X size={18} color={BrandColors.azulTitulos} />
              </TouchableOpacity>
            </View>

            {/* Buscador Integrado con botón de limpieza */}
            <CampoBusqueda
              valor={busqueda}
              alCambiar={setBusqueda}
              placeholder="Buscar por nombre, código o parroquia…"
              style={styles.searchBarWrapper}
            />

            {/* Lista Desplazable de Recintos */}
            <FlatList
              data={recintosFiltrados}
              keyExtractor={(item) => item.codigo}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              style={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Building2 size={32} color={BrandColors.grisAzulado} />
                  <Text style={styles.emptyTitle}>No hay recintos que coincidan</Text>
                  <Text style={styles.emptySubtitle}>
                    {busqueda
                      ? `No se encontraron resultados para "${busqueda}".`
                      : 'No hay recintos registrados en el catálogo.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const esSeleccionado = item.codigo === recintoSeleccionadoCodigo;
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      esSeleccionado && styles.itemCardSelected,
                    ]}
                    onPress={() => handleSeleccionar(item.codigo)}
                    activeOpacity={0.7}
                  >
                    {/* Indicador Radial */}
                    <View
                      style={[
                        styles.radioIndicator,
                        esSeleccionado && styles.radioIndicatorSelected,
                      ]}
                    >
                      {esSeleccionado ? (
                        <Check size={12} color={BrandColors.blancoSuperficie} />
                      ) : null}
                    </View>

                    {/* Información del Recinto */}
                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          esSeleccionado && styles.itemNameSelected,
                        ]}
                      >
                        {item.nombre}
                      </Text>

                      <View style={styles.itemMetaRow}>
                        <View style={styles.chipParroquia}>
                          <MapPin size={10} color={BrandColors.azulTitulos} />
                          <Text style={styles.chipParroquiaText}>
                            {item.parroquiaNombre ?? item.parroquiaCodigo}
                          </Text>
                        </View>

                        <Text style={styles.chipCodeText}>Cód: {item.codigo}</Text>

                        <View style={styles.chipMesas}>
                          <Vote size={10} color={BrandColors.textoSecundario} />
                          <Text style={styles.chipMesasText}>
                            {item.totalMesas} mesas
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Footer con botón de Cancelar */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelFooterButton}
                onPress={handleCerrar}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelFooterText}>Cerrar sin cambiar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  card: {
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    maxHeight: '100%',
    ...Elevations.hero,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
  },
  subtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
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
  searchBarWrapper: {
    marginBottom: Spacing.sm,
    backgroundColor: BrandColors.superficieCalida,
    height: 42,
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    gap: 6,
    paddingVertical: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    gap: 10,
  },
  itemCardSelected: {
    backgroundColor: BrandColors.azulSuperficie,
    borderColor: BrandColors.azulPrincipal,
  },
  radioIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
  },
  radioIndicatorSelected: {
    backgroundColor: BrandColors.azulTitulos,
    borderColor: BrandColors.azulTitulos,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  itemNameSelected: {
    color: BrandColors.azulPrincipal,
  },
  itemMetaRow: {
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
    fontSize: 10,
    color: BrandColors.azulTitulos,
  },
  chipCodeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoMuted,
  },
  chipMesas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BrandColors.superficieCalida,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  chipMesasText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 10,
    color: BrandColors.textoSecundario,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
    marginTop: 4,
  },
  emptySubtitle: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  footer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: BrandColors.superficieCalida,
    alignItems: 'center',
  },
  cancelFooterButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  cancelFooterText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 12,
    color: BrandColors.textoSecundario,
  },
});
