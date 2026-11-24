import { clienteAdministrativo, ErrorInvitacion, invitar, leerDatos } from "../_shared/invitaciones.mts";

/** @param {number} status @param {object} datos */
function responder(status, datos) {
  return Response.json(datos, { status, headers: { "Cache-Control": "no-store" } });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return responder(405, { error: "Use POST" });
  const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return responder(401, { error: "Se requiere una sesión válida" });

  try {
    const cliente = clienteAdministrativo();
    const { data, error } = await cliente.auth.getUser(token);
    if (error || !data.user) return responder(401, { error: "Sesión inválida" });

    const credencial = await cliente.auth.getClaims(token);
    const claims = credencial.data?.claims;
    if (credencial.error || claims?.sub !== data.user.id) {
      return responder(401, { error: "Sesión inválida" });
    }
    if (!Array.isArray(claims.amr) || !claims.amr.some((entrada) => entrada?.method === "password")) {
      return responder(403, { error: "Inicie sesión con correo y contraseña para invitar" });
    }

    if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
      return responder(415, { error: "Se requiere application/json" });
    }
    const cuerpo = await request.json().catch(() => {
      throw new ErrorInvitacion(400, "JSON inválido");
    });
    const cuenta = await invitar(cliente, data.user.id, leerDatos(cuerpo));
    return responder(200, cuenta);
  } catch (error) {
    if (error instanceof ErrorInvitacion) return responder(error.status, { error: error.message });
    return responder(500, { error: "No se pudo completar la invitación" });
  }
});