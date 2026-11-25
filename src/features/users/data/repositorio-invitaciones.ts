import {
  invitarCoordinador as registrarInvitacionCoordinador,
  invitarVeedor as registrarInvitacionVeedor,
  asignarCoordinador,
  asignarVeedor,
  ErrorGestionUsuarios,
} from './gestion-usuarios';
import type {
  FormularioInvitacionCoordinador,
  FormularioInvitacionVeedor,
  ResultadoOperacionInvitacion,
} from '../domain/entities/invitacion';

export const repositorioInvitaciones = {
  /**
   * Invita a un nuevo Coordinador de Recinto mediante el servicio de invitaciones
   */
  async invitarCoordinador(
    datos: FormularioInvitacionCoordinador
  ): Promise<ResultadoOperacionInvitacion> {
    try {
      const confirmacion = await registrarInvitacionCoordinador({
        cedula: datos.cedula,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        telefono: datos.telefono,
        correo: datos.correo.toLowerCase(),
      });

      return {
        exito: true,
        usuarioId: confirmacion.usuarioId,
        estadoOperacion: 'pendiente_activacion',
        mensaje: 'Invitación registrada. Cuando la persona confirme su correo e inicie sesión con contraseña, podrás asignarle el recinto.',
      };
    } catch (err) {
      if (err instanceof ErrorGestionUsuarios) {
        return {
          exito: false,
          estadoOperacion: 'error',
          mensaje: err.message,
        };
      }
      return {
        exito: false,
        estadoOperacion: 'servicio_no_disponible',
        mensaje:
          (err instanceof Error ? err.message : undefined) ??
          'No se pudo conectar con el servicio de invitaciones. Comprueba que el servicio de invitaciones esté disponible.',
      };
    }
  },

  /**
   * Invita a un Veedor Electoral vinculado al recinto asignado
   */
  async invitarVeedor(
    datos: FormularioInvitacionVeedor,
    recintoCodigo: string
  ): Promise<ResultadoOperacionInvitacion> {
    try {
      const confirmacion = await registrarInvitacionVeedor(
        {
          cedula: datos.cedula,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          telefono: datos.telefono,
          correo: datos.correo.toLowerCase(),
        },
        recintoCodigo
      );

      return {
        exito: true,
        usuarioId: confirmacion.usuarioId,
        estadoOperacion: 'pendiente_activacion',
        mensaje: 'Invitación registrada. Cuando el veedor inicie sesión con su contraseña, podrás asignarle una mesa.',
      };
    } catch (err) {
      if (err instanceof ErrorGestionUsuarios) {
        return {
          exito: false,
          estadoOperacion: 'error',
          mensaje: err.message,
        };
      }
      return {
        exito: false,
        estadoOperacion: 'servicio_no_disponible',
        mensaje:
          (err instanceof Error ? err.message : undefined) ??
          'No se pudo conectar con el servicio de invitaciones. Comprueba que el servicio de invitaciones esté disponible.',
      };
    }
  },

  /**
   * Asignación directa de un coordinador habilitado a un recinto electoral
   */
  async asignarCoordinadorExistente(
    recintoCodigo: string,
    coordinadorId: string
  ): Promise<{ exito: boolean; mensaje: string }> {
    try {
      await asignarCoordinador({
        recinto: recintoCodigo,
        coordinador: coordinadorId,
      });
      return {
        exito: true,
        mensaje: 'Coordinador asignado al recinto exitosamente.',
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: error instanceof Error ? error.message : 'No se pudo asignar el coordinador al recinto.',
      };
    }
  },

  /**
   * Asignación directa de un veedor habilitado a una mesa JRV
   */
  async asignarVeedorExistente(
    recintoCodigo: string,
    mesaNumero: number,
    veedorId: string,
    asignacionSalienteId?: string
  ): Promise<{ exito: boolean; mensaje: string }> {
    try {
      await asignarVeedor({
        recinto: recintoCodigo,
        mesa: mesaNumero,
        veedor: veedorId,
        asignacionSaliente: asignacionSalienteId ?? null,
      });
      return {
        exito: true,
        mensaje: `Veedor asignado a la JRV #${String(mesaNumero).padStart(3, '0')} exitosamente.`,
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: error instanceof Error ? error.message : 'No se pudo asignar el veedor a la mesa.',
      };
    }
  },
};
