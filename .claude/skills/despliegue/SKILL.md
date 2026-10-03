---
name: despliegue
description: Cómo desplegar Montevideo World — cliente en Vercel (dominios, variables NEXT_PUBLIC_*) y servidor en un VPS con PM2 + Caddy (WSS, /health, actualizar, límites de una instancia). Usar al desplegar, configurar el VPS o revisar producción.
---

# Despliegue

## Cliente → Vercel

1. Importar el repo en Vercel. **Root Directory: `apps/client`** (Framework: Next.js; dejar activado
   "Include files outside the root directory").
2. `apps/client/vercel.json` ya define `installCommand: cd ../.. && npm ci` y
   `buildCommand: cd ../.. && npm run build:client` (compila `shared` antes que Next).
3. Variable de entorno `NEXT_PUBLIC_SERVER_URL=wss://game.tudominio.com` (Production y Preview).
   Dominios: agregar **los dos** al proyecto, `tudominio.com` (landing) y `app.tudominio.com` (juego); el
   `proxy.ts` decide qué mostrar por el host. Opcional: `NEXT_PUBLIC_APP_URL=https://app.tudominio.com`.
4. Deploy. Requiere `package-lock.json` commiteado en la raíz.

## Servidor → VPS (Ubuntu/Debian)

Qué máquina hace falta y dónde conviene alojarla para jugadores de Uruguay: `docs/pending/hardware-y-alojamiento.md`.

```bash
# Node 22 + PM2 + Caddy
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
sudo apt install -y caddy

git clone <repo> montevideo-world && cd montevideo-world
npm ci
npm run build:server

# Progreso de los jugadores fuera del repo, legible sólo por el usuario que corre el server
# (guarda las claves de todos; el server escribe el archivo con 0600).
sudo mkdir -p /var/lib/montevideo-world && sudo chown "$USER" /var/lib/montevideo-world && chmod 700 /var/lib/montevideo-world
echo "PLAYER_DATA_FILE=/var/lib/montevideo-world/players.json" >> apps/server/.env

pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup   # seguir la instrucción que imprime

# TLS/WSS: editar el dominio en deploy/Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

- El `Caddyfile` además limita el body a 16 KB, pisa `X-Real-IP` con la IP real (sin eso los
  límites por IP se esquivan), agrega HSTS y `nosniff` y saca el header `Server`. Verificar los headers:
  `curl -I https://game.tudominio.com/health`.

- DNS: registro A `game.tudominio.com` → IP del VPS. Abrir puertos 80/443 (no hace falta exponer 2567).
- Verificar: `curl https://game.tudominio.com/health` → `{"ok":true}` (es lo único público: sirve
  para el chequeo externo de que está vivo).
- Detalle: `/health/full`, sólo desde la misma máquina (`ssh` al VPS y
  `curl http://127.0.0.1:2567/health/full`) o desde afuera con `HEALTH_TOKEN` en el `.env`
  (`curl -H "Authorization: Bearer $TOKEN" https://game.tudominio.com/health/full`); si no, 404.
  Además de salas y jugadores devuelve métricas
  (`metrics.ts`): por sala (`cities`: barrio, copia, jugadores, picudos, mensajes descartados por el
  límite de frecuencia y desconectados), duración de los ticks de jugadores y de picudos en una ventana
  reciente (`ticks`: promedio, máximo, cuántos pasaron de 20 ms), el archivo de jugadores (`store`:
  cuántos hay guardados, `lastFlush` con ms y bytes de la última escritura, boletos de viaje vigentes)
  y la memoria. Si los ticks lentos se repiten (3 en 10 s) o uno pasa de 100 ms, el log avisa con
  `[Métricas] …` (un pico suelto suele ser el GC y no se avisa).
- Actualizar: `git pull && npm ci && npm run build:server && pm2 restart montevideo-world-server`.
- Cada barrio admite `MAX_PLAYERS_PER_ROOM` (80) jugadores por sala. Con la sala llena, `joinOrCreate`
  abre **otra copia del barrio** (no se ven entre sí); cada sala toma un número (`GameState.copy`, el
  libre más bajo, `openCopies` en `CityRoom.ts`) y el HUD lo muestra ("Ciudad Vieja · 2") si es > 1.
  Probado con 85 bots: 80 + 5, el server a ~3 % de CPU con los 80 caminando.
- Colyseus guarda las salas en memoria: **una sola instancia** (`instances: 1`). Escalar horizontalmente
  requiere `@colyseus/redis-presence` + `@colyseus/redis-driver`.
