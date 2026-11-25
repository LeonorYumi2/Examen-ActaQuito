import { z } from 'zod';
import type { MonitoreoElectoral } from '../domain/seguimiento-electoral';

const mensajeMapa = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mapa-listo') }),
  z.object({ tipo: z.literal('mapa-no-disponible') }),
  z.object({ tipo: z.literal('recinto'), codigo: z.string() }),
  z.object({ tipo: z.literal('acta'), id: z.uuid() }),
]);

export function leerMensajeMapa(texto: string) {
  try {
    return mensajeMapa.safeParse(JSON.parse(texto)).data ?? null;
  } catch {
    return null;
  }
}

export function documentoMapaElectoral(sitioProyecto: string) {
  const base = new URL(sitioProyecto);
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('El mapa requiere una URL HTTPS del proyecto.');
  return { html, baseUrl: base.origin + '/' };
}

export function actualizarMapaElectoral(datos: Pick<MonitoreoElectoral, 'recintos' | 'actas'>) {
  const carga = JSON.stringify(datos).replace(/[<\u2028\u2029]/g, (caracter) =>
    '\\u' + caracter.charCodeAt(0).toString(16).padStart(4, '0'));
  return 'window.ActaQuitoMapa?.cargar(' + carga + '); true;';
}

const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; img-src data: https://tile.openstreetmap.org https://unpkg.com">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<style>html,body,#mapa{height:100%;margin:0}#estado{position:absolute;z-index:1000;top:8px;left:8px;background:white;padding:4px;font:14px sans-serif}#estado:empty{display:none}</style>
</head><body>
<div id="mapa" role="region" aria-label="Mapa territorial electoral"></div><output id="estado"></output>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<script>
(function () {
  const informar = (mensaje) => window.ReactNativeWebView?.postMessage(JSON.stringify(mensaje));
  const estado = document.getElementById('estado');
  if (typeof L === 'undefined') {
    estado.textContent = 'Mapa no disponible.';
    informar({ tipo: 'mapa-no-disponible' });
    return;
  }
  const mapa = L.map('mapa', { maxZoom: 19 });
  const puntos = L.layerGroup().addTo(mapa);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapa);
  let codigoAnterior;
  function marcador(posicion, titulo, detalle, color, evento) {
    const caja = document.createElement('div');
    const nombre = document.createElement('strong');
    nombre.textContent = titulo;
    const info = document.createElement('div');
    info.textContent = detalle;
    caja.append(nombre, info);
    L.circleMarker(posicion, { color, radius: 7 }).addTo(puntos).bindPopup(caja)
      .on('click', () => informar(evento));
  }
  window.ActaQuitoMapa = {
    cargar(datos) {
      puntos.clearLayers();
      estado.textContent = datos.recintos.length ? '' : 'Sin recintos visibles.';
      const centrar = [];
      const codigos = [];
      for (const r of datos.recintos) {
        const par = [r.latitud, r.longitud];
        centrar.push(par);
        codigos.push(r.codigo);
        marcador(par, r.nombre, r.parroquia + ' · ' + r.mesas_reportadas + '/' + r.total_mesas + ' mesas reportadas',
          '#405c79', { tipo: 'recinto', codigo: r.codigo });
      }
      for (const a of datos.actas) {
        marcador([a.latitud, a.longitud], a.dignidad_codigo + ' · JRV ' + String(a.mesa_numero).padStart(3, '0'),
          Math.round(a.distancia_metros) + ' m del recinto' + (a.fuera_margen ? ' · Fuera del margen' : ''),
          a.fuera_margen ? '#a34b22' : '#28705c', { tipo: 'acta', id: a.acta_id });
      }
      const codigo = codigos.join(',');
      if (centrar.length && codigo !== codigoAnterior) mapa.fitBounds(centrar, { padding: [20, 20], maxZoom: 17 });
      codigoAnterior = codigo;
    }
  };
  informar({ tipo: 'mapa-listo' });
})();
</script></body></html>`;
