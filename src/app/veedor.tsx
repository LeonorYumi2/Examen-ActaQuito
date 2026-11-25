import { AccesoRegistroActas } from '@/features/actas/presentation/RegistroActasScreen';
import { RoleHomeScreen } from '@/features/auth/presentation/screens/AuthScreens';

export default function VeedorRoute() {
  return <AccesoRegistroActas><RoleHomeScreen role="veedor" /></AccesoRegistroActas>;
}
