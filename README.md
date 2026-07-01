# ALKON TradeMap v1

App web responsive para administrar visitas comerciales del canal ferretero.

## Login inicial
- Usuario: `admin`
- Contraseña: `alkon2026`

## Estructura
- `public/index.html`: app principal
- `public/js/app.js`: lógica frontend
- `public/css/styles.css`: estilos
- `public/data/clients.json`: base inicial de clientes
- `netlify/functions/auth.js`: login y usuarios
- `netlify/functions/visits.js`: guardado de visitas

## Deploy
1. Subir todo el contenido de esta carpeta a GitHub.
2. Conectar el repo en Netlify.
3. Build command: `npm run build`
4. Publish directory: `public`
5. Functions directory: `netlify/functions`

## Nota
El Excel original no hace falta subirlo. La app usa `public/data/clients.json`.
