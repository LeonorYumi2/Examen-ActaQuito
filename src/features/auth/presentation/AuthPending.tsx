import { ActivityIndicator } from 'react-native';
import { BrandColors } from '@/constants/tokens';

export function AuthPending({ onDark = false }: { onDark?: boolean }) {
  return <ActivityIndicator color={onDark ? BrandColors.blancoSuperficie : BrandColors.azulPrincipal} />;
}
