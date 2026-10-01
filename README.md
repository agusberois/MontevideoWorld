# Montevideo World

MMORPG web 2.5D con vista isométrica estilo Habbo, ambientado en Montevideo. **v1 = prueba de
concepto**: entrás con un nombre, aparecés en la **Ciudad Vieja** y caminás haciendo clic en el piso,
sincronizado en tiempo real con los demás jugadores. Hay chat con globos de texto, bancos para sentarse,
mochila con ropa, plata, tiendas y pesca en la Escollera Sarandí.

> La documentación técnica completa (arquitectura, flujo de red, convenciones y recetas) está en
> [`CLAUDE.md`](./CLAUDE.md). Este README es la guía rápida para levantarlo.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Monorepo | npm workspaces, TypeScript 5.9 (`strict`) |
| Cliente (`apps/client`) | Next.js 16 (App Router, Turbopack), React 19, Phaser 3.90 (render isométrico), colyseus.js 0.16 |
| Servidor (`apps/server`) | Node.js, Colyseus 0.16 (salas en tiempo real por WebSocket), Express 5, cors |
| Compartido (`packages/shared`) | `@colyseus/schema` 3 (estado sincronizado), constantes, mapas de barrios, pathfinding, DTOs de mensajes |
| Producción | Vercel (cliente) · VPS con PM2 + Caddy (servidor, TLS/WSS) |

Colyseus está fijado en **0.16** a propósito: es la última versión compatible con `colyseus.js`.
Para migrar a 0.17+ hay que actualizar server, client y schema juntos.

## Requisitos

- **Node.js 22** recomendado (mínimo 20.12: el server usa `process.loadEnvFile` para leer su `.env`).
- npm (viene con Node). No hace falta ninguna base de datos: todo vive en memoria.

## Estructura

```
apps/client/      # Next.js + Phaser: lo que corre en el navegador
apps/server/      # Colyseus: servidor autoritativo del juego
packages/shared/  # código común (mensajes, mapas, ítems, reglas). Se consume compilado (dist/)
deploy/           # configuración de PM2 y Caddy para el VPS
```

## Desarrollo

```bash
npm install
cp apps/server/.env.example apps/server/.env              # opcional (p. ej. para definir ADMIN_NAME)
cp apps/client/.env.local.example apps/client/.env.local  # opcional
npm run dev
```

`npm run dev` compila `shared` y después levanta tres procesos en paralelo:

| Proceso | Qué hace | Puerto |
| --- | --- | --- |
| `shared` | `tsc --watch`: recompila el paquete compartido al guardar | — |
| `server` | `tsx watch`: reinicia el servidor al guardar | **2567** |
| `client` | `next dev` con hot reload | **3000** |

Abrí http://localhost:3000 en dos pestañas, elegí un nombre en cada una y vas a ver los dos avatares.

### Jugar desde otra compu de la red local

Con `npm run dev` corriendo, la otra persona entra por la IP de tu máquina, la que Next muestra como
`Network:` (p. ej. `http://10.0.1.133:3000`). Funciona sin configurar nada porque:

- Si `NEXT_PUBLIC_SERVER_URL` no está definida, el cliente se conecta a `ws://<mismo host que la página>:2567`.
- `next.config.ts` permite el acceso desde cualquier IP en dev (`allowedDevOrigins`).

Si no conecta, revisá que el firewall de macOS deje entrar conexiones a `node`. Desde la otra compu,
`http://<tu-ip>:2567/health` tiene que responder.

### Comandos

Todos se corren desde la raíz:

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Entorno de desarrollo completo (shared + server + client) |
| `npm run build` | Build completo: shared → server → client |
| `npm run build:server` | shared + server (lo que se usa en el VPS) |
| `npm run build:client` | shared + client (lo que usa Vercel) |
| `npm run start:server` | Servidor compilado en modo producción |
| `npm run start:client` | `next start` (para probar el build del cliente localmente) |
| `npm run typecheck` | Chequeo de tipos de server y client |
| `npm run clean` | Borra `dist/` y `.next/` |

> Si aparece `Cannot find module '@montevideo-world/shared'`, corré `npm run build:shared`.

## Variables de entorno

### Cliente: `apps/client/.env.local` (en Vercel: Project Settings → Environment Variables)

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | `ws://<host de la página>:2567` | URL WebSocket del servidor del juego. En local se puede dejar sin definir. En producción **es obligatoria** y tiene que ser `wss://` (p. ej. `wss://game.tudominio.com`), porque el sitio se sirve por https. Se inlinea al compilar: si la cambiás, hay que volver a hacer build/deploy. |

### Servidor: `apps/server/.env` (plantilla en `apps/server/.env.example`)

El server lee `apps/server/.env` al arrancar. Las variables que ya vengan del entorno (shell, PM2,
systemd) tienen prioridad sobre las del archivo.

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PORT` | `2567` | Puerto HTTP/WebSocket donde escucha el servidor. |
| `HOST` | `0.0.0.0` | Interfaz de red. `0.0.0.0` acepta conexiones de afuera (útil en dev para la red local). Detrás de un reverse proxy, usá `127.0.0.1` para que sólo entre por el proxy. |
| `CORS_ORIGIN` | `*` | Orígenes permitidos: `*` o una lista separada por comas (`https://montevideo-world.vercel.app,http://localhost:3000`). Aplica a Express y al matchmaking de Colyseus. En producción conviene restringirlo al dominio del cliente. |
| `NODE_ENV` | — | `production` en el VPS (lo setean `npm run start:server` y PM2). |
| `ADMIN_NAME` | — (sin admin) | Nombre con el que se entra como **admin** (sin distinguir mayúsculas). El admin puede cambiar la hora del juego (tecla **P**) y publicar anuncios con `/post <mensaje>`. |
| `DAY_LENGTH_MINUTES` | `24` | Cuántos minutos reales dura un día del juego. Con 24, una hora del juego dura un minuto real. |
| `PLAYER_DATA_FILE` | `apps/server/data/players.json` | Archivo donde el server guarda el progreso de cada jugador (mochila, plata, ropa puesta). En producción usá una ruta fuera del repo y hacele backup. |

> ⚠️ **Admin sin contraseña:** no hay cuentas, así que cualquiera que entre con el nombre de
> `ADMIN_NAME` es admin. En un servidor público, dejalo vacío o usá un nombre difícil de adivinar
> hasta que exista una clave de admin.

## Producción

El cliente y el servidor se despliegan por separado: el cliente es un sitio estático/SSR en Vercel y el
servidor es un proceso Node de larga duración (WebSockets) en un VPS.

### Cliente → Vercel

1. Importar el repo en Vercel con **Root Directory: `apps/client`** (Framework: Next.js) y dejar
   activado "Include files outside the root directory".
2. `apps/client/vercel.json` ya define cómo instalar y compilar desde la raíz del monorepo
   (`npm ci` + `npm run build:client`).
3. Definir `NEXT_PUBLIC_SERVER_URL=wss://game.tudominio.com` (Production y Preview).
4. Deploy. Requiere `package-lock.json` commiteado.

### Servidor → VPS (Ubuntu/Debian)

```bash
# Node 22 + PM2 + Caddy
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
sudo apt install -y caddy

git clone <repo> montevideo-world && cd montevideo-world
npm ci
npm run build:server
cp apps/server/.env.example apps/server/.env   # y editar (ADMIN_NAME, DAY_LENGTH_MINUTES…)
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup   # seguir la instrucción que imprime

# TLS/WSS: reemplazar game.example.com por tu dominio en deploy/Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

- **DNS:** registro A `game.tudominio.com` → IP del VPS. Abrir los puertos 80 y 443 (el 2567 no hace
  falta exponerlo: Caddy hace de proxy).
- **PM2** (`deploy/ecosystem.config.cjs`) ya define `NODE_ENV`, `PORT`, `HOST=127.0.0.1` y
  `CORS_ORIGIN`. Esos valores pisan los del `.env`, así que cambialos ahí.
- **Caddy** saca el certificado TLS solo y hace proxy de WebSocket sin configuración extra.
- **Verificar:** `curl https://game.tudominio.com/health`.
- **Actualizar:** `git pull && npm ci && npm run build:server && pm2 restart montevideo-world-server`.

## Imprescindible saber

- **El servidor es autoritativo.** El cliente nunca escribe posiciones ni estado: sólo manda
  intenciones (`move`, `chat`, `sit`…) y el server valida y decide. Todo lo que cliente y server
  tienen que acordar vive en `packages/shared`.
- **El progreso se guarda por navegador.** No hay cuentas: el navegador guarda una clave secreta y
  el server guarda con ella la mochila, la plata y la ropa en `PLAYER_DATA_FILE` (al salir, cada 15 s
  y al apagar). Borrar los datos del sitio o cambiar de navegador = empezar de cero con el kit
  inicial y $100. Las salas y posiciones sí son sólo memoria.
- **Una sola instancia del servidor.** Colyseus guarda las salas en memoria, así que en PM2 va
  `instances: 1`. Escalar horizontalmente requiere `@colyseus/redis-presence` + `@colyseus/redis-driver`.
- **`shared` se consume compilado** (`dist/`): si cambiás algo ahí fuera de `npm run dev`, recompilalo.
- **Phaser sólo vive en `apps/client/src/game/`** y se carga con `import()` dinámico (no corre en SSR).
  React y Phaser se comunican únicamente por el EventBus tipado (`lib/eventBus.ts`).
- **Schemas de Colyseus:** requieren `useDefineForClassFields: false` en el tsconfig; si no, el estado
  no se sincroniza.

### Controles del juego

| Tecla / acción | Qué hace |
| --- | --- |
| Clic en el piso | Caminar |
| Clic en un banco / tienda | Sentarse / abrir la tienda |
| **M** | Lista de barrios y viajar a otro |
| **H** | Mochila |
| **Tab** | Jugadores del barrio |
| **F** | Pescar (parado en la escollera) |
| **1–9** | Barra de acceso rápido |
| **P** | Panel de admin (sólo admin) |
| **Esc** | Cierra paneles |

## Limitaciones conocidas (v1)

Sin cuentas (el progreso queda atado al navegador), sin colisión entre avatares y sin reconexión
automática. Hay dos barrios (Ciudad Vieja y Tres Cruces) y se viaja entre ellos desde la lista (M). La lista completa y los próximos pasos están en
[`CLAUDE.md`](./CLAUDE.md#limitaciones-conocidas-de-v1--próximos-pasos).
