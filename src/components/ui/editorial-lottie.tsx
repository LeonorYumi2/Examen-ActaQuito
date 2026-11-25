import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { BrandColors } from '@/constants/tokens';

export type LottieAnimationType = 'proceso' | 'exito' | 'error';

/**
 * Generadores de animaciones vectoriales Lottie estándar para ActaQuito (ADR-06).
 * Diseñados según la identidad Editorial Premium:
 * - proceso: Doble anillo concéntrico con rotación y pulso (#253D59 y #405C79)
 * - exito: Trazo de checkmark expansivo y círculo de confirmación (#2E7D46)
 * - error: Rombo de advertencia con pulso rítmico (#A61E35)
 */
function generarLottieProceso() {
  const c1 = [37 / 255, 61 / 255, 89 / 255, 1]; // #253D59
  const c2 = [64 / 255, 92 / 255, 121 / 255, 1]; // #405C79

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 60,
    h: 60,
    nm: 'proceso-editorial',
    ddd: 0,
    assets: [],
    layers: [
      // Anillo exterior rotatorio
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'anillo-exterior',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: 60, s: [360] },
            ],
          },
          p: { a: 0, k: [30, 30, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [46, 46] },
          },
          {
            ty: 'st',
            o: { a: 0, k: 90 },
            w: { a: 0, k: 3.5 },
            c: { a: 0, k: c1 },
            lc: 2,
            d: [
              { n: 'd', v: { a: 0, k: 30 } },
              { n: 'g', v: { a: 0, k: 15 } },
            ],
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
      },
      // Anillo interior con pulso y contra-rotación
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'anillo-interior',
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [70] },
              { t: 30, s: [100] },
              { t: 60, s: [70] },
            ],
          },
          r: {
            a: 1,
            k: [
              { t: 0, s: [360] },
              { t: 60, s: [0] },
            ],
          },
          p: { a: 0, k: [30, 30, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [85, 85, 100] },
              { t: 30, s: [105, 105, 100] },
              { t: 60, s: [85, 85, 100] },
            ],
          },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [26, 26] },
          },
          {
            ty: 'st',
            o: { a: 0, k: 80 },
            w: { a: 0, k: 2.5 },
            c: { a: 0, k: c2 },
            lc: 2,
            d: [
              { n: 'd', v: { a: 0, k: 18 } },
              { n: 'g', v: { a: 0, k: 12 } },
            ],
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
      },
    ],
  };
}

function generarLottieExito() {
  const cVerde = [46 / 255, 125 / 255, 70 / 255, 1]; // #2E7D46

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 45,
    w: 60,
    h: 60,
    nm: 'exito-editorial',
    ddd: 0,
    assets: [],
    layers: [
      // Círculo base que emerge
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'circulo-exito',
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: 15, s: [100] },
              { t: 45, s: [100] },
            ],
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [30, 30, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [40, 40, 100] },
              { t: 18, s: [108, 108, 100] },
              { t: 26, s: [100, 100, 100] },
            ],
          },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [48, 48] },
          },
          {
            ty: 'st',
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3.5 },
            c: { a: 0, k: cVerde },
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
      },
      // Checkmark trazado
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'check-trazo',
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: 10, s: [100] },
            ],
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [30, 30, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 10, s: [70, 70, 100] },
              { t: 22, s: [110, 110, 100] },
              { t: 30, s: [100, 100, 100] },
            ],
          },
        },
        shapes: [
          {
            ty: 'sh',
            ks: {
              a: 0,
              k: {
                c: false,
                i: [[0, 0], [0, 0], [0, 0]],
                o: [[0, 0], [0, 0], [0, 0]],
                v: [[-10, 1], [-2, 9], [11, -7]],
              },
            },
          },
          {
            ty: 'st',
            o: { a: 0, k: 100 },
            w: { a: 0, k: 4 },
            c: { a: 0, k: cVerde },
            lc: 2,
            lj: 2,
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
      },
    ],
  };
}

function generarLottieError() {
  const cRojo = [166 / 255, 30 / 255, 53 / 255, 1]; // #A61E35

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 45,
    w: 60,
    h: 60,
    nm: 'error-editorial',
    ddd: 0,
    assets: [],
    layers: [
      // Rombo o triángulo con rebote de advertencia
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'circulo-alerta',
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: 10, s: [100] },
            ],
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [30, 30, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [50, 50, 100] },
              { t: 15, s: [115, 115, 100] },
              { t: 25, s: [95, 95, 100] },
              { t: 35, s: [100, 100, 100] },
            ],
          },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [48, 48] },
          },
          {
            ty: 'st',
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3.5 },
            c: { a: 0, k: cRojo },
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
      },
      // Signo de exclamación
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'exclamacion-barra',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [30, 26, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        shapes: [
          {
            ty: 'sh',
            ks: {
              a: 0,
              k: {
                c: false,
                i: [[0, 0], [0, 0]],
                o: [[0, 0], [0, 0]],
                v: [[0, -8], [0, 3]],
              },
            },
          },
          {
            ty: 'st',
            o: { a: 0, k: 100 },
            w: { a: 0, k: 4 },
            c: { a: 0, k: cRojo },
            lc: 2,
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
      },
      {
        ddd: 0,
        ind: 3,
        ty: 4,
        nm: 'exclamacion-punto',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [30, 38, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [4.5, 4.5] },
          },
          {
            ty: 'fl',
            o: { a: 0, k: 100 },
            c: { a: 0, k: cRojo },
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
      },
    ],
  };
}

const animacionesLottie = {
  proceso: generarLottieProceso(),
  exito: generarLottieExito(),
  error: generarLottieError(),
};

export interface EditorialLottieProps {
  type: LottieAnimationType;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

/**
 * Componente Lottie oficial de ActaQuito (ADR-06).
 * Soporta de manera transparente 'reduce motion' del sistema operativo
 * para accesibilidad y fluidez sin degradar rendimiento en Android.
 */
export const EditorialLottie: React.FC<EditorialLottieProps> = ({
  type,
  size = 40,
  loop,
  autoPlay = true,
  style,
  accessibilityLabel,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    const listener = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      active = false;
      listener?.remove?.();
    };
  }, []);

  const shouldLoop = loop !== undefined ? loop : type === 'proceso';
  const animationSource = animacionesLottie[type];

  // Si el usuario tiene activo "Reducir movimiento", mostramos ícono estático accesible
  if (reduceMotion) {
    return (
      <View
        style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {type === 'proceso' && <Loader2 size={size * 0.75} color={BrandColors.azulPrincipal} />}
        {type === 'exito' && <CheckCircle2 size={size * 0.75} color={BrandColors.verdeExito} />}
        {type === 'error' && <AlertTriangle size={size * 0.75} color={BrandColors.rojoAlerta} />}
      </View>
    );
  }

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <LottieView
        source={animationSource}
        autoPlay={autoPlay}
        loop={shouldLoop}
        style={{ width: size, height: size }}
      />
    </View>
  );
};
