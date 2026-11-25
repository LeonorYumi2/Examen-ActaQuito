import { AccesoRegistroActas } from '@/features/actas/presentation/RegistroActasScreen';
import { RoleHomeScreen } from '@/features/auth/presentation/screens/AuthScreens';

export default function RecintoRoute() {
  return <AccesoRegistroActas><RoleHomeScreen role="recinto" /></AccesoRegistroActas>;
}
