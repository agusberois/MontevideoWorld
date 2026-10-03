---
paths:
  - "apps/server/src/env.ts"
  - "apps/server/.env*"
  - "apps/client/.env*"
  - "apps/client/src/lib/network.ts"
  - "apps/client/src/lib/appUrl.ts"
  - "deploy/**"
---

# Variables de entorno

## Cliente (`apps/client/.env.local`, y en Vercel → Project Settings → Environment Variables)

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | `ws://<host de la página>:2567` | URL WebSocket del servidor. Sin definir, usa el mismo host que la página (`getServerUrl`), así se puede jugar desde otras compus de la red local entrando por `http://<ip>:3000/jugar`. En producción **debe ser `wss://`** (el sitio en Vercel es https). Se inlinea en build: cambiarla requiere redeploy. |
| `NEXT_PUBLIC_APP_URL` | `app.` + host actual | Adónde lleva el botón "Jugar" de la landing (p. ej. `https://app.montevideoworld.com`). Sin definir se arma solo desde el host; entrando por IP, `/jugar`. |

## Servidor (entorno del proceso; ver `apps/server/.env.example`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `2567` | Puerto HTTP/WS |
| `HOST` | `0.0.0.0` | Interfaz. Detrás de un reverse proxy usar `127.0.0.1` |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas (`https://montevideo-world.vercel.app,http://localhost:3000`). Aplica a Express **y** a `/matchmake/*` de Colyseus |
| `NODE_ENV` | — | `production` en el VPS (lo setea `npm start`) |
| `ADMIN_NAME` | — | Nombre con el que se entra como **admin** (sin distinguir mayúsculas). Local: `AGOSHO`. Vacío = sin admin |
| `DAY_LENGTH_MINUTES` | `24` | Minutos reales que dura un día del juego (24 → 1 hora del juego por minuto real) |
| `PLAYER_DATA_FILE` | `apps/server/data/players.json` | Archivo donde se guarda el progreso de cada jugador (mochila, plata, ropa). Está en `.gitignore`. En el VPS conviene una ruta fuera del repo y con backup. Las claves sin cambios hace 90 días y sin progreso se borran solas (`playerStore.prune`, al arrancar y una vez por día) |

El server carga `apps/server/.env` al arrancar (`src/env.ts`, importado primero en `index.ts`, con
`process.loadEnvFile`). Lo que ya venga del entorno (shell, PM2, systemd) tiene prioridad. `.env` está
en `.gitignore`; la plantilla es `apps/server/.env.example`.

> **Ojo con el admin:** no hay cuentas ni contraseñas, así que cualquiera que entre con el nombre de
> `ADMIN_NAME` es admin. Antes de abrir el server al público, sumar una clave de admin (también en `.env`).
