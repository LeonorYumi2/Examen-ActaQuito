import { repositorioInvitaciones } from '../../data/repositorio-invitaciones';
import type {
  FormularioInvitacionCoordinador,
  FormularioInvitacionVeedor,
  ResultadoOperacionInvitacion,
} from '../entities/invitacion';

export const invitarCoordinadorUseCase = {
  ejecutar(datos: FormularioInvitacionCoordinador): Promise<ResultadoOperacionInvitacion> {
    return repositorioInvitaciones.invitarCoordinador(datos);
  },
};

export const invitarVeedorUseCase = {
  ejecutar(
    datos: FormularioInvitacionVeedor,
    recintoCodigo: string
  ): Promise<ResultadoOperacionInvitacion> {
    return repositorioInvitaciones.invitarVeedor(datos, recintoCodigo);
  },
};
