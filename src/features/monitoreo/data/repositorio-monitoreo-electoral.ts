import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { esquemaMonitoreoElectoral, type RepositorioMonitoreoElectoral } from '../domain/seguimiento-electoral';

export const repositorioMonitoreoElectoral: RepositorioMonitoreoElectoral = {
  async consultar(usuario, signal) {
    const db = mobileSupabase();
    const sesion = await db.auth.getSession();
    if (sesion.error || sesion.data.session?.user.id !== usuario) {
      throw new Error('Inicia sesión para consultar el seguimiento electoral.');
    }
    if (signal?.aborted) throw new Error('Consulta cancelada.');
    const peticion = db.rpc('leer_monitoreo_electoral').setHeader('Authorization', 'Bearer ' + sesion.data.session.access_token);
    if (signal) peticion.abortSignal(signal);
    const { data, error, status } = await peticion;
    if (error) {
      if (status === 0) throw new Error('No se pudo conectar. Reintenta cuando vuelva la red.');
      if (status === 401) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
      if (error.code === '42501') throw new Error('Tu cuenta no puede consultar este seguimiento.');
      if (error.code === 'PGRST202') throw new Error('El servicio de seguimiento todavía no está disponible.');
      throw new Error('No se pudo actualizar el seguimiento electoral.');
    }
    const resultado = esquemaMonitoreoElectoral.safeParse(data);
    if (!resultado.success) throw new Error('El servidor devolvió datos electorales incompletos.');
    return resultado.data;
  },
};
