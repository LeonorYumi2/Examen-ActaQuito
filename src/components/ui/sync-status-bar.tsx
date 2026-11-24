import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandColors, Radii, Spacing } from '@/constants/tokens';
import { VectorIcon } from './vector-icon';

export interface SyncStatusBarProps {
  isOnline: boolean;
  pendingCount: number;
  onPressPending?: () => void;
  onToggleConnectionMock?: () => void;
}

/**
 * SyncStatusBar (Refinado Quito)
 *
 * Requerimiento RF-13:
 * Conectividad y cola de sincronización con paleta sobria:
 * - Verde sobrio (#2E7D46) para conexión estable
 * - Rojo institucional (#C83349) para actas pendientes
 */
export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isOnline,
  pendingCount,
  onPressPending,
  onToggleConnectionMock,
}) => {
  return (
    <View style={styles.container}>
      {/* Indicador de Conexión */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleConnectionMock}
        style={styles.connectionBadge}
        accessibilityRole="button"
        accessibilityLabel={isOnline ? 'Conexión activa' : 'Sin conexión'}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isOnline ? BrandColors.verdeSobrio : BrandColors.rojoQuito },
          ]}
        />
        <Text style={styles.connectionText}>
          {isOnline ? 'En línea (Pichincha)' : 'Modo Seguro (Sin Señal)'}
        </Text>
      </TouchableOpacity>

      {/* Indicador de Actas Pendientes (RF-13, RNF-06) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressPending}
        style={[
          styles.pendingBadge,
          pendingCount > 0 ? styles.pendingBadgeActive : styles.pendingBadgeSynced,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${pendingCount} actas pendientes`}
      >
        <VectorIcon
          name={pendingCount > 0 ? 'refresh' : 'check-circle'}
          size={12}
          color={pendingCount > 0 ? BrandColors.rojoQuito : BrandColors.azulPrincipal}
          style={{ marginRight: 4 }}
        />
        <Text
          style={[
            styles.pendingText,
            pendingCount > 0 ? styles.pendingTextActive : styles.pendingTextSynced,
          ]}
        >
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'acta en teléfono' : 'actas en teléfono'}`
            : 'Sincronizado'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.blancoCalido,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderSubtle,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: BrandColors.blancoCalidoSubtle,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  pendingBadgeActive: {
    backgroundColor: BrandColors.rojoQuitoLight,
    borderWidth: 1,
    borderColor: BrandColors.rojoQuitoBorder,
  },
  pendingBadgeSynced: {
    backgroundColor: BrandColors.azulSuaveLight,
    borderWidth: 1,
    borderColor: BrandColors.azulSuaveBorder,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pendingTextActive: {
    color: BrandColors.rojoQuito,
  },
  pendingTextSynced: {
    color: BrandColors.azulPrincipal,
  },
});
