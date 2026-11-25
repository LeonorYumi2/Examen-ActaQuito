import { mobileSupabase } from '@/features/auth/data/supabase-client';

export interface RecintoInfo {
  codigo: string;
  nombre: string;
  parroquiaCodigo: string;
  parroquiaNombre?: string;
  parroquiaTipo?: 'urbana' | 'rural';
  latitud: number;
  longitud: number;
  totalMesas: number;
}

export interface MesaJrvInfo {
  recintoCodigo: string;
  recintoNombre: string;
  numero: number;
  actasCount?: number;
}

export interface CoordinadorRecintoInfo {
  id: string;
  nombres: string;
  apellidos: string;
  recintoCodigo: string;
  recintoNombre?: string;
  parroquiaNombre?: string;
  habilitado: boolean;
  correo?: string;
  telefono?: string;
  cedula?: string;
  creadoEn?: string;
}

export interface DetalleRecintoInfo {
  recinto: RecintoInfo;
  mesas: MesaJrvInfo[];
  coordinador: CoordinadorRecintoInfo | null;
  totalVeedoresAsignados: number;
  totalActas: number;
  actasEvidenciadas: number;
  actasPorDignidad: { alcaldia: number; prefectura: number };
}

export interface VeedorInfo {
  id: string;
  nombres: string;
  apellidos: string;
  recintoBase: string;
  habilitado: boolean;
  mesaAsignada?: number;
}

export interface VeedorMesaInfo {
  recintoCodigo: string;
  recintoNombre: string;
  mesaNumero: number;
  alcaldiaActaId?: string;
  alcaldiaEstado?: string;
  prefecturaActaId?: string;
  prefecturaEstado?: string;
}

export interface VeedorDashboardData {
  recintoNombre?: string;
  recintoCodigo?: string;
  mesas: VeedorMesaInfo[];
}

export interface ActaProvincialInfo {
  id: string;
  recintoCodigo: string;
  recintoNombre: string;
  mesaNumero: number;
  dignidadCodigo: string;
  autorId: string;
  autorNombre?: string;
  estado: string;
  creadaEn: string;
  tieneEvidencia: boolean;
}

export interface ResumenProvincial {
  totalRecintos: number;
  totalMesas: number;
  totalCoordinadores: number;
  totalVeedores: number;
  borradoresRegistrados: number;
  evidenciasConfirmadas: number;
  actasRegistradas: number;
}

/**
 * Traduce mensajes técnicos de PostgREST / Supabase a mensajes claros en español
 */
export function traducirErrorSupabase(mensaje: string | undefined, codigo?: string, status?: number): string {
  if (codigo === '42501') return 'Permisos insuficientes para consultar esta sección con tu rol actual.';
  if (status === 0) return 'No fue posible conectar con el servidor. Verifica tu conexión de red.';
  if (status === 401) return 'La sesión de usuario ha expirado. Por favor inicia sesión nuevamente.';
  if (!mensaje) return 'Error inesperado al consultar los datos del servidor.';
  if (mensaje.includes('schema cache') || mensaje.includes('relationship')) {
    return 'Inconsistencia en la relación de datos del catálogo electoral.';
  }
  if (mensaje.includes('permission denied') || mensaje.includes('42501')) {
    return 'Permisos insuficientes para consultar esta sección con tu rol actual.';
  }
  if (mensaje.includes('Network request failed') || mensaje.includes('Failed to fetch')) {
    return 'No fue posible conectar con el servidor. Verifica tu conexión de red.';
  }
  if (mensaje.includes('JWT') || mensaje.includes('token') || mensaje.includes('expired')) {
    return 'La sesión de usuario ha expirado. Por favor inicia sesión nuevamente.';
  }
  return mensaje;
}

/**
 * Repositorio de consultas operacionales por Rol
 * Respeta 100% las políticas RLS y los permisos GRANT del esquema de base de datos.
 * Utiliza consultas independientes y combinación en capa de datos para garantizar
 * resiliencia ante límites del schema cache de PostgREST.
 */
type RespuestaConsulta = { error: { code: string; message: string } | null; status: number };

export class ErrorConsultaRol extends Error {
  constructor(readonly tabla: string, readonly codigo: string, readonly status: number, mensaje: string) {
    super(traducirErrorSupabase(mensaje, codigo, status));
  }
}

function verificarConsulta(tabla: string, { error, status }: RespuestaConsulta) {
  if (error) throw new ErrorConsultaRol(tabla, error.code, status, error.message);
}

const columnasCoordinador = 'id,nombres,apellidos,habilitado';

export const operacionesPorRolRepositorio = {
  /**
   * Obtiene el resumen consolidado real para Coordinador Provincial
   * Distingue borradores de actas de evidencias confirmadas
   */
  async obtenerResumenProvincial(): Promise<ResumenProvincial> {
    const db = mobileSupabase();

    const [recintosRes, mesasRes, coordinadoresRes, actasRes, evidenciasRes] = await Promise.all([
      db.from('recintos').select('codigo', { count: 'exact', head: true }),
      db.from('mesas_jrv').select('recinto_codigo,numero', { count: 'exact', head: true }),
      db.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'recinto'),
      db.from('actas').select('id', { count: 'exact', head: true }),
      db.from('actas_evidencias').select('acta_id', { count: 'exact', head: true }),
    ]);

    verificarConsulta('recintos', recintosRes);
    verificarConsulta('mesas_jrv', mesasRes);
    verificarConsulta('usuarios', coordinadoresRes);
    verificarConsulta('actas', actasRes);
    verificarConsulta('actas_evidencias', evidenciasRes);

    const totalRecintos = recintosRes.count ?? 0;
    const totalMesas = mesasRes.count ?? 0;
    const totalCoordinadores = coordinadoresRes.count ?? 0;
    const borradoresRegistrados = actasRes.count ?? 0;
    const evidenciasConfirmadas = evidenciasRes.count ?? 0;

    return {
      totalRecintos,
      totalMesas,
      totalCoordinadores,
      totalVeedores: 0,
      borradoresRegistrados,
      evidenciasConfirmadas,
      actasRegistradas: borradoresRegistrados,
    };
  },

  /**
   * Lista recintos con conteo de mesas asignadas (Ámbito Provincial)
   * Resuelve parroquias y mesas en consultas independientes y combina en memoria
   */
  async listarRecintosProvincial(): Promise<RecintoInfo[]> {
    const db = mobileSupabase();

    const [recintosRes, parroquiasRes, mesasRes] = await Promise.all([
      db.from('recintos').select('codigo,nombre,parroquia_codigo,latitud,longitud').order('nombre'),
      db.from('parroquias').select('codigo,nombre,tipo'),
      db.from('mesas_jrv').select('recinto_codigo,numero'),
    ]);

    verificarConsulta('recintos', recintosRes);
    verificarConsulta('parroquias', parroquiasRes);
    verificarConsulta('mesas_jrv', mesasRes);

    const recintos = recintosRes.data ?? [];
    if (recintos.length === 0) return [];

    const parroquiasMap = new Map<string, { nombre: string; tipo?: 'urbana' | 'rural' }>();
    (parroquiasRes.data ?? []).forEach((p) => {
      parroquiasMap.set(p.codigo, { nombre: p.nombre, tipo: p.tipo as 'urbana' | 'rural' });
    });

    const conteoMesasPorRecinto: Record<string, number> = {};
    (mesasRes.data ?? []).forEach((m) => {
      conteoMesasPorRecinto[m.recinto_codigo] = (conteoMesasPorRecinto[m.recinto_codigo] ?? 0) + 1;
    });

    return recintos.map((r) => {
      const pInfo = parroquiasMap.get(r.parroquia_codigo);
      return {
        codigo: r.codigo,
        nombre: r.nombre,
        parroquiaCodigo: r.parroquia_codigo,
        parroquiaNombre: pInfo?.nombre,
        parroquiaTipo: pInfo?.tipo,
        latitud: Number(r.latitud),
        longitud: Number(r.longitud),
        totalMesas: conteoMesasPorRecinto[r.codigo] ?? 0,
      };
    });
  },

  /**
   * Lista coordinadores de recinto asignados (Ámbito Provincial)
   * Resuelve usuarios, asignaciones y nombres de recinto sin joins frágiles
   */
  async listarCoordinadoresProvincial(): Promise<CoordinadorRecintoInfo[]> {
    const db = mobileSupabase();

    const [usuariosRes, asignacionesRes, recintosRes, parroquiasRes] = await Promise.all([
      db.from('usuarios').select(columnasCoordinador).eq('rol', 'recinto'),
      db.from('asignaciones_coordinador').select('coordinador_id,recinto_codigo').is('fin', null),
      db.from('recintos').select('codigo,nombre,parroquia_codigo'),
      db.from('parroquias').select('codigo,nombre'),
    ]);

    verificarConsulta('usuarios', usuariosRes);
    verificarConsulta('asignaciones_coordinador', asignacionesRes);
    verificarConsulta('recintos', recintosRes);
    verificarConsulta('parroquias', parroquiasRes);

    const parroquiasMap = new Map<string, string>();
    (parroquiasRes.data ?? []).forEach((p) => {
      parroquiasMap.set(p.codigo, p.nombre);
    });

    const recintosMap = new Map<string, { nombre: string; parroquiaNombre?: string }>();
    (recintosRes.data ?? []).forEach((r) => {
      recintosMap.set(r.codigo, {
        nombre: r.nombre,
        parroquiaNombre: parroquiasMap.get(r.parroquia_codigo),
      });
    });

    const asignacionesMap = new Map<string, string>();
    (asignacionesRes.data ?? []).forEach((asig) => {
      asignacionesMap.set(asig.coordinador_id, asig.recinto_codigo);
    });

    return (usuariosRes.data ?? []).map((u) => {
      const recintoCod = asignacionesMap.get(u.id);
      const recintoObj = recintoCod ? recintosMap.get(recintoCod) : undefined;
      return {
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        recintoCodigo: recintoCod ?? 'Sin asignar',
        recintoNombre: recintoObj ? recintoObj.nombre : (recintoCod ?? 'Sin recinto asignado'),
        parroquiaNombre: recintoObj?.parroquiaNombre,
        habilitado: u.habilitado,
      };
    });
  },

  /**
   * Obtiene el detalle completo de un recinto para el panel de detalle
   */
  async obtenerDetalleRecinto(recintoCodigo: string): Promise<DetalleRecintoInfo> {
    const db = mobileSupabase();

    const [recintoRes, mesasRes, asigCoordRes, asigVeedoresRes, actasRes] = await Promise.all([
      db.from('recintos').select('codigo,nombre,parroquia_codigo,latitud,longitud').eq('codigo', recintoCodigo).single(),
      db.from('mesas_jrv').select('recinto_codigo,numero').eq('recinto_codigo', recintoCodigo).order('numero'),
      db.from('asignaciones_coordinador').select('coordinador_id').eq('recinto_codigo', recintoCodigo).is('fin', null).maybeSingle(),
      db.from('asignaciones_veedor').select('veedor_id,mesa_numero').eq('recinto_codigo', recintoCodigo).is('fin', null),
      db.from('actas').select('id,dignidad_codigo,mesa_numero,estado').eq('recinto_codigo', recintoCodigo),
    ]);

    if (recintoRes.error) throw new ErrorConsultaRol('recintos', recintoRes.error.code, recintoRes.status, recintoRes.error.message);
    verificarConsulta('mesas_jrv', mesasRes);
    verificarConsulta('asignaciones_coordinador', asigCoordRes);
    verificarConsulta('asignaciones_veedor', asigVeedoresRes);
    verificarConsulta('actas', actasRes);
    const rData = recintoRes.data;

    let parroquiaNombre: string | undefined;
    let parroquiaTipo: 'urbana' | 'rural' | undefined;
    const parroquiaRes = await db.from('parroquias').select('nombre,tipo').eq('codigo', rData.parroquia_codigo).maybeSingle();
    verificarConsulta('parroquias', parroquiaRes);
    const pData = parroquiaRes.data;
    if (pData) {
      parroquiaNombre = pData.nombre;
      parroquiaTipo = pData.tipo as 'urbana' | 'rural';
    }

    let coordinador: CoordinadorRecintoInfo | null = null;
    if (asigCoordRes.data?.coordinador_id) {
      const usuarioRes = await db
        .from('usuarios')
        .select(columnasCoordinador)
        .eq('id', asigCoordRes.data.coordinador_id)
        .maybeSingle();

      verificarConsulta('usuarios', usuarioRes);
      const uData = usuarioRes.data;
      if (uData) {
        coordinador = {
          id: uData.id,
          nombres: uData.nombres,
          apellidos: uData.apellidos,
          recintoCodigo,
          recintoNombre: rData.nombre,
          parroquiaNombre,
          habilitado: uData.habilitado,
        };
      }
    }

    const mesas: MesaJrvInfo[] = (mesasRes.data ?? []).map((m) => ({
      recintoCodigo: m.recinto_codigo,
      recintoNombre: rData.nombre,
      numero: m.numero,
    }));

    const recinto: RecintoInfo = {
      codigo: rData.codigo,
      nombre: rData.nombre,
      parroquiaCodigo: rData.parroquia_codigo,
      parroquiaNombre,
      parroquiaTipo,
      latitud: Number(rData.latitud),
      longitud: Number(rData.longitud),
      totalMesas: mesas.length,
    };

    const totalVeedoresAsignados = (asigVeedoresRes.data ?? []).length;
    const actas = actasRes.data ?? [];
    let actasEvidenciadas = 0;
    if (actas.length > 0) {
      const actasIds = actas.map((a) => a.id);
      const evidenciasRes = await db.from('actas_evidencias')
        .select('acta_id', { count: 'exact', head: true }).in('acta_id', actasIds);
      verificarConsulta('actas_evidencias', evidenciasRes);
      actasEvidenciadas = evidenciasRes.count ?? 0;
    }

    const actasPorDignidad = {
      alcaldia: actas.filter((a) => a.dignidad_codigo === 'ALCALDIA').length,
      prefectura: actas.filter((a) => a.dignidad_codigo === 'PREFECTURA').length,
    };

    return {
      recinto,
      mesas,
      coordinador,
      totalVeedoresAsignados,
      totalActas: actas.length,
      actasEvidenciadas,
      actasPorDignidad,
    };
  },

  /**
   * Obtiene la información del recinto coordinado y sus mesas para Coordinador de Recinto
   */
  async obtenerRecintoCoordinado(usuarioId: string): Promise<{
    recinto: RecintoInfo | null;
    mesas: MesaJrvInfo[];
    veedores: VeedorInfo[];
  }> {
    const db = mobileSupabase();

    // 1. Asignación vigente de coordinador
    const { data: asig, error: asigErr } = await db
      .from('asignaciones_coordinador')
      .select('recinto_codigo')
      .eq('coordinador_id', usuarioId)
      .is('fin', null)
      .maybeSingle();

    if (asigErr) throw new Error(traducirErrorSupabase(asigErr.message));
    if (!asig) {
      return { recinto: null, mesas: [], veedores: [] };
    }

    const recintoCodigo = asig.recinto_codigo;

    // 2. Consulta de recinto, parroquia, mesas y veedores
    const [recintoRes, mesasRes, veedoresRes, asigVeedoresRes] = await Promise.all([
      db.from('recintos').select('codigo,nombre,parroquia_codigo,latitud,longitud').eq('codigo', recintoCodigo).maybeSingle(),
      db.from('mesas_jrv').select('recinto_codigo,numero').eq('recinto_codigo', recintoCodigo).order('numero'),
      db.from('usuarios').select('id,nombres,apellidos,recinto_base,habilitado').eq('rol', 'veedor').eq('recinto_base', recintoCodigo),
      db.from('asignaciones_veedor').select('veedor_id,mesa_numero').eq('recinto_codigo', recintoCodigo).is('fin', null),
    ]);

    if (recintoRes.error) throw new Error(traducirErrorSupabase(recintoRes.error.message));
    if (mesasRes.error) throw new Error(traducirErrorSupabase(mesasRes.error.message));
    if (!recintoRes.data) return { recinto: null, mesas: [], veedores: [] };

    const datosRecinto = recintoRes.data;

    let parroquiaNombre: string | undefined;
    const { data: parroquiaData } = await db
      .from('parroquias')
      .select('nombre')
      .eq('codigo', datosRecinto.parroquia_codigo)
      .maybeSingle();
    if (parroquiaData?.nombre) {
      parroquiaNombre = parroquiaData.nombre;
    }

    const mesaMap = new Map<string, number>();
    (asigVeedoresRes.data ?? []).forEach((av) => {
      mesaMap.set(av.veedor_id, av.mesa_numero);
    });

    const veedores: VeedorInfo[] = (veedoresRes.data ?? []).map((v) => ({
      id: v.id,
      nombres: v.nombres,
      apellidos: v.apellidos,
      recintoBase: v.recinto_base ?? recintoCodigo,
      habilitado: v.habilitado,
      mesaAsignada: mesaMap.get(v.id),
    }));

    const mesas: MesaJrvInfo[] = (mesasRes.data ?? []).map((m) => ({
      recintoCodigo: m.recinto_codigo,
      recintoNombre: datosRecinto.nombre,
      numero: m.numero,
    }));

    const recinto: RecintoInfo = {
      codigo: datosRecinto.codigo,
      nombre: datosRecinto.nombre,
      parroquiaCodigo: datosRecinto.parroquia_codigo,
      parroquiaNombre,
      latitud: Number(datosRecinto.latitud),
      longitud: Number(datosRecinto.longitud),
      totalMesas: mesas.length,
    };

    return { recinto, mesas, veedores };
  },

  /**
   * Obtiene actas registradas en el recinto para revisión y corrección
   * Respeta las columnas autorizadas en RLS (sin 'version' sobre tabla actas)
   */
  async listarActasRecinto(recintoCodigo: string): Promise<ActaProvincialInfo[]> {
    const db = mobileSupabase();
    const { data, error } = await db
      .from('actas')
      .select('id,recinto_codigo,mesa_numero,dignidad_codigo,autor_id,estado,creada_en,usuarios(nombres,apellidos)')
      .eq('recinto_codigo', recintoCodigo)
      .order('mesa_numero')
      .order('dignidad_codigo');

    if (error) throw new Error(traducirErrorSupabase(error.message));
    if (!data || data.length === 0) return [];

    const actasIds = data.map((a) => a.id);
    let evidenciasSet = new Set<string>();
    try {
      const { data: evData } = await db
        .from('actas_evidencias')
        .select('acta_id')
        .in('acta_id', actasIds);
      (evData ?? []).forEach((e) => evidenciasSet.add(e.acta_id));
    } catch {
      // Si la tabla no está disponible, se asume sin evidencia
    }

    return data.map((a) => {
      const autor = a.usuarios as { nombres?: string; apellidos?: string } | null;
      return {
        id: a.id,
        recintoCodigo: a.recinto_codigo,
        recintoNombre: recintoCodigo,
        mesaNumero: a.mesa_numero,
        dignidadCodigo: a.dignidad_codigo,
        autorId: a.autor_id,
        autorNombre: autor ? `${autor.nombres ?? ''} ${autor.apellidos ?? ''}`.trim() : undefined,
        estado: a.estado,
        creadaEn: a.creada_en,
        tieneEvidencia: evidenciasSet.has(a.id),
      };
    });
  },

  /**
   * Obtiene todas las actas de la provincia para monitoreo provincial
   * Soluciona el error de PostgREST al no forzar 'recintos(nombre)' ni 'version' en 'actas'
   */
  async listarActasProvincial(): Promise<ActaProvincialInfo[]> {
    const db = mobileSupabase();

    // Consulta actas con las columnas otorgadas a authenticated
    const actasRes = await db
      .from('actas')
      .select('id,recinto_codigo,mesa_numero,dignidad_codigo,autor_id,estado,creada_en,usuarios(nombres,apellidos)')
      .order('creada_en', { ascending: false })
      .limit(50);

    verificarConsulta('actas', actasRes);
    const actasData = actasRes.data;
    if (!actasData || actasData.length === 0) return [];

    // Consulta de recintos para resolver nombres de forma desacoplada
    const codigosRecintos = Array.from(new Set(actasData.map((a) => a.recinto_codigo)));
    const recintosRes = await db
      .from('recintos')
      .select('codigo,nombre')
      .in('codigo', codigosRecintos);

    verificarConsulta('recintos', recintosRes);
    const recintosData = recintosRes.data;
    const nombresRecinto = new Map<string, string>();
    (recintosData ?? []).forEach((r) => nombresRecinto.set(r.codigo, r.nombre));

    // Verificación de evidencias confirmadas
    const actasIds = actasData.map((a) => a.id);
    const evidenciasRes = await db.from('actas_evidencias').select('acta_id').in('acta_id', actasIds);
    verificarConsulta('actas_evidencias', evidenciasRes);
    const evidenciasSet = new Set((evidenciasRes.data ?? []).map((e) => e.acta_id));

    return actasData.map((a) => {
      const autor = a.usuarios as { nombres?: string; apellidos?: string } | null;
      return {
        id: a.id,
        recintoCodigo: a.recinto_codigo,
        recintoNombre: nombresRecinto.get(a.recinto_codigo) ?? a.recinto_codigo,
        mesaNumero: a.mesa_numero,
        dignidadCodigo: a.dignidad_codigo,
        autorId: a.autor_id,
        autorNombre: autor ? `${autor.nombres ?? ''} ${autor.apellidos ?? ''}`.trim() : undefined,
        estado: a.estado,
        creadaEn: a.creada_en,
        tieneEvidencia: evidenciasSet.has(a.id),
      };
    });
  },

  /**
   * Obtiene la información del recinto y mesas asignadas para el Veedor
   */
  async obtenerDatosVeedor(): Promise<VeedorDashboardData> {
    const db = mobileSupabase();
    const { data: mesasData, error: errMesas } = await db
      .from('mesas_jrv')
      .select('recinto_codigo,numero')
      .order('recinto_codigo')
      .order('numero');

    if (errMesas) throw new Error(traducirErrorSupabase(errMesas.message));
    if (!mesasData || mesasData.length === 0) {
      return { mesas: [] };
    }

    const recintoCodigo = mesasData[0].recinto_codigo;
    let recintoNombre = recintoCodigo;

    const { data: recintoData } = await db
      .from('recintos')
      .select('nombre')
      .eq('codigo', recintoCodigo)
      .maybeSingle();
    if (recintoData?.nombre) {
      recintoNombre = recintoData.nombre;
    }

    const numeros = mesasData.map((m) => m.numero);

    const { data: actas } = await db
      .from('actas')
      .select('id,mesa_numero,dignidad_codigo,estado')
      .eq('recinto_codigo', recintoCodigo)
      .in('mesa_numero', numeros);

    const actasMap = new Map<string, { id: string; estado: string }>();
    (actas ?? []).forEach((a) => {
      actasMap.set(`${a.mesa_numero}-${a.dignidad_codigo}`, { id: a.id, estado: a.estado });
    });

    const mesas: VeedorMesaInfo[] = mesasData.map((m) => {
      const alc = actasMap.get(`${m.numero}-ALCALDIA`);
      const pref = actasMap.get(`${m.numero}-PREFECTURA`);
      return {
        recintoCodigo: m.recinto_codigo,
        recintoNombre,
        mesaNumero: m.numero,
        alcaldiaActaId: alc?.id,
        alcaldiaEstado: alc?.estado,
        prefecturaActaId: pref?.id,
        prefecturaEstado: pref?.estado,
      };
    });

    return {
      recintoCodigo,
      recintoNombre,
      mesas,
    };
  },
};
