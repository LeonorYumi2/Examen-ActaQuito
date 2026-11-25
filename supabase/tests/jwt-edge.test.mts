import assert from "node:assert/strict";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

Deno.test("el SDK verifica ES256 con JWKS y rechaza claims alterados, firma ajena y JWT vencido", async () => {
  const opciones = { name: "ECDSA", namedCurve: "P-256" };
  const propia = await crypto.subtle.generateKey(opciones, true, ["sign", "verify"]);
  const otra = await crypto.subtle.generateKey(opciones, true, ["sign", "verify"]);
  const publica = await crypto.subtle.exportKey("jwk", propia.publicKey);
  const encoder = new TextEncoder();
  const encabezado = base64url(encoder.encode(JSON.stringify({ alg: "ES256", typ: "JWT", kid: "actaquito-test" })));
  const vence = Math.floor(Date.now() / 1000) + 60;
  const usuario = "d0510000-0000-4000-8000-000000000001";
  const datos = { sub: usuario, role: "authenticated", amr: [{ method: "password" }], exp: vence };
  const codificar = (claims: typeof datos) => base64url(encoder.encode(JSON.stringify(claims)));
  async function firmar(claims: typeof datos, clave: CryptoKey) {
    const entrada = encabezado + "." + codificar(claims);
    const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, encoder.encode(entrada));
    return entrada + "." + base64url(new Uint8Array(firma));
  }

  const consultas: string[] = [];
  const client = createClient("https://actaquito.test", "clave-publica-de-prueba", {
    auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: false },
    global: { fetch: (input) => {
      const path = new URL(String(input)).pathname;
      assert.equal(path, "/auth/v1/.well-known/jwks.json");
      consultas.push(path);
      return Promise.resolve(Response.json({ keys: [{ ...publica, kid: "actaquito-test", alg: "ES256" }] }));
    } },
  });
  const correcto = await firmar(datos, propia.privateKey);
  const verificado = await client.auth.getClaims(correcto);
  assert.equal(verificado.error, null);
  assert.equal(verificado.data?.claims.sub, usuario);
  assert.equal(consultas.length, 1);

  const ajeno = await firmar(datos, otra.privateKey);
  const vencido = await firmar({ ...datos, exp: 1 }, propia.privateKey);
  const alterado = encabezado + "." + codificar({ ...datos, role: "service_role" }) + "." + correcto.split(".")[2];
  await assert.rejects(client.auth.getClaims(vencido), /expired/);
  for (const token of [ajeno, alterado, "no-es-un-jwt"]) {
    assert.ok((await client.auth.getClaims(token)).error);
  }
});
