type Cerrar = () => void;

export function crearSenalMonitoreo(
  conectar: (usuario: string, avisar: () => void) => Cerrar,
  actualizar: (usuario: string) => void,
  consultando: (usuario: string) => boolean,
  espera = 250,
) {
  type Entrada = { consumidores: number; cerrar: Cerrar; reloj?: ReturnType<typeof setTimeout> };
  const entradas = new Map<string, Entrada>();

  function cerrar(usuario: string) {
    const entrada = entradas.get(usuario);
    if (!entrada) return;
    entradas.delete(usuario);
    clearTimeout(entrada.reloj);
    entrada.cerrar();
  }

  function suscribir(usuario: string) {
    const existente = entradas.get(usuario);
    const entrada: Entrada = existente ?? { consumidores: 0, cerrar: () => {} };
    entrada.consumidores++;
    if (!existente) {
      entradas.set(usuario, entrada);
      const avisar = () => {
        if (entradas.get(usuario) !== entrada || entrada.reloj !== undefined) return;
        entrada.reloj = setTimeout(() => {
          entrada.reloj = undefined;
          if (entradas.get(usuario) !== entrada) return;
          if (consultando(usuario)) avisar();
          else actualizar(usuario);
        }, espera);
      };
      try {
        entrada.cerrar = conectar(usuario, avisar);
      } catch (error) {
        cerrar(usuario);
        throw error;
      }
    }
    let liberada = false;
    return () => {
      if (liberada || entradas.get(usuario) !== entrada) return;
      liberada = true;
      entrada.consumidores--;
      if (entrada.consumidores === 0) cerrar(usuario);
    };
  }

  return { suscribir, cerrar };
}
