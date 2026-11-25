import LottieView from 'lottie-react-native';
import { BrandColors } from '@/constants/tokens';

function pulse(color: number[]) {
  return {
    v: '5.7.4', fr: 24, ip: 0, op: 24, w: 24, h: 24, assets: [],
    layers: [{
      ty: 4, ip: 0, op: 24, st: 0, sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [100], e: [25], o: { x: 0.33, y: 0.33 }, i: { x: 0.67, y: 0.67 } }, { t: 24, s: [25] }] },
        r: { a: 0, k: 0 }, p: { a: 0, k: [12, 12, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [60, 60, 100], e: [140, 140, 100], o: { x: 0.33, y: 0.33 }, i: { x: 0.67, y: 0.67 } }, { t: 24, s: [140, 140, 100] }] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [14, 14] } },
        { ty: 'st', o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, c: { a: 0, k: color } },
      ],
    }],
  };
}

const light = pulse([1, 1, 1, 1]);
const blue = pulse([0, 1, 2].map((index) => parseInt(BrandColors.azulPrincipal.slice(index * 2 + 1, index * 2 + 3), 16) / 255).concat(1));

export function AuthPending({ onDark = false }: { onDark?: boolean }) {
  return <LottieView autoPlay loop source={onDark ? light : blue} style={{ width: 24, height: 24 }} />;
}
