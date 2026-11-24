import {
  clienteAdministrativo,
  ErrorInvitacion,
  gestionarInvitacion,
} from "../functions/_shared/invitaciones.mts";

try {
  const [operacion, ...resto] = Deno.args;
  if (resto.length || (operacion !== "reenviar" && operacion !== "cancelar")) {
    throw new ErrorInvitacion(400, "Indique una sola operación: reenviar o cancelar");
  }
  const correo = (await new Response(Deno.stdin.readable).text()).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) || correo.length > 254) {
    throw new ErrorInvitacion(400, "Proporcione un solo correo por la entrada estándar");
  }

  const resultado = await gestionarInvitacion(clienteAdministrativo(), correo, operacion);
  if (resultado.estado === "correo_confirmado") {
    console.log("Perfil conciliado. Para recuperar el acceso, el titular debe usar el flujo de recuperación.");
  } else if (resultado.estado === "invitacion_reenviada") {
    console.log("Auth aceptó el reenvío y el perfil quedó vinculado.");
  } else {
    console.log("Reserva cancelada. Puede solicitar una nueva invitación con los datos correctos.");
  }
} catch (error) {
  console.error(error instanceof ErrorInvitacion ? error.message : "Falló la gestión administrativa de la invitación");
  Deno.exitCode = 1;
}
