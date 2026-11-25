import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Line, Rect, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { BrandColors } from '@/constants/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface QuitoSkylineIllustrationProps {
  color?: string;
  opacity?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

/**
 * QuitoSkylineIllustration — ARTE LINEAL ARQUITECTÓNICO DE QUITO ANIMADO
 *
 * Secuencia de animación en 2 Fases:
 *
 * FASE A — DIBUJO PROGRESIVO VECTORIAL (0 a ~2500ms):
 * 1. El horizonte del volcán Pichincha y la línea de base se dibujan suavemente
 *    mediante `strokeDashoffset` (de su longitud total a 0).
 * 2. Progresivamente, la Basílica del Voto Nacional, la cúpula de San Francisco/La Compañía,
 *    la cúpula menor y el Panecillo trazan sus líneas arquitectónicas con desfases escalonados.
 * 3. En t = 2500ms, todas las líneas quedan 100% completas y estáticas.
 *
 * FASE B — MICROANIMACIÓN AMBIENTAL CÍVICA (A partir de t = 2600ms):
 * - Un sutil punto ornamental luminoso recorre suavemente la curva del horizonte del Pichincha
 *   y la cresta colonial en un ciclo lento y sereno (sin rebotes bruscos).
 * - Duración de ciclo: 4500ms ida y vuelta continua.
 *
 * ACCESIBILIDAD:
 * - Respeta ReduceMotion.System. Si está activo, el skyline se muestra de inmediato 100% estático.
 */
export const QuitoSkylineIllustration: React.FC<QuitoSkylineIllustrationProps> = ({
  color = BrandColors.azulPrincipal,
  opacity = 0.78,
  height = 74,
  style,
  animated = true,
}) => {
  // Progresos de trazo para las diferentes secciones arquitectónicas
  // 0 = no dibujado (offset = longitud), 1 = completamente dibujado (offset = 0)
  const mountainProgress = useSharedValue(animated ? 0 : 1);
  const baseProgress = useSharedValue(animated ? 0 : 1);
  const basilicaProgress = useSharedValue(animated ? 0 : 1);
  const cupulaProgress = useSharedValue(animated ? 0 : 1);
  const panecilloProgress = useSharedValue(animated ? 0 : 1);

  // Microanimación ambiental: pulso y desplazamiento a lo largo del horizonte
  const ambientProgress = useSharedValue(0);
  const ambientOpacity = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      mountainProgress.value = 1;
      baseProgress.value = 1;
      basilicaProgress.value = 1;
      cupulaProgress.value = 1;
      panecilloProgress.value = 1;
      ambientOpacity.value = 0;
      return;
    }

    const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

    // 1. Trazado del Pichincha (inicia en t = 0ms, dura 2100ms)
    mountainProgress.value = withTiming(1, {
      duration: 2100,
      easing: ease,
      reduceMotion: ReduceMotion.System,
    });

    // 2. Línea de base cívica (inicia en t = 100ms, dura 1800ms)
    baseProgress.value = withDelay(
      100,
      withTiming(1, {
        duration: 1800,
        easing: ease,
        reduceMotion: ReduceMotion.System,
      })
    );

    // 3. Basílica del Voto Nacional (inicia en t = 350ms, dura 1800ms -> t ~ 2150ms)
    basilicaProgress.value = withDelay(
      350,
      withTiming(1, {
        duration: 1800,
        easing: ease,
        reduceMotion: ReduceMotion.System,
      })
    );

    // 4. Cúpula Barroca y menor (inicia en t = 550ms, dura 1800ms -> t ~ 2350ms)
    cupulaProgress.value = withDelay(
      550,
      withTiming(1, {
        duration: 1800,
        easing: ease,
        reduceMotion: ReduceMotion.System,
      })
    );

    // 5. El Panecillo (inicia en t = 750ms, dura 1700ms -> t ~ 2450ms)
    panecilloProgress.value = withDelay(
      750,
      withTiming(1, {
        duration: 1700,
        easing: ease,
        reduceMotion: ReduceMotion.System,
      })
    );

    // FASE B: Microanimación ambiental activa a partir de t = 2500ms
    ambientOpacity.value = withDelay(
      2500,
      withTiming(0.85, { duration: 800, reduceMotion: ReduceMotion.System })
    );

    ambientProgress.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 4800,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: 4800,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          })
        ),
        -1, // bucle sutil infinito
        false
      )
    );
  }, [
    animated,
    mountainProgress,
    baseProgress,
    basilicaProgress,
    cupulaProgress,
    panecilloProgress,
    ambientProgress,
    ambientOpacity,
  ]);

  // Props animadas para Mountain (Pichincha) - Longitud aprox: 420
  const mountainProps = useAnimatedProps(() => {
    const len = 420;
    return {
      strokeDashoffset: len * (1 - mountainProgress.value),
    };
  });

  // Props animadas para Base Horizon - Longitud: 360
  const baseLineProps = useAnimatedProps(() => {
    const len = 360;
    return {
      strokeDashoffset: len * (1 - baseProgress.value),
    };
  });

  // Props animadas para Basílica - Longitud aprox de conjunto: 280
  const basilicaProps = useAnimatedProps(() => {
    const len = 280;
    return {
      strokeDashoffset: len * (1 - basilicaProgress.value),
      opacity: basilicaProgress.value,
    };
  });

  // Props animadas para Cúpula Colonial - Longitud aprox: 220
  const cupulaProps = useAnimatedProps(() => {
    const len = 220;
    return {
      strokeDashoffset: len * (1 - cupulaProgress.value),
      opacity: cupulaProgress.value,
    };
  });

  // Props animadas para Panecillo - Longitud aprox: 160
  const panecilloProps = useAnimatedProps(() => {
    const len = 160;
    return {
      strokeDashoffset: len * (1 - panecilloProgress.value),
      opacity: panecilloProgress.value,
    };
  });

  // Microanimación ambiental: un haz ornamental que recorre la silueta
  const ambientPointProps = useAnimatedProps(() => {
    // Recorre de x = 20 a x = 340 suavemente
    const t = ambientProgress.value;
    const cx = 20 + t * 320;
    // Sigue aproximadamente la curvatura de la silueta: y varía entre 24 y 36
    const cy = 28 + Math.sin(t * Math.PI * 2) * 6;
    return {
      cx,
      cy,
      opacity: ambientOpacity.value * 0.75,
    };
  });

  const ambientGlowProps = useAnimatedProps(() => {
    const t = ambientProgress.value;
    const cx = 20 + t * 320;
    const cy = 28 + Math.sin(t * Math.PI * 2) * 6;
    return {
      cx,
      cy,
      opacity: ambientOpacity.value * 0.35,
    };
  });

  return (
    <View style={[styles.container, { height }, style]}>
      <Svg
        width="100%"
        height={height}
        viewBox="0 0 360 72"
        preserveAspectRatio="xMidYMid meet"
      >
        <G stroke={color} opacity={opacity} fill="none">
          {/* 1. Volcán Pichincha: Curva continua de montaña en el fondo */}
          <AnimatedPath
            d="M-10 38 Q60 14 110 26 T220 18 T370 32"
            strokeWidth={1.5}
            strokeDasharray="420"
            animatedProps={mountainProps}
          />

          {/* 2. Basílica del Voto Nacional (Torres neogóticas) */}
          <AnimatedG strokeDasharray="280" animatedProps={basilicaProps}>
            {/* Torre izquierda */}
            <Path d="M46 70 L46 24 L50 12 L54 24 L54 70" strokeWidth={1.6} />
            <Line x1={50} y1={12} x2={50} y2={6} strokeWidth={1.5} />
            <Line x1={48} y1={8} x2={52} y2={8} strokeWidth={1.5} />
            <Rect x={48} y={32} width={4} height={9} rx={2} strokeWidth={1.2} />

            {/* Nave central con rosetón */}
            <Path d="M54 70 L54 44 L68 44 L68 70" strokeWidth={1.5} />
            <Circle cx={61} cy={55} r={4.5} strokeWidth={1.3} />

            {/* Torre derecha */}
            <Path d="M68 70 L68 24 L72 12 L76 24 L76 70" strokeWidth={1.6} />
            <Line x1={72} y1={12} x2={72} y2={6} strokeWidth={1.5} />
            <Line x1={70} y1={8} x2={74} y2={8} strokeWidth={1.5} />
            <Rect x={70} y={32} width={4} height={9} rx={2} strokeWidth={1.2} />
          </AnimatedG>

          {/* 3. Cúpula Barroca Colonial (San Francisco / La Compañía) y cúpula menor */}
          <AnimatedG strokeDasharray="220" animatedProps={cupulaProps}>
            <Path d="M138 70 L138 44 Q154 22 170 44 L170 70" strokeWidth={1.8} />
            {/* Tambor cilíndrico con arcos */}
            <Line x1={138} y1={58} x2={170} y2={58} strokeWidth={1.2} />
            <Path d="M142 58 Q146 51 150 58 M158 58 Q162 51 166 58" strokeWidth={1.3} />
            {/* Linterna y pináculo */}
            <Rect x={151} y={15} width={6} height={7} rx={1} strokeWidth={1.3} />
            <Line x1={154} y1={15} x2={154} y2={8} strokeWidth={1.5} />
            <Line x1={152.5} y1={10.5} x2={155.5} y2={10.5} strokeWidth={1.4} />

            {/* 4. Cúpula Menor */}
            <Path d="M188 70 L188 52 Q198 36 208 52 L208 70" strokeWidth={1.5} />
            <Line x1={198} y1={36} x2={198} y2={28} strokeWidth={1.3} />
          </AnimatedG>

          {/* 5. Colina de El Panecillo con monumento cumbre */}
          <AnimatedG strokeDasharray="160" animatedProps={panecilloProps}>
            <Path d="M255 70 Q295 38 335 70" strokeWidth={1.8} />
            <Line x1={295} y1={46} x2={295} y2={34} strokeWidth={2} />
            <Circle cx={295} cy={32} r={2} strokeWidth={1.5} />
          </AnimatedG>

          {/* 6. Línea de horizonte de base continua */}
          <AnimatedLine
            x1={0}
            y1={70}
            x2={360}
            y2={70}
            strokeWidth={1.8}
            strokeDasharray="360"
            animatedProps={baseLineProps}
          />
        </G>

        {/* FASE B: Microanimación ambiental sutil (punto luminoso ornamental) */}
        {animated && (
          <G fill="none">
            {/* Halo exterior suave */}
            <AnimatedCircle
              r={5}
              fill={BrandColors.azulSuperficie}
              animatedProps={ambientGlowProps}
            />
            {/* Núcleo de luz tenue */}
            <AnimatedCircle
              r={2}
              fill={BrandColors.rojoQuito}
              animatedProps={ambientPointProps}
            />
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
