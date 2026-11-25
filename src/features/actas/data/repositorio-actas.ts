import { mobileSupabase } from '@/features/auth/data/supabase-client';
import { z } from 'zod';
import type { RecintoCaptura } from '../domain/evidencia';
import { ErrorRegistro, type Dignidad, type Mesa, type RepositorioActas } from '../domain/registro';

const errorDeLectura = () => new ErrorRegistro('No pudimos cargar los datos de la mesa. Revisa tu conexión y vuelve a intentar.');

function conToken<T extends { setHeader(name: string, value: string): T }>(consulta: T, token?: string) {
  return token ? consulta.setHeader('Authorization', 'Bearer ' + token) : consulta;
}

export async function cargarCandidaturas(dignidad: Dignidad, token?: string) {
  const catalogo = await conToken(mobileSupabase().from('candidaturas')
    .select('organizacion_sigla,nombre_candidato,organizaciones_politicas(nombre,color)')
    .eq('dignidad_codigo', dignidad).order('posicion'), token);
  if (catalogo.error) throw errorDeLectura();
  if (catalogo.data.length !== 5) throw new ErrorRegistro('El catálogo de esta dignidad debe tener cinco candidaturas.');
  return catalogo.data.map((fila) => {
    const organizacion = fila.organizaciones_politicas as { nombre?: string; color?: string } | null;
    return {
      sigla: fila.organizacion_sigla, candidato: fila.nombre_candidato,
      organizacion: organizacion?.nombre ?? fila.organizacion_sigla, color: organizacion?.color,
    };
  });
}

export const repositorioActas = {
  async listarMesas(token?: string) {
    const { data, error } = await conToken(mobileSupabase().from('mesas_jrv')
      .select('recinto_codigo,numero,recintos(nombre)').order('recinto_codigo').order('numero'), token);
    if (error) throw errorDeLectura();
    return data.map((mesa) => ({
      recinto: mesa.recinto_codigo,
      nombre: (mesa.recintos as { nombre?: string } | null)?.nombre ?? mesa.recinto_codigo,
      numero: mesa.numero,
    }));
  },

  async cargar(mesa: Mesa, dignidad: Dignidad, token?: string) {
    const db = mobileSupabase();
    const [candidaturas, acta] = await Promise.all([
      cargarCandidaturas(dignidad, token),
      conToken(db.from('actas').select('id').eq('recinto_codigo', mesa.recinto).eq('mesa_numero', mesa.numero)
        .eq('dignidad_codigo', dignidad).maybeSingle(), token),
    ]);
    if (acta.error) throw errorDeLectura();

    if (!acta.data) return { candidaturas, borrador: null };

    return { candidaturas, borrador: await cargarRevisionActa(acta.data.id, token) };
  },

  async guardar({ id, operacion, mesa, dignidad, cifras }: Parameters<RepositorioActas['guardar']>[0], token?: string) {
    const peticion = mobileSupabase().rpc('guardar_borrador_acta', {
      acta: id, operacion, recinto: mesa.recinto, mesa: mesa.numero, dignidad,
      votos_por_sigla: cifras.votos, blancos: cifras.blancos, nulos: cifras.nulos, sufragantes: cifras.sufragantes,
    });
    if (token) peticion.setHeader('Authorization', 'Bearer ' + token);
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), 45_000);
    try {
      const { data, error, status } = await peticion.abortSignal(controlador.signal);
      if (error?.code === '42501') throw new ErrorRegistro(error.message, error.code, status);
      if (error?.code === '23505') throw new ErrorRegistro('Ya existe un borrador o se reutilizó una operación. Vuelve a abrir el acta.', error.code, status);
      if (error?.code === '22023') throw new ErrorRegistro(error.message, error.code, status);
      if (error || typeof data !== 'number') throw new ErrorRegistro('No se pudo confirmar el guardado. Reintenta con las mismas cifras.', error?.code, status);
      return data;
    } finally {
      clearTimeout(reloj);
    }
  },
};

export async function cargarRecintoCaptura(mesa: Mesa, token?: string): Promise<RecintoCaptura> {
  const db = mobileSupabase();
  const recinto = await conToken(db.from('recintos').select('latitud,longitud,parroquias(canton_codigo)')
    .eq('codigo', mesa.recinto).single(), token);
  const datos = z.object({
    latitud: z.number().min(-90).max(90),
    longitud: z.number().min(-180).max(180),
    parroquias: z.object({ canton_codigo: z.string() }),
  }).safeParse(recinto.data);
  if (recinto.error || !datos.success) throw errorDeLectura();
  const configuracion = await conToken(db.from('configuracion_captura').select('margen_gps_metros')
    .eq('canton_codigo', datos.data.parroquias.canton_codigo).single(), token);
  const margen = z.number().int().positive().safeParse(configuracion.data?.margen_gps_metros);
  if (configuracion.error || !margen.success) throw errorDeLectura();
  return { latitud: datos.data.latitud, longitud: datos.data.longitud, margenMetros: margen.data };
}

export const claveActaTerritorial = (recinto: string, numero: number, dignidad: Dignidad) =>
  JSON.stringify([recinto, numero, dignidad]);

async function cargarRevisionActa(acta: string, token?: string) {
  const revision = await conToken(mobileSupabase().from('actas_revisiones').select('version,votos,blancos,nulos,sufragantes')
    .eq('acta_id', acta).order('version', { ascending: false }).limit(1).maybeSingle(), token);
  if (revision.error || !revision.data) throw errorDeLectura();
  const { version, votos, blancos, nulos, sufragantes } = revision.data;
  return { id: acta, version, cifras: { votos, blancos, nulos, sufragantes } };
}

export async function descargarActasVisibles(token: string, vigente: () => boolean) {
  const resultado = await conToken(mobileSupabase().from('actas')
    .select('id,recinto_codigo,mesa_numero,dignidad_codigo'), token);
  if (resultado.error) throw errorDeLectura();
  const actas: Record<string, import('../domain/registro').Borrador> = {};
  for (let i = 0; i < resultado.data.length; i += 6) {
    if (!vigente()) return actas;
    const lote = resultado.data.slice(i, i + 6);
    await Promise.all(lote.map(async (acta) => {
      const dignidad = acta.dignidad_codigo;
      if (dignidad !== 'ALCALDIA' && dignidad !== 'PREFECTURA') return;
      actas[claveActaTerritorial(acta.recinto_codigo, acta.mesa_numero, dignidad)] = await cargarRevisionActa(acta.id, token);
    }));
  }
  return actas;
}
