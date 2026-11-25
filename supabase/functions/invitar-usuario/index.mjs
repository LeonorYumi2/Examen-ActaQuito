// @ts-check
import { clienteAdministrativo, ErrorInvitacion, invitar, leerDatos } from "../_shared/invitaciones.mts";

/** @param {number} status @param {object} datos */
function responder(status, datos) {
  return Response.json(datos, { status, headers: { "Cache-Control": "no-store" } });
}

/** @param {Request} request */
async function leerCuerpo(request) {
  const limite = 4096;
  const reader = request.body?.getReader();
  if (!reader) throw new ErrorInvitacion(400, "JSON inválido");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let json = "";
  try {
    while (true) {
      const parte = await reader.read();
      if (parte.done) break;
      total += parte.value.byteLength;
      if (total > limite) {
        void reader.cancel().catch(() => {});
        throw new ErrorInvitacion(413, "La solicitud de invitación es demasiado grande");
      }
      json += decoder.decode(parte.value, { stream: true });
    }
    return JSON.parse(json + decoder.decode());
  } catch (error) {
    if (error instanceof ErrorInvitacion) throw error;
    throw new ErrorInvitacion(400, "JSON inválido");
  } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return responder(405, { error: "Use POST" });
  const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return responder(401, { error: "Se requiere una sesión válida" });

  try {
    const cliente = clienteAdministrativo();
    const { data, error } = await cliente.auth.getUser(token);
    if (error || !data.user) return responder(401, { error: "Sesión inválida" });

    const credencial = await cliente.auth.getClaims(token).catch(() => null);
    const claims = credencial?.data?.claims;
    if (!credencial || credencial.error || claims?.sub !== data.user.id || claims.role !== "authenticated") {
      return responder(401, { error: "Sesión inválida" });
    }
    if (!Array.isArray(claims.amr) || !claims.amr.some((entrada) => typeof entrada === "object" && entrada?.method === "password")) {
      return responder(403, { error: "Inicie sesión con correo y contraseña para invitar" });
    }

    if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
      return responder(415, { error: "Se requiere application/json" });
    }
    const cuerpo = await leerCuerpo(request);
    if (Deno.env.get("ACTAQUITO_AUTH_REDIRECT_URL") !== "actaquito://auth/confirm") {
      return responder(503, { error: "La redirección de invitaciones no está configurada" });
    }
    const cuenta = await invitar(cliente, data.user.id, leerDatos(cuerpo));
    return responder(200, cuenta);
  } catch (error) {
    if (error instanceof ErrorInvitacion) return responder(error.status, { error: error.message });
    return responder(500, { error: "No se pudo completar la invitación" });
  }
});