# ALKON TradeMap v2

Aplicación CRM ferretera para Netlify con:
- Login por usuario/PIN y roles: admin, supervisor, vendedor.
- Mapa interactivo con puntos y mapa de calor.
- Registro de visitas por cliente.
- Foto desde cámara del celular (`capture=environment`).
- GPS de visita.
- Guardado real en Netlify Blobs mediante Netlify Functions.
- Dashboard ejecutivo y exportación CSV.

## Deploy rápido
1. Subir este ZIP a un repositorio o arrastrar la carpeta a Netlify.
2. En Netlify, confirmar:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
3. Ejecutar deploy.

## Usuarios demo
- admin / `admin123`
- sup-centro / `centro123`
- vend-amba / `amba123`
- vend-cba / `cba123`

## Recomendado antes de uso real
En Netlify > Site configuration > Environment variables, agregar:

`JWT_SECRET`: una clave larga aleatoria.

`USERS_JSON`: JSON con usuarios reales. Ejemplo:

```json
[
  {"id":"admin","name":"Sebastián Orozco","role":"admin","region":"Nacional","pin":"PIN-SEGURO"},
  {"id":"juan","name":"Juan Pérez","role":"vendedor","region":"AMBA","pin":"1234"}
]
```

## Notas
- La foto se guarda como Data URL en Netlify Blobs y se sirve por función `photo-view`.
- Para producción avanzada conviene migrar usuarios a Supabase/Auth0 o Netlify Identity.
- La base de clientes está en `public/data.js`; puede reemplazarse por otra base exportada desde Excel.
