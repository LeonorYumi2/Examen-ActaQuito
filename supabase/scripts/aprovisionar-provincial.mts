import { clienteAdministrativo, ErrorInvitacion, invitar, leerDatos } from "../functions/_shared/invitaciones.mts";

try {
  const datos = leerDatos(await new Response(Deno.stdin.readable).json());
  if (datos.recinto !== null) throw new ErrorInvitacion(400, "El provincial inicial no recibe un recinto");
  const resultado = await invitar(clienteAdministrativo(), null, datos);
  console.log(`Coordinador provincial aprovisionado: ${resultado.usuarioId}`);
} catch (error) {
  console.error(error instanceof ErrorInvitacion ? error.message : "Falló el aprovisionamiento inicial");
  Deno.exitCode = 1;
}