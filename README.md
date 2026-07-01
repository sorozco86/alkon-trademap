# ALKON TradeMap Simple

Aplicación web responsive para publicar en Netlify.

## Qué incluye
- 200 empresas importadas desde el Excel.
- Mapa interactivo con puntos.
- Heatmap.
- Filtros por prioridad y estado.
- Registro de visita con vendedor, observaciones, GPS y foto desde cámara del celular.
- Guardado compartido usando Netlify Functions + Netlify Blobs.
- Exportación CSV.

## Cómo subir
1. Subir todo este contenido a GitHub.
2. Conectar el repo en Netlify.
3. Build command: `npm run build`.
4. Publish directory: `public`.
5. Functions directory: `netlify/functions`.

## Importante
Las coordenadas son aproximadas por provincia/ciudad porque el Excel no tiene dirección exacta ni lat/long. Cuando tengamos direcciones, se pueden geocodificar y reemplazar.

No incluye login complejo. Para operar simple, cada vendedor ingresa su nombre al abrir la web.
