import { QueryClient, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { repositorioMonitoreoElectoral } from '../../data/repositorio-monitoreo-electoral';
import { crearSenalMonitoreo } from '../../data/senal-monitoreo';
import { consultarMonitoreoElectoral } from '../../domain/seguimiento-electoral';

const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 15_000 } } });
const clave = (usuario: string) => ['seguimiento-electoral', usuario] as const;
let secuenciaCanal = 0;

const senal = crearSenalMonitoreo((usuario, avisar) => {
  const db = mobileSupabase();
  const ciclo = AppState.addEventListener('change', (estado) => { if (estado === 'active') avisar(); });
  let canal: ReturnType<typeof db.channel> | undefined;
  let salir: ReturnType<typeof setTimeout> | undefined;
  const auth = db.auth.onAuthStateChange((evento, sesion) => {
    if (evento !== 'SIGNED_OUT' && (!sesion || sesion.user.id === usuario)) return;
    clearTimeout(salir);
    salir = setTimeout(() => {
      senal.cerrar(usuario);
      cache.removeQueries({ queryKey: clave(usuario), exact: true });
    }, 0);
  }).data.subscription;

  try {
    // El cierre de un canal es asíncrono y React puede remontar inmediatamente.
    canal = db.channel('monitoreo-electoral:' + ++secuenciaCanal)
      .on('postgres_changes', { schema: 'public', table: 'senal_monitoreo_electoral', event: 'INSERT' }, avisar)
      .on('postgres_changes', { schema: 'public', table: 'senal_monitoreo_electoral', event: 'UPDATE' }, avisar);
    // Cierra el hueco entre la primera lectura y la suscripción, y recupera cambios tras reconexión.
    canal.subscribe((estado) => { if (estado === 'SUBSCRIBED') avisar(); });
  } catch {
    if (canal) void db.removeChannel(canal).catch(() => {});
    canal = undefined;
  }
  return () => {
    clearTimeout(salir);
    auth.unsubscribe();
    ciclo.remove();
    if (canal) void db.removeChannel(canal).catch(() => {});
  };
}, (usuario) => {
  void cache.invalidateQueries({ queryKey: clave(usuario), exact: true }, { cancelRefetch: false });
}, (usuario) => cache.isFetching({ queryKey: clave(usuario), exact: true }) > 0);

export function useSeguimientoElectoral(habilitado = true) {
  const usuario = useAuth(({ access }) => access?.kind === 'operational' && !access.offline
    && (access.profile.role === 'provincial' || access.profile.role === 'recinto') ? access.profile.id : null);
  const activo = habilitado && usuario !== null;

  useEffect(() => {
    if (!activo || !usuario) return;
    try {
      return senal.suscribir(usuario);
    } catch {
      // Incluso sin una conexión Realtime, la consulta y el refresco manual funcionan.
    }
  }, [activo, usuario]);

  const consulta = useQuery({
    queryKey: clave(usuario ?? ''),
    enabled: activo,
    queryFn: ({ signal }) => consultarMonitoreoElectoral(repositorioMonitoreoElectoral, usuario ?? '', signal),
  }, cache);
  return {
    datos: activo ? consulta.data : undefined,
    error: activo ? consulta.error?.message : undefined,
    cargando: activo && consulta.isPending,
    actualizando: activo && consulta.isFetching,
    actualizar: () => activo ? consulta.refetch({ cancelRefetch: false }) : Promise.resolve(),
  };
}
