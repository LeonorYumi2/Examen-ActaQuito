import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radii, Spacing } from '@/constants/tokens';
import { VectorIcon } from './vector-icon';

/**
 * CivicDisclaimerBanner (Refinado)
 *
 * Identidad sobria quiteña:
 * - Fondo Azul Principal Elegante (#2F4C7E)
 * - Acento cívico en Rojo Institucional Quito (#C83349)
 * - Rotulado estricto: "Conteo preliminar, no oficial" (S-06)
 */
export const CivicDisclaimerBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <View style={styles.badgeRow}>
        <VectorIcon name="shield-check" size={14} color={BrandColors.rojoQuito} />
        <Text style={styles.badge}>CONTROL ELECTORAL PARTIDARIO · QUITO</Text>
      </View>
      <Text style={styles.text}>
        Resultados preliminares computados de actas físicas por veedores propios.
        Conteo preliminar, no oficial. No reemplaza los datos oficiales del CNE.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: BrandColors.azulPrincipal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: BrandColors.rojoQuito,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: BrandColors.rojoQuitoLight,
    marginLeft: 6,
  },
  text: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: BrandColors.blancoCalido,
    opacity: 0.95,
  },
});
