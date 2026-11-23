# ADR-04: Evidencia del acta: fotografía, ubicación GPS y mapa

## Requerimientos relacionados
RF-10, RF-11, RF-15, RF-18, RNF-07, RNF-08, RNF-10, S-08, S-11, S-12

## Contexto
Cada acta exige una foto tomada con la cámara de la app con vista previa, que rechace las borrosas, comprimida para redes rurales; además guarda latitud, longitud, precisión y hora, y la app la compara con la ubicación del recinto (margen de 200 m configurable). El panel provincial muestra en un mapa la ubicación del acta y su distancia al recinto. Debe funcionar en celulares de gama baja.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-camera con vista previa y prueba de nitidez (varianza del Laplaciano sobre una copia reducida), expo-image-manipulator para comprimir, expo-location con distancia Haversine y mapa con WebView, Leaflet y OpenStreetMap** | Carlos Serrano, Leonor Yumi | Solo permite fotos tomadas en la app; rechazo automático de fotos borrosas; sin claves de API de pago ni código nativo propio; el mapa es gratuito y la distancia se calcula también sin conexión; se puede recalcular en el servidor. | El umbral de nitidez debe calibrarse; el mapa necesita internet para cargar Leaflet y los mapas, lo que es aceptable porque el panel requiere conexión (S-11); la política de OpenStreetMap exige atribución y uso ligero. |
| **Selector de imágenes del sistema, expo-location y react-native-maps** | Joel Acosta | Muy simple de programar; mapa nativo fluido. | El selector permite fotos ajenas a la cámara de la app (contra RF-10) y no mide la nitidez; en Android el mapa requiere una clave de API de Google y más configuración nativa. |
| **react-native-vision-camera con análisis de cuadros, geolocalización nativa y mapa de Mapbox** | Diego Camacho | Máximo control y detección de borrosidad en vivo. | Configuración nativa compleja y un token de Mapbox; más riesgo para el APK y peor rendimiento en gama baja. |

## Decisión
La primera opción. En el WebView se carga el HTML de Leaflet con teselas de OpenStreetMap (con atribución y una URL base definida para que las teselas carguen), y la app envía y recibe mensajes para dibujar el recinto, el acta y la distancia. La foto original y la ubicación capturadas no cambian al corregir valores (RNF-07).

## Consecuencias
Se gana evidencia legible, menor consumo de datos y un mapa sin costo. Se asume algún falso rechazo si el umbral es estricto y la dependencia de internet del mapa. Obliga a calibrar el umbral con fotos de prueba, a manejar permisos de cámara y GPS denegados (el acta queda en borrador, S-08) y a probar el mapa y la cámara en un celular de gama baja.

## Minuto del video
[Minuto en que empieza la discusión de esta decisión. Ejemplo: 12:40.]
