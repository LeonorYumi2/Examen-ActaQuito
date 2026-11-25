import { createClient } from "@supabase/supabase-js";

export class ErrorInvitacion extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function clienteAdministrativo() {
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !clave) throw new Error("Falta la configuración administrativa de Supabase");
  return createClient(url, clave, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function leerDatos(valor: unknown) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new ErrorInvitacion(400, "Se requiere un objeto JSON");
  }
  const datos = valor as Record<string, unknown>;
  const permitidos = ["correo", "cedula", "nombres", "apellidos", "telefono", "recinto"];
  if (Object.keys(datos).some((campo) => !permitidos.includes(campo))) {
    throw new ErrorInvitacion(400, "La solicitud contiene campos no permitidos");
  }
  function requerido(campo: string, maximo: number) {
    const valor = datos[campo];
    if (typeof valor !== "string" || !valor.trim() || valor.trim().length > maximo) {
      throw new ErrorInvitacion(400, `Campo inválido: ${campo}`);
    }
    return valor.trim();
  }
  return {
    correo: requerido("correo", 254).toLowerCase(),
    cedula: requerido("cedula", 10),
    nombres: requerido("nombres", 120),
    apellidos: requerido("apellidos", 120),
    telefono: requerido("telefono", 30),
    recinto: datos.recinto === undefined ? null : requerido("recinto", 120),
  };
}

function errorDeBase(codigo: string) {
  if (codigo === "42501") return new ErrorInvitacion(403, "Invitación fuera del ámbito autorizado");
  if (codigo === "23505") return new ErrorInvitacion(409, "Esos datos ya están reservados o vinculados a una identidad de Auth");
  if (codigo === "P0002") return new ErrorInvitacion(404, "La reserva de invitación no existe");
  if (codigo === "23514" || codigo === "23502" || codigo === "22023") {
    return new ErrorInvitacion(400, "Revise los datos de la cuenta, incluida la cédula y el correo");
  }
  return new ErrorInvitacion(500, "No se pudo completar la invitación");
}

type ClienteAdministrativo = ReturnType<typeof clienteAdministrativo>;
type Reserva = { id: string; correo: string; usuarioId: string | null };

function redireccionDeInvitacion() {
  const url = Deno.env.get("ACTAQUITO_AUTH_REDIRECT_URL");
  if (!url) throw new Error("Falta ACTAQUITO_AUTH_REDIRECT_URL");
  return url;
}

async function confirmar(cliente: ClienteAdministrativo, reserva: Reserva, recuperacionAdministrativa = false) {
  const { data, error } = await cliente.rpc("confirmar_invitacion", {
    reserva_id: reserva.id,
    recuperacion_administrativa: recuperacionAdministrativa,
  });
  if (error) throw errorDeBase(error.code);
  return data as string | null;
}

function enviar(cliente: ClienteAdministrativo, reserva: Reserva, redirectTo: string) {
  return cliente.auth.admin.inviteUserByEmail(reserva.correo, {
    redirectTo,
    data: { actaquito_invitacion: reserva.id },
  });
}

function errorDeEnvio(status?: number) {
  if (status === 429) return new ErrorInvitacion(429, "Límite de invitaciones. Vuelva a intentar más tarde");
  return new ErrorInvitacion(502, "Auth no completó la invitación. Revise el estado y vuelva a intentar");
}

export async function invitar(
  cliente: ClienteAdministrativo,
  actor: string | null,
  datos: ReturnType<typeof leerDatos>,
) {
  const redireccion = redireccionDeInvitacion();

  const { data, error } = await cliente.rpc("reservar_invitacion", {
    actor,
    recinto: datos.recinto,
    correo_nuevo: datos.correo,
    cedula_nueva: datos.cedula,
    nombres_nuevos: datos.nombres,
    apellidos_nuevos: datos.apellidos,
    telefono_nuevo: datos.telefono,
  });
  if (error) throw errorDeBase(error.code);
  const reserva = data as Reserva;
  if (reserva.usuarioId) return { usuarioId: reserva.usuarioId };

  const usuarioPrevio = await confirmar(cliente, reserva);
  if (usuarioPrevio) return { usuarioId: usuarioPrevio };

  const resultado = await enviar(cliente, reserva, redireccion);
  // Si una solicitud concurrente ya creó la identidad, recuperarla por reserva.
  const usuarioId = await confirmar(cliente, reserva);
  if (usuarioId) return { usuarioId };
  throw errorDeEnvio(resultado.error?.status);
}

// Solo se usa desde el script administrativo. El endpoint de coordinadores
// mantiene su contrato de alta y no acepta órdenes de gestión ni del operador.
export async function gestionarInvitacion(
  cliente: ClienteAdministrativo,
  correo: string,
  operacion: "cancelar" | "reenviar",
) {
  const { data, error } = await cliente.rpc("gestionar_invitacion", {
    correo_objetivo: correo,
    operacion,
  });
  if (error) throw errorDeBase(error.code);
  if (operacion === "cancelar") return { estado: "cancelada" };

  const reserva = data as Reserva & { correoConfirmado: boolean };
  if (reserva.correoConfirmado) {
    const usuarioId = await confirmar(cliente, reserva, true);
    if (!usuarioId) throw new ErrorInvitacion(409, "La identidad confirmada requiere conciliación administrativa");
    return { estado: "correo_confirmado", usuarioId };
  }

  const resultado = await enviar(cliente, reserva, redireccionDeInvitacion());
  if (resultado.error) throw errorDeEnvio(resultado.error.status);
  const usuarioId = await confirmar(cliente, reserva, true);
  if (!usuarioId) throw new ErrorInvitacion(409, "Auth envió la invitación, pero el perfil requiere conciliación");
  return { estado: "invitacion_reenviada", usuarioId };
}
