import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BrandColors } from '@/constants/tokens';

export interface QuitoSkylineIllustrationProps {
  color?: string;
  opacity?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * QuitoSkylineIllustration
 *
 * Arte lineal arquitectónico vectorial representativo de Quito:
 * - Silueta suave del volcán Pichincha
 * - Torres y agujas neogóticas de la Basílica del Voto Nacional
 * - Cúpulas barrocas coloniales de San Francisco y La Compañía de Jesús
 * - Curva de la colina de El Panecillo
 * - Línea de horizonte cívica con filete sutil
 *
 * Implementado con primitivas geométricas de React Native para garantizar
 * nitidez vectorial pura, ligereza y cero dependencias nativas complejas.
 */
export const QuitoSkylineIllustration: React.FC<QuitoSkylineIllustrationProps> = ({
  color = BrandColors.grisAzulado,
  opacity = 0.5,
  height = 68,
  style,
}) => {
  return (
    <View style={[styles.container, { height, opacity }, style]}>
      {/* 1. Silueta de montaña: Pichincha al fondo (diagonal sutil) */}
      <View style={[styles.mountainSlope, { borderColor: color }]} />

      {/* 2. Basílica del Voto Nacional (Torres neogóticas) */}
      <View style={styles.basilicaContainer}>
        {/* Torre izquierda */}
        <View style={styles.basilicaTower}>
          <View style={[styles.towerSpire, { borderBottomColor: color }]} />
          <View style={[styles.towerBody, { borderColor: color }]}>
            <View style={[styles.towerWindow, { borderColor: color }]} />
          </View>
        </View>

        {/* Nave central */}
        <View style={[styles.basilicaNave, { borderColor: color }]}>
          <View style={[styles.roseWindow, { borderColor: color }]} />
        </View>

        {/* Torre derecha */}
        <View style={styles.basilicaTower}>
          <View style={[styles.towerSpire, { borderBottomColor: color }]} />
          <View style={[styles.towerBody, { borderColor: color }]}>
            <View style={[styles.towerWindow, { borderColor: color }]} />
          </View>
        </View>
      </View>

      {/* 3. Cúpula Colonial Barroca (San Francisco / La Compañía) */}
      <View style={styles.cupolaContainer}>
        {/* Linterna / Pináculo superior */}
        <View style={[styles.lanternPinnacle, { backgroundColor: color }]} />
        {/* Linterna central */}
        <View style={[styles.cupolaLantern, { borderColor: color }]} />
        {/* Cúpula de media naranja */}
        <View style={[styles.cupolaDome, { borderColor: color }]} />
        {/* Tambor cilíndrico */}
        <View style={[styles.cupolaDrum, { borderColor: color }]}>
          <View style={[styles.drumArches, { borderColor: color }]} />
          <View style={[styles.drumArches, { borderColor: color }]} />
        </View>
      </View>

      {/* 4. Segunda Cúpula menor (Capilla colonial) */}
      <View style={styles.smallCupolaContainer}>
        <View style={[styles.smallDome, { borderColor: color }]} />
        <View style={[styles.smallDrum, { borderColor: color }]} />
      </View>

      {/* 5. El Panecillo (Curva de colina suave) */}
      <View style={[styles.panecilloHill, { borderColor: color }]}>
        <View style={[styles.panecilloMonument, { backgroundColor: color }]} />
      </View>

      {/* 6. Línea de horizonte de base continua */}
      <View style={[styles.horizonLine, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  mountainSlope: {
    position: 'absolute',
    top: 6,
    left: -20,
    width: 220,
    height: 70,
    borderTopWidth: 1.2,
    borderRightWidth: 1.2,
    borderColor: BrandColors.grisAzulado,
    transform: [{ rotate: '14deg' }],
    opacity: 0.45,
  },
  // Basílica
  basilicaContainer: {
    position: 'absolute',
    bottom: 2,
    left: '14%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  basilicaTower: {
    alignItems: 'center',
  },
  towerSpire: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  towerBody: {
    width: 8,
    height: 22,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    alignItems: 'center',
    paddingTop: 3,
  },
  towerWindow: {
    width: 3,
    height: 6,
    borderWidth: 1,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
  },
  basilicaNave: {
    width: 14,
    height: 14,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roseWindow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  // Cúpula colonial
  cupolaContainer: {
    position: 'absolute',
    bottom: 2,
    left: '46%',
    alignItems: 'center',
  },
  lanternPinnacle: {
    width: 1.5,
    height: 6,
    marginBottom: 1,
  },
  cupolaLantern: {
    width: 6,
    height: 4,
    borderWidth: 1,
  },
  cupolaDome: {
    width: 24,
    height: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
  },
  cupolaDrum: {
    width: 24,
    height: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  drumArches: {
    width: 4,
    height: 5,
    borderWidth: 0.8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  // Pequeña cúpula
  smallCupolaContainer: {
    position: 'absolute',
    bottom: 2,
    left: '60%',
    alignItems: 'center',
  },
  smallDome: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  smallDrum: {
    width: 14,
    height: 5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  // El Panecillo
  panecilloHill: {
    position: 'absolute',
    bottom: -15,
    right: '8%',
    width: 70,
    height: 40,
    borderRadius: 35,
    borderTopWidth: 1.2,
    alignItems: 'center',
    paddingTop: 4,
  },
  panecilloMonument: {
    width: 3,
    height: 10,
    borderRadius: 1.5,
  },
  // Horizonte
  horizonLine: {
    width: '100%',
    height: 1,
    opacity: 0.6,
  },
});
