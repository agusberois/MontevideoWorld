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
| `NEXT_PUBLIC_SERVER_URL` | `ws://<host de la página>:2567` | URL WebSocket del servidor. Sin definir, usa el mismo host que la página (`getServerUrl`), así se puede jugar desde otras compus de la red local entrando por `http://<ip>:3000/jugar`. En producción **debe ser `wss://`** (el sitio en Vercel es https). Se inlinea en build: cambiarla requiere redeploy. También arma el `connect-src` de la CSP (`next.config.ts`): con ella, la página sólo puede conectarse a ese server; sin ella, a cualquier `ws:`/`http:` (local y red). |
| `NEXT_PUBLIC_APP_URL` | `app.` + host actual | Adónde lleva el botón "Jugar" de la landing (p. ej. `https://app.montevideoworld.com`). Sin definir se arma solo desde el host; entrando por IP, `/jugar`. |

## Servidor (entorno del proceso; ver `apps/server/.env.example`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `2567` | Puerto HTTP/WS |
| `HOST` | `127.0.0.1` en producción, `0.0.0.0` en desarrollo | Interfaz. En el VPS va atrás de Caddy (sólo la máquina); en desarrollo, toda la red para probar desde otras compus |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas (`https://montevideo-world.vercel.app,http://localhost:3000`). Aplica a Express, a `/matchmake/*` de Colyseus **y** a la entrada (`CityRoom.onAuth` rechaza con 403 una página de otro origen; sin `Origin`, como `curl`, pasa). En producción, **sólo** los dominios del juego: el server avisa `[Seguridad]` si queda en `*`. Va en el `.env` del VPS, no en `deploy/ecosystem.config.cjs` (lo de PM2 pisa al `.env`). `Allow-Credentials: true` queda porque colyseus.js pide el matchmaking con `withCredentials` (no hay cookies) |
| `NODE_ENV` | — | `production` en el VPS (lo setea `npm start`) |
| `ADMIN_NAME` | — | Nombre con el que se entra como **admin** (sin distinguir mayúsculas). Local: `AGOSHO`. Vacío = sin admin |
| `DAY_LENGTH_MINUTES` | `24` | Minutos reales que dura un día del juego (24 → 1 hora del juego por minuto real) |
| `HEALTH_TOKEN` | — | Token para ver `/health/full` (salas, ticks, memoria) desde afuera: `Authorization: Bearer <token>`. Sin definir, el detalle sólo se ve desde la misma máquina (`curl http://127.0.0.1:2567/health/full`); `/health` (público) sólo devuelve `{ ok: true }`. Generar con `openssl rand -hex 32` |
| `PLAYER_DATA_FILE` | `apps/server/data/players.json` | Archivo donde se guarda el progreso de cada jugador (mochila, plata, ropa). Está en `.gitignore`. En el VPS conviene una ruta fuera del repo y con backup. El server lo escribe con permisos 0600 (carpeta nueva: 0700), porque guarda las claves de todos. Las claves sin cambios hace 90 días y sin progreso se borran solas (`playerStore.prune`, al arrancar y una vez por día) |

El server carga `apps/server/.env` al arrancar (`src/env.ts`, importado primero en `index.ts`, con
`process.loadEnvFile`). Lo que ya venga del entorno (shell, PM2, systemd) tiene prioridad. `.env` está
en `.gitignore`; la plantilla es `apps/server/.env.example`.

> **Ojo con el admin:** no hay cuentas ni contraseñas, así que cualquiera que entre con el nombre de
> `ADMIN_NAME` es admin. Antes de abrir el server al público, sumar una clave de admin (también en `.env`).
