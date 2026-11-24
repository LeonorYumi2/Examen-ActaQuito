import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors, Radii, Spacing, Elevations, FontFamilies } from '@/constants/tokens';
import { VectorIcon, VectorIconName } from './vector-icon';

export type ProvincialTabId = 'inicio' | 'recintos' | 'resultados' | 'mapa' | 'resumen';

export interface FloatingBottomBarProps {
  activeTab: ProvincialTabId;
  onSelectTab: (tab: ProvincialTabId) => void;
}

interface TabItem {
  id: ProvincialTabId;
  label: string;
  icon: VectorIconName;
}

const TABS: TabItem[] = [
  { id: 'inicio', label: 'Inicio', icon: 'shield-check' },
  { id: 'recintos', label: 'Recintos', icon: 'table' },
  { id: 'resultados', label: 'Resultados', icon: 'chart' },
  { id: 'mapa', label: 'Mapa', icon: 'map-pin' },
];

/**
 * FloatingBottomBar - Editorial Premium
 *
 * Barra de navegación inferior flotante tipo cápsula alargada.
 * - Fondo principal: Azul grisáceo elegante (#405C79)
 * - Píldora activa: Azul profundo (#253D59) con sutil borde de realce (#C9D8E6)
 * - Iconos vectoriales nítidos
 * - Tipografía: Nunito Sans SemiBold
 * - Áreas táctiles garantizadas de 48dp de altura
 * - Respeto de Safe Area Insets para emuladores y dispositivos físicos
 */
export const FloatingBottomBar: React.FC<FloatingBottomBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  // Normalizar 'resumen' a 'inicio' para compatibilidad
  const currentTab = activeTab === 'resumen' ? 'inicio' : activeTab;

  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: bottomOffset },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, Elevations.floatingBar]}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => onSelectTab(tab.id)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Pestaña ${tab.label}`}
            >
              <VectorIcon
                name={tab.icon}
                size={18}
                color={isActive ? BrandColors.blancoSuperficie : BrandColors.azulBorde}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? BrandColors.blancoSuperficie : BrandColors.azulBorde },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
    zIndex: 99,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: BrandColors.azulPrincipal,
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    maxWidth: 420,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    paddingVertical: 4,
    paddingHorizontal: 2,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: BrandColors.azulTitulos,
    borderWidth: 1,
    borderColor: 'rgba(201, 216, 230, 0.35)',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.bodySemiBold,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.rojoQuito,
  },
});
