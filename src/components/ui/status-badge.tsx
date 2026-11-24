import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusTokens, Radii } from '@/constants/tokens';

export type ActaStatusKey = 'draft' | 'pending' | 'success' | 'error';

export interface StatusBadgeProps {
  status: ActaStatusKey;
  customLabel?: string;
}

/**
 * StatusBadge
 *
 * Muestra el estado canónico de un acta electoral según RF-13:
 * - draft: "En Proceso"
 * - pending: "Pendiente de Envío" (Guardada en teléfono)
 * - success: "Enviada y Verificada"
 * - error: "Con Error"
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customLabel }) => {
  const token = StatusTokens[status] || StatusTokens.draft;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: token.background,
          borderColor: token.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: token.color }]} />
      <Text style={[styles.text, { color: token.color }]}>
        {customLabel || token.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
