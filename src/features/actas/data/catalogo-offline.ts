import { catalogosLocales, type CatalogoCifrado } from './borradores-locales';
import { cargarCandidaturas, cargarRecintoCaptura, descargarActasVisibles, repositorioActas } from './repositorio-actas';

export async function precargarCatalogoActas(usuario: string, token: string, vigente: () => boolean) {
  const [mesas, alcaldia, prefectura, actas] = await Promise.all([
    repositorioActas.listarMesas(token), cargarCandidaturas('ALCALDIA', token), cargarCandidaturas('PREFECTURA', token),
    descargarActasVisibles(token, vigente),
  ]);
  const recintos = [...new Map(mesas.map((mesa) => [mesa.recinto, mesa])).values()];
  const configuraciones: [string, CatalogoCifrado['recintos'][string]][] = [];
  for (const mesa of recintos) {
    if (!vigente()) return;
    configuraciones.push([mesa.recinto, await cargarRecintoCaptura(mesa, token)]);
  }
  if (!vigente()) return;
  await catalogosLocales.guardar(usuario, {
    mesas, candidaturas: { ALCALDIA: alcaldia, PREFECTURA: prefectura },
    recintos: Object.fromEntries(configuraciones), actas,
  });
}
