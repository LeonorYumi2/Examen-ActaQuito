import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BrandColors } from '@/constants/tokens';

export interface QuitoPatternProps {
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * QuitoPattern
 *
 * Micro-patrón ornamental sobrio inspirado en los artesonados y filigranas de Quito.
 * Ahora en tono Rojo Institucional suave o Azul Suave para aportar distinción sin estridencias.
 */
export const QuitoPattern: React.FC<QuitoPatternProps> = ({
  color = BrandColors.rojoQuito,
  opacity = 0.14,
  style,
}) => {
  return (
    <View style={[styles.container, { opacity }, style]} pointerEvents="none">
      <View style={styles.row}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.unit}>
            <View style={[styles.diamond, { borderColor: color }]} />
            <View style={[styles.dot, { backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={[styles.row, { marginTop: -6 }]}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.unit}>
            <View style={[styles.diamond, { borderColor: color }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    height: 38,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  unit: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamond: {
    width: 14,
    height: 14,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
