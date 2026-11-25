import { iniciarSincronizacionActas } from './features/actas/data/enviar-borrador';
import { useAuth } from './features/auth/presentation/auth-state';

iniciarSincronizacionActas(useAuth);
