// @ts-check
import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import { crearDescargaEvidencia } from "../_shared/descarga-evidencia.mts";

const auth = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false };
/** @type {ReturnType<typeof crearDescargaEvidencia> | undefined} */
let manejar;

function conectar() {
  const url = Deno.env.get("SUPABASE_URL");
  const publica = Deno.env.get("SUPABASE_ANON_KEY");
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publica || !servicio) throw new Error("Falta configuración.");
  const cliente = createClient(url, publica, { auth });
  const bucket = createClient(url, servicio, { auth }).storage.from("actas-evidencia");
  return crearDescargaEvidencia({
    async autenticar(token) {
      const { data, error } = await cliente.auth.getUser(token);
      if (error || !data.user) return false;
      const resultado = await cliente.auth.getClaims(token).catch(() => null);
      const claims = resultado?.data?.claims;
      return claims?.sub === data.user.id && claims.role === "authenticated"
        && Array.isArray(claims.amr) && claims.amr.some((a) => typeof a === "object" && a?.method === "password");
    },
    async buscar(token, acta) {
      const usuario = createClient(url, publica, { auth, global: { headers: { Authorization: "Bearer " + token } } });
      const { data, error } = await usuario.from("actas_evidencias").select("ruta,sha256").eq("acta_id", acta).maybeSingle();
      if (error) throw error;
      return data;
    },
    async leer(ruta) {
      const { data, error } = await bucket.download(ruta).asStream();
      return error ? null : data;
    },
  });
}

Deno.serve((request) => {
  try {
    manejar ??= conectar();
    return manejar(request);
  } catch {
    return Response.json({ error: "El servicio de fotografía no está disponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
});
