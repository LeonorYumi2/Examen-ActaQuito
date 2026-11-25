// @ts-check
import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import { crearEnviador, ErrorEnvio } from "../_shared/envio-evidencia.mts";

const auth = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false };

/** @param {string} codigo @param {boolean} confirmando */
function errorRpc(codigo, confirmando) {
  if (codigo === "42501") return new ErrorEnvio(403, "sin_asignacion", "La asignación o los permisos ya no permiten enviar esta evidencia.");
  if (codigo === "23505") return new ErrorEnvio(409, "conflicto", "Esta operación entra en conflicto con una reserva o evidencia existente.");
  if (codigo === "22023" || codigo === "P0002") {
    return confirmando
      ? new ErrorEnvio(409, "reserva_no_confirmable", "La evidencia no está disponible para confirmar con esta reserva.")
      : new ErrorEnvio(422, "reserva_invalida", "El acta, la revisión o los datos GPS no permiten reservar la evidencia.");
  }
  return new ErrorEnvio(503, "envio_pendiente", "Reintenta el envío con la misma operación.");
}

/** @returns {import("../_shared/envio-evidencia.mts").PuertosEnvio} */
function conectar() {
  const url = Deno.env.get("SUPABASE_URL");
  const publica = Deno.env.get("SUPABASE_ANON_KEY");
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publica || !servicio) throw new Error("Falta la configuración de Supabase.");
  const admin = createClient(url, servicio, { auth });
  const publico = createClient(url, publica, { auth });
  const bucket = admin.storage.from("actas-evidencia");

  return {
    async autenticar(token) {
      const { data, error } = await publico.auth.getUser(token);
      if (error && (error.status ?? 500) >= 500) throw error;
      if (!data.user || error) return false;
      const validacion = await publico.auth.getClaims(token).catch(() => null);
      const claims = validacion?.data?.claims;
      return validacion !== null && !validacion.error && claims?.role === "authenticated" && claims.sub === data.user.id
        && Array.isArray(claims.amr) && claims.amr.some((entrada) => typeof entrada === "object" && entrada?.method === "password");
    },
    async reservar(token, datos) {
      const usuario = createClient(url, publica, { auth, global: { headers: { Authorization: "Bearer " + token } } });
      const resultado = await usuario.rpc("reservar_evidencia_acta", datos);
      if (resultado.error) throw errorRpc(resultado.error.code, false);
      if (typeof resultado.data !== "string") {
        throw new ErrorEnvio(409, "reserva_invalida", "No encontramos una reserva para esta evidencia.");
      }
      return resultado.data;
    },
    async cargar(ruta, jpeg) {
      const { error } = await bucket.upload(ruta, jpeg, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
    },
    async leer(ruta) {
      const { data, error } = await bucket.download(ruta).asStream();
      return error ? null : data;
    },
    async confirmar(operacion, huella) {
      const resultado = await admin.rpc("confirmar_evidencia_acta", { operacion, huella_verificada: huella });
      if (resultado.error) throw errorRpc(resultado.error.code, true);
      if (typeof resultado.data !== "string") throw new Error("Confirmación incompleta.");
      return resultado.data;
    },
  };
}

/** @type {ReturnType<typeof crearEnviador> | undefined} */
let handler;
Deno.serve((request) => {
  try {
    handler ??= crearEnviador(conectar());
    return handler(request);
  } catch {
    return Response.json({ codigo: "servicio_no_disponible", error: "El servicio de evidencia no está disponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
});
