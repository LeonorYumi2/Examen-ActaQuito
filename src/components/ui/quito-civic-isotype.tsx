import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { BrandColors } from '@/constants/tokens';

export interface QuitoCivicIsotypeProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * QuitoCivicIsotype — QUITO CÍVICO ABSTRACTO (Opción 3)
 *
 * Emblema vectorial geométrico y contemporáneo de identidad editorial premium:
 * - Marco base con radio suave en azul profundo (#253D59) y fondo cálido marfil (#F7F4EF) / superficie (#FFFFFF).
 * - Arco colonial de medio punto: Homenaje a los claustros y portales del Centro Histórico de Quito.
 * - Triángulo/prisma abstracto en el interior: Evocación geométrica del volcán Pichincha que resguarda la ciudad.
 * - Detalle cívico: Pequeño punto rojo Quito (#C83349) en el ápice/linterna superior, simbolizando el punto focal cívico.
 *
 * Mantiene perfecta legibilidad en tamaños reducidos (44dp a 52dp) sin detalles superfluos.
 */
export const QuitoCivicIsotype: React.FC<QuitoCivicIsotypeProps> = ({
  size = 48,
  style,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
      >
        {/* Fondo del emblema con esquinas redondeadas elegantes */}
        <Rect
          x={1}
          y={1}
          width={46}
          height={46}
          rx={12}
          fill={BrandColors.blancoSuperficie}
          stroke={BrandColors.azulBorde}
          strokeWidth={1.5}
        />

        {/* Arco colonial exterior (medio punto) */}
        <Path
          d="M13 36 V24 C13 17.925 17.925 13 24 13 C30.075 13 35 17.925 35 24 V36"
          stroke={BrandColors.azulTitulos}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Geometría abstracta del Pichincha: Prisma / montaña interior en azul grisáceo */}
        <Path
          d="M18.5 36 L24 23.5 L29.5 36"
          stroke={BrandColors.azulPrincipal}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Línea horizontal de base cívica */}
        <Path
          d="M10 36 H38"
          stroke={BrandColors.azulTitulos}
          strokeWidth={2.2}
          strokeLinecap="round"
        />

        {/* Detalle cívico: Punto focal rojo Quito en la cúspide */}
        <Circle
          cx={24}
          cy={8.5}
          r={2.2}
          fill={BrandColors.rojoQuito}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
