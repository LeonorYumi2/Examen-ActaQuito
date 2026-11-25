import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { z } from 'zod';
import type { RecintoCaptura } from '../domain/evidencia';
import { ErrorRegistro, type Mesa, type RepositorioActas } from '../domain/registro';

const errorDeLectura = () => new ErrorRegistro('No pudimos cargar los datos de la mesa. Revisa tu conexión y vuelve a intentar.');

export const repositorioActas: RepositorioActas = {
  async listarMesas() {
    const { data, error } = await mobileSupabase().from('mesas_jrv')
      .select('recinto_codigo,numero,recintos(nombre)').order('recinto_codigo').order('numero');
    if (error) throw errorDeLectura();
    return data.map((mesa) => ({
      recinto: mesa.recinto_codigo,
      nombre: (mesa.recintos as { nombre?: string } | null)?.nombre ?? mesa.recinto_codigo,
      numero: mesa.numero,
    }));
  },

  async cargar(mesa, dignidad) {
    const db = mobileSupabase();
    const [catalogo, acta] = await Promise.all([
      db.from('candidaturas').select('organizacion_sigla,nombre_candidato,organizaciones_politicas(nombre)')
        .eq('dignidad_codigo', dignidad).order('posicion'),
      db.from('actas').select('id').eq('recinto_codigo', mesa.recinto).eq('mesa_numero', mesa.numero)
        .eq('dignidad_codigo', dignidad).maybeSingle(),
    ]);
    if (catalogo.error || acta.error) throw errorDeLectura();
    if (catalogo.data.length !== 5) throw new ErrorRegistro('El catálogo de esta dignidad debe tener cinco candidaturas.');
    const candidaturas = catalogo.data.map((fila) => ({
      sigla: fila.organizacion_sigla,
      candidato: fila.nombre_candidato,
      organizacion: (fila.organizaciones_politicas as { nombre?: string } | null)?.nombre ?? fila.organizacion_sigla,
    }));
    if (!acta.data) return { candidaturas, borrador: null };

    const revision = await db.from('actas_revisiones').select('version,votos,blancos,nulos,sufragantes')
      .eq('acta_id', acta.data.id).order('version', { ascending: false }).limit(1).maybeSingle();
    if (revision.error || !revision.data) throw errorDeLectura();
    const { version, votos, blancos, nulos, sufragantes } = revision.data;
    return { candidaturas, borrador: { id: acta.data.id, version, cifras: { votos, blancos, nulos, sufragantes } } };
  },

  async guardar({ id, operacion, mesa, dignidad, cifras }) {
    const { data, error } = await mobileSupabase().rpc('guardar_borrador_acta', {
      acta: id, operacion, recinto: mesa.recinto, mesa: mesa.numero, dignidad,
      votos_por_sigla: cifras.votos, blancos: cifras.blancos, nulos: cifras.nulos, sufragantes: cifras.sufragantes,
    });
    if (error?.code === '42501') throw new ErrorRegistro(error.message);
    if (error?.code === '23505') throw new ErrorRegistro('Ya existe un borrador o se reutilizó una operación. Vuelve a abrir el acta.');
    if (error?.code === '22023') throw new ErrorRegistro(error.message);
    if (error || typeof data !== 'number') throw new ErrorRegistro('No se pudo confirmar el guardado. Reintenta con las mismas cifras.');
    return data;
  },
};

export async function cargarRecintoCaptura(mesa: Mesa): Promise<RecintoCaptura> {
  const db = mobileSupabase();
  const recinto = await db.from('recintos').select('latitud,longitud,parroquias(canton_codigo)')
    .eq('codigo', mesa.recinto).single();
  const datos = z.object({
    latitud: z.number().min(-90).max(90),
    longitud: z.number().min(-180).max(180),
    parroquias: z.object({ canton_codigo: z.string() }),
  }).safeParse(recinto.data);
  if (recinto.error || !datos.success) throw errorDeLectura();
  const configuracion = await db.from('configuracion_captura').select('margen_gps_metros')
    .eq('canton_codigo', datos.data.parroquias.canton_codigo).single();
  const margen = z.number().int().positive().safeParse(configuracion.data?.margen_gps_metros);
  if (configuracion.error || !margen.success) throw errorDeLectura();
  return { latitud: datos.data.latitud, longitud: datos.data.longitud, margenMetros: margen.data };
}
