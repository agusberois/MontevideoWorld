# Seguridad para producción

**Fecha:** 2026-10-03

**Resumen:** el server es autoritativo y valida bien casi todo lo que llega por red (guards por
mensaje, plata entera con tope, tiendas e intercambios simulados sobre copias, límite de frecuencia),
pero **hoy no está listo para abrirse al público**. Hay un bloqueante crítico: **cualquiera que entre
con el nombre del admin es admin**, y ese nombre está commiteado en el repo (`apps/server/.env`). Hay
además cuatro problemas altos: los `.env` están en git, un cliente modificado puede **duplicar
ítems** aprovechando la ventana en la que se cierra una sesión duplicada, la pesca **avisa el
resultado antes de cobrarlo** (se puede tirar gratis hasta que salga algo raro) y el matchmaking deja
**crear salas y conexiones sin límite**. Abajo están los hallazgos por severidad (verificados contra el
código del 2026-10-03), el arreglo de cada uno, un checklist de salida en orden y qué queda para
cuando haya cuentas ([`supabase-base-de-datos-y-auth.md`](./supabase-base-de-datos-y-auth.md)).

> Auditoría de lectura: no se cambió código. Las líneas citadas son las del working tree de hoy
> (`packages/shared/src/cities/`, `map.ts` e `index.ts` los estaba editando otra sesión: las
> referencias a esos archivos pueden correrse unas líneas).

## 1. Resumen ejecutivo

**Veredicto:** apto para jugar entre conocidos con el server detrás de Caddy; **no apto** para
publicar el link. Con el bloque "Fase 0" del checklist (sección 4, unos 2–3 días de trabajo) queda
razonable para una beta abierta chica. Lo que depende de cuentas (robo de la clave, bans que se
evaden, nombres únicos) se puede tolerar en beta si se aplica la mitigación transitoria que se
propone en cada caso.

**Bloqueantes (antes de publicar):**

1. **C1 – Admin por nombre.** `ADMIN_NAME=AGOSHO` está en git y además se ve en el juego (★ sobre el
   avatar): cualquiera entra como admin y puede crear plata e ítems, banear a todos, mover el reloj,
   publicar anuncios en todos los barrios. Arreglo transitorio: admin por **clave secreta** (hash en
   `.env`), no por nombre.
2. **A1 – `.env` commiteados.** `apps/server/.env` y `apps/client/.env.local` están en el índice de git
   aunque el comentario dice que no. El próximo secreto (clave de admin, `SUPABASE_SERVICE_ROLE_KEY`)
   se filtraría igual.
3. **A2 – Duplicación por la ventana de cierre.** `evictDuplicate` le saca la clave a la sesión vieja
   y le pide cerrar, pero la sala sigue procesando sus mensajes hasta que el socket cierra de verdad
   (hasta 30 s si el cliente no contesta el cierre). En esa ventana puede **intercambiarle** todo a un
   cómplice, mientras la sesión nueva ya cargó la mochila completa.
4. **A3 – La pesca filtra el resultado.** `fish:started.durationMs` depende de lo que picó y cortar la
   pesca no cuesta nada: un script tira, mira la duración y corta hasta que sale un pez difícil, sin
   gastar caña ni energía.
5. **A4 – Matchmaking sin límites.** `/matchmake/create` está expuesto (el cliente nunca lo usa), no
   hay límite de conexiones por IP ni tope de salas, y el body del POST se lee sin tope.

Con eso resuelto, lo siguiente en importancia es: que una excepción en un handler **tira el proceso
entero** (M2), el crecimiento sin techo de `players.json` con claves descartables (M1), CORS forzado a
`*` por PM2 (M5), headers de seguridad (M6) y backups del JSON (M8).

## 2. Hallazgos

Severidad pensada para un juego con economía (plata e ítems que se guardan) y un único proceso que
atiende a todos los barrios: un crash o un DoS de un jugador afecta a todos.

### Crítica

| Id | Área | Archivo:línea | Descripción | Explotación | Arreglo |
| --- | --- | --- | --- | --- | --- |
| C1 | Autorización | `apps/server/src/env.ts:25-28`, `apps/server/src/rooms/CityRoom.ts:205`, `apps/server/.env:3` | `player.admin = isAdminName(player.name)`: el rol sale del **nombre** elegido en `JoinScreen`. El nombre está en git (`ADMIN_NAME=AGOSHO`), en `.claude/rules/*.md` y en `messages.ts`, y en el juego se ve con ★. Sin contraseña. | Entrar con el nombre "agosho" (sin distinguir mayúsculas). Con eso: `/plata 1000000000`, `admin:give` de cualquier ítem, `/ban 1440 <cualquiera>` (y por nombre a desconectados), `/trace`, `/post` a todos los barrios, `admin:time`, `admin:match`. Si el admin real está conectado, conviven dos admins. | Transitorio (sección 3.1): `ADMIN_KEY_HASHES` en `.env` con el SHA-256 de la `playerKey` del admin; `player.admin` sale de la clave. Reservar el nombre del admin y "Sistema"/"Admin" para el resto. Definitivo: rol en la base (Supabase, ver sección 5). |

### Alta

| Id | Área | Archivo:línea | Descripción | Explotación | Arreglo |
| --- | --- | --- | --- | --- | --- |
| A1 | Secretos | `.gitignore` (no tiene `.env`), `apps/server/.env`, `apps/client/.env.local` | Los dos archivos están **trackeados** (`git ls-files`), están en los commits `875bd28` y `cf2f823` y el remoto es GitHub. Hoy sólo traen `ADMIN_NAME` y la URL del server, pero cualquier secreto que se agregue ahí se sube. | Si el repo es público (o se hace público), cualquiera lee el nombre del admin (C1) y, más adelante, la clave de admin o la service role de Supabase. | Sumar `.env`, `.env.*`, `!.env.example`, `!.env.local.example` al `.gitignore`; `git rm --cached` de los dos; tratar `AGOSHO` como quemado. Si el repo fue público, reescribir la historia (`git filter-repo`) o asumirlo filtrado. |
| A2 | Lógica / duplicación | `apps/server/src/rooms/CityRoom.ts:340-349` (`evictDuplicate`), `:355-363` (`route`) | Al entrar con una clave que ya está en uso, la sesión vieja se guarda, queda con `key = null` y se le hace `client.leave(4001)`. Pero `leave` sólo **inicia** el cierre: Colyseus 0.16 marca al cliente `LEAVING` recién con el evento `close` (`Room.js:518`) y `ws` sigue emitiendo `message` en estado `CLOSING` hasta `closeTimeout` (30 s). Mientras tanto `route` procesa todo: la sesión sigue en `this.sessions`. | Cliente modificado que no responde el frame de cierre: (1) entra con la clave en otra pestaña → la nueva carga la mochila guardada; (2) desde la vieja (ya sin clave, nada se guarda) invita a un cómplice de la misma sala, ofrece toda la mochila y la plata, ambos aceptan. El cómplice se guarda con todo y la sesión nueva también lo tiene: **duplicado**. Se repite cada 30 s. | Marcar la sesión como cerrada y descartar sus mensajes en `route`; no dejar que otros la elijan como objetivo; forzar `terminate()` del socket tras una gracia corta (sección 3.3). Lo mismo para la expulsión por spam (B3) y por cárcel (`travel.ts:116-118`). |
| A3 | Lógica / economía | `apps/server/src/fishing.ts:16-24`, `apps/server/src/rooms/systems/activities.ts:78-83` | `rollCatch` decide el resultado al tirar y la espera depende de él: nada = 4–7 s, pez de dificultad *d* = 2,5 s + 0,8 s·*d* + 0–2,5 s (todo × `waitFactor`). El cliente recibe `durationMs` en `fish:started`. `fish:stop` (o moverse) cancela **sin cobrar** caña ni energía (`finishAttempt` sólo corre al final). | Script: `fish:cast` → si `durationMs < 7000 × waitFactor` → `fish:stop` → otra vez (5/s por el límite). Sólo deja terminar las tiradas largas: nunca "nada", siempre dificultad ≥ 3, y la caña y la energía se gastan sólo en esas. Rompe el balance de `fishing.ts`/`tools.ts`. | Que la espera no dependa del resultado (sortearla aparte) **o** no mandar `durationMs` (el widget muestra una espera indefinida). Además, opcional: cobrar la energía al tirar. Revisar el aviso `[Balance]` después (sección 3.4). La venta (`vending.ts`) no tiene el problema: su espera no depende de la venta. |
| A4 | DoS / matchmaking | `apps/server/src/index.ts:96-101`; `node_modules/@colyseus/core/build/matchmaker/controller.js:45`; `Server.js:224-226` | Colyseus expone `joinOrCreate`, **`create`**, `join`, `joinById` y `reconnect`. `create` abre una sala nueva por pedido (cada una con 4 intervalos: 250 ms, 100 ms, 1 s, 15 s) que vive 15 s esperando al asiento reservado. No hay `onAuth`, ni límite por IP, ni tope de salas, y el body del POST se acumula sin tope. El límite de frecuencia es por `sessionId`: reconectar lo resetea. | `while true; curl -X POST .../matchmake/create/city -d '{"cityId":"ciudad-vieja"}'` → cientos de salas vivas a la vez, CPU al 100 % para todos. O abrir miles de sockets con `joinOrCreate` (cada uno es un jugador "real" que además escribe un registro en `players.json`, ver M1). O un POST de cientos de MB a `/matchmake/...` (se bufferiza entero en memoria antes de `JSON.parse`). | `matchMaker.controller.exposedMethods = ["joinOrCreate", "joinById"]`; tope de salas por barrio en `onCreate`; `onAuth` con conexiones y joins por IP (usando `context.ip`, con `X-Real-IP` pisado por Caddy); `request_body max_size` en Caddy (sección 3.5). |

### Media

| Id | Área | Archivo:línea | Descripción | Explotación | Arreglo |
| --- | --- | --- | --- | --- | --- |
| M1 | DoS / persistencia | `apps/server/src/playerStore.ts:164-171`, `:119-134`; `CityRoom.ts:317-330` | Cada clave nueva que entra y sale crea un registro (aunque no haya hecho nada). `prune` sólo borra los "intactos" a los **90 días**. Cada escritura serializa el archivo entero en el hilo principal (90 ms con 10.000 jugadores, ~490 ms con 50.000, según `docs/finished/escalabilidad-servidor.md`). | Un script que entra y sale con claves aleatorias (no hay límite por IP, A4) suma ~86.000 registros por día a 1/s: en horas el server se traba cada vez que guarda, en todos los barrios. | No guardar registros nuevos que siguen intactos (`isUntouched`) salvo que ya existieran; límite de claves nuevas por IP/hora en `onAuth`; a mediano plazo, base de datos (sección 5). |
| M2 | Disponibilidad | `CityRoom.ts:358-362`; `node_modules/@colyseus/core/build/Room.js:750-751` | Colyseus llama al handler de cada mensaje **sin try/catch** (sólo protege el decode de msgpack) y no hay `process.on("uncaughtException")`. Cualquier excepción en un handler o en un timer tira el proceso: todas las salas, todos los jugadores. Hoy no encontré una entrada que lance, pero no hay red de seguridad. | Un bug futuro (o una entrada no prevista) se convierte en un "botón de apagado" para todos. Peor: con PM2 el server vuelve, pero los jugadores guardados en momentos distintos quedan desfasados (se pierde hasta 15 s) y eso abre la puerta a duplicar ítems en un intercambio (el que recibió se guardó al salir, el que dio no). | Envolver `run(session, message)` en `try/catch` con log y desconexión de ese cliente; `process.on("uncaughtException")` que haga `playerStore.flush()` y salga; guardar a los dos participantes en el acto al cerrar un intercambio (`room.savePlayer(a/b)` en `trading.ts:74-82`). |
| M3 | DoS / CPU | `apps/server/src/rooms/systems/movement.ts:22-26`; `rateLimit.ts:36` | Cada `move` puede correr un BFS (`findPath`, ~0,2–0,4 ms; ~1 ms en mapas de 120×90) y `move` admite 20/s con ráfaga de 40. Todo corre en un solo hilo para todos los barrios. | 80 bots mandando `move` a destinos lejanos a 20/s ≈ 0,3–0,8 s de CPU por segundo: el tick de 250 ms se atrasa para todos. Combinado con A4, con pocas máquinas. | Calcular el camino a lo sumo una vez por tick por jugador (guardar el último destino pedido y resolverlo en `stepPlayers`); tope de nodos en el BFS; bajar `move` a ~10/s si la predicción lo permite. |
| M4 | Suplantación / Unicode | `packages/shared/src/sanitize.ts:3-8`, `packages/shared/src/pets.ts:92-98`; `CityRoom.ts:197` | Sólo se sacan C0/C1. Pasan: marcas bidi (U+202A–202E, U+2066–2069), ancho cero (U+200B–200D, U+2060, U+FEFF), guion blando (U+00AD), combinantes y homógrafos (cirílico "А" = latino "A"). No hay nombres reservados ni únicos. | "AGOSHO​" o "АGOSHO" (A cirílica) se ve igual que el admin en el chat (el ★ sólo sale sobre el avatar). Un nombre con U+202E da vuelta lo que se ve en el chat y en la lista. Dos jugadores pueden llamarse igual (a propósito, para hacerse pasar por otro o para que `/mensaje`, `/plata` o `/ban` digan "hay 2 jugadores llamados…"). | `normalize("NFKC")`, sacar `\p{Cf}` y `\p{M}` sobrantes, colapsar espacios; nombres reservados (admin, "Sistema", "Admin", "Moderador") comparados por un "esqueleto" (minúsculas + mapa de confusables básico); nombre único entre los conectados. Definitivo: nombres únicos por cuenta (sección 5). |
| M5 | Infra / CORS | `deploy/ecosystem.config.cjs:14`; `apps/server/src/index.ts:48-55`, `:84-94`; `env.ts:9-14` | PM2 setea `CORS_ORIGIN: "*"` y `env.ts` **no pisa** lo que ya viene del entorno: aunque el `.env` del VPS diga otra cosa, queda `*`. Con `*`, el `cors` refleja cualquier `Origin` con `Access-Control-Allow-Credentials: true`. El upgrade de WebSocket no mira el `Origin` (CORS no aplica a WS). | Cualquier página puede hacer matchmaking y abrir sockets contra el server desde el navegador de sus visitantes (bots "prestados" que además esquivan límites por IP). No roba la clave (vive en el `localStorage` del origen del juego), pero facilita A4/M1. | Sacar `CORS_ORIGIN` del ecosystem (que lo ponga el `.env`) o fijarlo a los dominios reales; `credentials: false` (no hay cookies); en `onAuth`, rechazar `context.headers.origin` fuera de la lista (no frena scripts, sí páginas ajenas). |
| M6 | Infra / headers | `apps/client/next.config.ts` (sin `headers()`), `deploy/Caddyfile` | El cliente no define CSP, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` ni `X-Content-Type-Options`. Caddy sólo hace `reverse_proxy`: sin límite de body, sin pisar `X-Real-IP` (Colyseus lo prefiere a `X-Forwarded-For` para `context.ip`), sin headers. | Clickjacking: meter el juego en un iframe invisible y hacer que la víctima apriete "Aceptar" en un intercambio. Sin CSP, si algún día aparece un XSS no hay segunda barrera y la clave del `localStorage` se va. `X-Real-IP` falso → los límites por IP de A4 se esquivan. | Headers en `next.config.ts` (CSP primero en `Report-Only`) y bloque `request_body` + `header_up X-Real-IP {remote_host}` + headers en Caddy (sección 3.5 y 3.6). |
| M7 | Divulgación | `apps/server/src/index.ts:67-80` | `/health` es público y devuelve `roomId` de cada sala, jugadores por barrio y copia, mensajes descartados y expulsados por spam, duración de ticks, memoria, tamaño del archivo de jugadores y boletos vigentes. | Un atacante mide el efecto de su DoS en vivo (ticks, memoria) y obtiene los `roomId` para `joinById` dirigido a una copia. | Público: sólo `{ ok: true }`. Detalle en `/health/full` con `Authorization: Bearer <HEALTH_TOKEN>` (comparado con `timingSafeEqual`) o sólo desde `127.0.0.1` (Caddy no lo expone). |
| M8 | Datos | `playerStore.ts:87-89`, `:200-203`; `.gitignore:4` | `players.json` guarda las claves **en texto plano** como índice (son la única credencial del jugador), se escribe con permisos por defecto (0644 con umask 022), su ruta por defecto está **dentro del repo** y no hay backups. | Una copia filtrada del archivo (backup mal guardado, otro usuario del VPS, un `scp` olvidado) permite entrar como cualquier jugador. Un `git clean -fdx` o un disco roto borra todo el progreso. | Indexar por `sha256(clave)` (migración simple al cargar); `writeFile(tmp, json, { mode: 0o600 })`; `PLAYER_DATA_FILE=/var/lib/montevideo-world/players.json` con dueño un usuario dedicado; backup horario fuera del VPS (sección 4). |
| M9 | Moderación | `apps/server/src/bans.ts:15-26`; `rooms/systems/social.ts:133-140`; `commands/ban.ts` | El ban va por clave y por **nombre**. Se evade con datos del sitio borrados + otro nombre. Y al revés: banear por nombre a alguien desconectado deja ese nombre preso para **cualquiera** que lo use después (y marca todas las claves guardadas con ese nombre). | Un baneado vuelve en un minuto. Un jugador inocente que se llama "Juan" queda preso porque el admin baneó a otro "Juan". | Transitorio: avisar al admin cuántas claves toca un ban por nombre y que el ban por nombre venza solo; dejar registro. Definitivo: ban por cuenta (sección 5). |
| M10 | Auditoría | `commands/plata.ts`, `ban.ts`, `donador.ts`, `trace.ts`, `curar.ts`; `systems/admin.ts:11-32`; `CityRoom.ts:290` | Sólo `[Maker]` y `[Anuncio]` quedan en el log. `/plata`, `/ban`, `/donador`, `/trace`, `/curar`, `admin:time` y `admin:match` no se registran; el `join` no anota IP ni si trae clave conocida. | Con C1, alguien carga plata o banea y no queda rastro de quién ni desde dónde. | Log `[Admin] <nombre> (<sessionId>, <ip>) /comando args` para todo lo de rol admin y para `join` (IP, clave nueva/conocida, hash corto de la clave). |

### Baja

| Id | Área | Archivo:línea | Descripción | Explotación | Arreglo |
| --- | --- | --- | --- | --- | --- |
| B1 | Validación | `packages/shared/src/cities/index.ts:20-21` (`getCity`) | Busca en un objeto literal: `getCity("constructor")` devuelve `Object` (verificado con `tsx`). En `travel:request` (`systems/travel.ts:34-46`) se toma como destino válido: **se gasta el boleto** y se emite un pase a `cityId: undefined`. En `onCreate`, `getCityMap("constructor")` tira `TypeError` (lo ataja el matchmaker). | Sólo se perjudica uno mismo (pierde el boleto), pero es la clase de bug que después rompe otra cosa. | `Object.hasOwn(BY_ID, id) ? BY_ID[id] : undefined` o un `Map`. |
| B2 | Validación | `apps/server/src/commands/donador.ts:3`, `:12` | `VALUES[raw]` con `raw = "constructor"` o `"__proto__"` da un valor truthy que no es booleano y termina en `player.donor` (el Schema lo acepta sin quejarse). | Sólo admin (pero ver C1). | `Object.hasOwn(VALUES, raw)` o un `Map`. |
| B3 | Rate limit | `CityRoom.ts:366-378` | Al expulsar por spam se hace `rateLimiter.forget(sessionId)` y `client.leave(4002)`. Si el cliente no contesta el cierre (ver A2), sus mensajes siguen entrando con baldes **nuevos y llenos** durante 30 s, y cada nueva expulsión vuelve a loguear. | Un spammer obtiene 30 s más de ráfaga completa y llena el log. | No olvidar el estado hasta `onLeave`; descartar todo lo de una sesión marcada como cerrada (mismo arreglo que A2). |
| B4 | Spam / acoso | `rooms/systems/social.ts:19-28`; `constants.ts:20` | Chat y `/mensaje` con cooldown de 400 ms (2,5 mensajes/s por jugador, a 80 personas). No hay silenciar, bloquear ni reportar. | Inundar el chat del barrio o el privado de alguien desde varias pestañas/cuentas. | Cooldown más largo para mensajes repetidos, `/silenciar` para admins, bloquear a un jugador del lado del cliente; con cuentas, reportes (sección 5). |
| B5 | Logs | `CityRoom.ts:123`; `CityRoom.ts:290` | `String(options.cityId)` sin sanitizar en el error de `onCreate` (vuelve en la respuesta del matchmaker y puede llegar al log con saltos de línea). Los nombres con marcas bidi se loguean tal cual. | Ensuciar o falsear líneas del log. | Recortar y escapar (`JSON.stringify(String(x).slice(0, 40))`) lo que viene del cliente antes de loguearlo. |
| B6 | Infra | `apps/server/src/index.ts:40`, `:57`; `apps/server/.env.example:4` | `HOST` por defecto `0.0.0.0` (en el VPS sólo lo corrige PM2); Express manda `X-Powered-By: Express`. | Si alguien arranca con `npm run start:server` en el VPS sin firewall, el 2567 queda expuesto sin TLS y con `X-Real-IP` falsificable. | Default `127.0.0.1` en producción; `app.disable("x-powered-by")`; `ufw` con sólo 22/80/443. |
| B7 | Dependencias | `apps/server/package.json` | `npm audit --omit=dev`: 3 avisos (1 alto, 2 moderados), todos por `nanoid ≤ 3.3.17` dentro de `@colyseus/core 0.16.26` (y `@colyseus/ws-transport` que depende de él). Los CVE son con tamaños no enteros, negativos o cero; Colyseus llama `nanoid(length)` con constantes: **no explotable** acá. El único arreglo es `@colyseus/core 0.18` (rompe la compatibilidad con `colyseus.js`). Next 16.3.8, React, Phaser y `ws 8.22` sin avisos. | — | Dejar documentado; activar Dependabot/`npm audit` en CI; planificar la migración a Colyseus ≥ 0.17 (`@colyseus/sdk`) junto con server, cliente y schema. |
| B8 | Runtime | `package.json` (`engines.node >= 20.9.0`) | Node 20 llegó a fin de vida el 2026-04-30. El VPS usa Node 22 (mantenimiento hasta abril 2027), pero `engines` todavía permite 20. | Correr en un Node sin parches de seguridad. | `engines.node >= 22`; plan para Node 24 LTS. |
| B9 | Sanitizado | `sanitize.ts:7`, `pets.ts:97` | `slice(0, max)` cuenta unidades UTF-16: puede cortar un emoji a la mitad (sustituto suelto). | Caracteres rotos en nombres/chat; algunos renderizadores muestran "�". | Cortar por puntos de código (`Array.from(s).slice(0, max).join("")`). |

### Informativa

| Id | Área | Archivo:línea | Descripción | Comentario |
| --- | --- | --- | --- | --- |
| I1 | Intercambio | `rooms/systems/trading.ts:112-119`; `trades.ts:126-132` | Si cambia la mochila pero la oferta sigue siendo válida, las aceptaciones no se anulan. Con herramientas, la unidad que pasa es la más gastada **al ejecutar**, que podría no ser la que el otro vio (`uses`). | Hoy no se explota: con un intercambio abierto no se puede pescar ni vender, y todo lo que entra (tienda, maker, cajas) entra nuevo. Si se agrega algo que haga entrar herramientas gastadas, anular aceptaciones ante cualquier cambio de mochila. |
| I2 | Bots | — | No hay nada contra la automatización (pescar, vender, patear picudos en loop). | Es esperable en una PoC; con cuentas, límites por cuenta y detección de patrones. |
| I3 | Transporte | `apps/client/src/lib/network.ts:51-54`, `:75` | La clave del jugador viaja en el body del POST de matchmaking. Sin `NEXT_PUBLIC_SERVER_URL`, el cliente usa `ws://<host>:2567` (sin TLS). | En producción `wss://` es obligatorio (Vercel es https: el navegador bloquearía `ws://` igual). Verificarlo en el checklist. |
| I4 | Dev | `apps/client/next.config.ts:9` | `allowedDevOrigins: ["*.*.*.*"]`. | Sólo afecta a `next dev`; no llega a producción. |
| I5 | Versiones | `apps/server/package.json` | Colyseus fijado en la línea 0.16 por compatibilidad con `colyseus.js`. | Correcto mientras se mantenga; ver B7. |

### Lo que ya está bien

- **Guards en todos los mensajes**: `MESSAGE_GUARDS` es un `Record` exhaustivo (no compila si falta
  uno), `route` descarta lo que no pasa el guard y los tipos sin handler se cuentan contra el límite
  (`UNKNOWN_MESSAGE_TYPE`). Enteros con `Number.isInteger`/`isSafeInteger`, sin NaN/Infinity.
- **Tamaño de mensaje**: `maxPayload` de 4 KB en `@colyseus/ws-transport` (verificado en
  `WebSocketTransport.js:47-48`); el recorrido de `move` está acotado a 512 entradas y se recorta a 256.
- **Límite de frecuencia** por cliente y por tipo, con desconexión por abuso sostenido (salvo B3).
- **Plata**: enteros con tope (`isValidAmount`, `MAX_MONEY`), `Wallet` nunca queda negativa ni pasa el
  tope; regatear valida `isSafeInteger` y el rango; vender chequea el tope antes de sacar el ítem.
- **Tiendas**: precios del catálogo (nunca del cliente), hay que estar pegado (`isNearShop`),
  cantidades 1–99, carrito todo o nada probado sobre `inventory.clone()`, lo puesto no se vende.
- **Intercambio**: un intercambio por jugador, misma sala, cualquier cambio de oferta anula las dos
  aceptaciones, `executeTrade` simula sobre copias y recién después aplica, `clampOffer` recorta si la
  mochila cambia, `normalizeTradeOffer` valida ítems, cantidades y plata.
- **Cajas, comida, ropa**: chequean que el ítem esté en la mochila; la caja prueba el premio en una
  copia antes de abrirse.
- **Movimiento**: el server avanza un tile por tick; `followRoute` valida paso a paso (vecinos
  caminables, sin cortar esquinas); `isWalkable` chequea límites (coordenadas enormes o negativas no
  indexan fuera del mapa).
- **Admin** (sacando C1): cada handler y comando chequea `player.admin` en el server; `admin:give`
  vuelve a medir la distancia; `/plata` valida monto y tope.
- **Viajes**: el pase lo emite el server, va por clave, vence a los 30 s y se consume al entrar; sin
  pase no se entra a otro barrio ni al COMCAR (salvo preso).
- **Clave del jugador**: 128 bits de `crypto.getRandomValues`, formato validado en el server
  (`isPlayerKey`), en `localStorage` sólo la clave (no el progreso), una sesión por clave.
- **Persistencia**: escritura atómica (tmp + `rename`), sólo si cambió, restauración validada
  (ítems, cantidades, usos, plata, ropa, mascota, necesidades), `apps/server/data/` en `.gitignore`.
- **XSS**: no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en el cliente; React escapa
  nombres, chat y anuncios; los textos de Phaser se dibujan en canvas. Los caracteres de control se
  sacan, así que no hay saltos de línea inyectados en el log desde nombres o chat.
- **Estado privado fuera del Schema**: mochila, plata, hambre, salud y caminos sólo los ve el dueño.
- **Deploy**: PM2 con `HOST=127.0.0.1` detrás de Caddy (TLS automático), una sola instancia.

## 3. Detalle de los hallazgos crítico y altos

### 3.1 C1 – Admin por clave, no por nombre (transitorio hasta Supabase)

La `playerKey` ya es un secreto de 128 bits que el server recibe en cada join. Alcanza con decirle al
server cuáles claves son de admin, guardando sólo su hash (el `.env` no queda con la clave usable):

```ts
// apps/server/src/env.ts
import { createHash } from "node:crypto";

/** SHA-256 (hex) de las playerKey de los admins, separados por coma: ADMIN_KEY_HASHES=ab12…,cd34… */
const adminKeyHashes = new Set(
  (process.env.ADMIN_KEY_HASHES ?? "").split(",").map((hash) => hash.trim().toLowerCase()).filter(Boolean),
);

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function isAdminKey(key: string | null): boolean {
  return key !== null && adminKeyHashes.has(hashKey(key));
}
```

```ts
// apps/server/src/rooms/CityRoom.ts (onJoin)
const key = isPlayerKey(options.playerKey) ? options.playerKey : null;
player.admin = isAdminKey(key);
// Nadie más puede usar el nombre del admin ni nombres "de sistema" (ver M4 para la normalización).
if (!player.admin && isReservedName(player.name)) player.name = `Invitado${Math.floor(1000 + Math.random() * 9000)}`;
```

- El admin saca su clave desde la consola de su navegador (`localStorage.getItem("mw:playerKey")`),
  calcula `echo -n <clave> | sha256sum` y la pone en `ADMIN_KEY_HASHES` del VPS.
- `ADMIN_NAME` deja de dar permisos (puede quedar sólo como nombre reservado).
- Esto **no** resuelve el robo de la clave (si alguien la obtiene, es admin): por eso CSP (M6) y,
  después, el rol en la base con login de Google (sección 5).

### 3.2 A1 – Sacar los `.env` de git

```gitignore
# .gitignore
.env
.env.*
!.env.example
!.env.local.example
```

```bash
git rm --cached apps/server/.env apps/client/.env.local
git commit -m "No versionar los .env"
```

Después de C1, `ADMIN_NAME` deja de importar. Si el repo fue público alguna vez, asumir filtrado todo
lo que estuvo en esos archivos y no reutilizarlo.

### 3.3 A2 – Cortar de verdad la sesión duplicada

```ts
// apps/server/src/rooms/session.ts
export interface PlayerSession {
  // …
  /** Se le pidió cerrar (duplicada, spam, cárcel): ya no se procesa nada suyo. */
  closed: boolean;
}
```

```ts
// apps/server/src/rooms/CityRoom.ts
private route<K extends keyof MessageRoutes>(type: K, handler: MessageRoutes[K]) {
  const guard = MESSAGE_GUARDS[type] as (message: unknown) => boolean;
  const run = handler as (session: PlayerSession, message: unknown) => void;
  this.onMessage(type, (client, message: unknown) => {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.closed) return; // antes de tocar el rate limiter
    if (!this.allowMessage(client, type)) return;
    if (!guard(message)) return;
    try {
      run(session, message);
    } catch (error) {
      console.error(`[CityRoom ${this.label}] error en "${type}" de ${client.sessionId}`, error); // M2
      this.closeSession(session, 4500);
    }
  });
}

/** Cierra la sesión ya: no se procesa nada más y, si el cliente no contesta el cierre, se corta el socket. */
closeSession(session: PlayerSession, code: number) {
  if (session.closed) return;
  session.closed = true;
  stopActivities(session);
  cancelTrade(this, session, "leave");
  session.client.leave(code);
  this.clock.setTimeout(() => {
    // `ws` espera hasta 30 s el frame de cierre del otro lado: no hace falta tanto.
    (session.client as unknown as { ref?: { terminate?: () => void } }).ref?.terminate?.();
  }, 2000);
}

evictDuplicate(sessionId: string) {
  const session = this.sessions.get(sessionId);
  if (!session) return;
  stopActivities(session);
  cancelTrade(this, session, "leave");
  this.savePlayer(session);
  session.key = null;
  this.notice(session, "Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
  this.closeSession(session, DUPLICATE_SESSION_CODE);
}
```

- Usar `closeSession` también en la expulsión por spam (`allowMessage`, y no llamar a
  `rateLimiter.forget` hasta `onLeave`: B3) y en `jail` (`travel.ts:116-118`).
- En `trading.ts`, `TradeRequest`/`TradeRespond`/`TradeAccept`: ignorar sesiones con `closed`.
- Test: dos clientes con la misma clave, el viejo sin responder el cierre (`ws` con
  `socket.pause()`), intenta un intercambio con un tercero → no tiene que pasar nada.

### 3.4 A3 – Que la espera de la pesca no delate el resultado

Opción simple (no cambia el balance por tirada, sí la duración media):

```ts
// apps/server/src/fishing.ts
export function rollCatch(rod: RodItem, random: () => number = Math.random): CatchRoll {
  // La espera se sortea aparte: no puede decir qué picó (si no, cortar y volver a tirar es gratis).
  const durationMs = Math.round((3500 + random() * 5000) * rod.waitFactor);
  if (random() < rod.nothingChance) return { fish: [], durationMs };
  const fish = [pickFish(rod, random)];
  if (random() < rod.doubleChance) fish.push(pickFish(rod, random));
  return { fish, durationMs };
}
```

Si se quiere mantener "los peces difíciles tardan más" como sensación de juego, la alternativa es no
mandar `durationMs` en `fish:started` (el `FishingWidget` muestra una espera sin barra) y sortear el
resultado **al final** del timer en vez de al tirar. En cualquiera de las dos, correr el server y
mirar los avisos `[Balance]` (`tools.ts` y `needsBalance.ts` usan las esperas para la rentabilidad
por hora). Cobrar la energía al tirar (y no al final) es un refuerzo extra contra el tirar-y-cortar.

### 3.5 A4 – Matchmaking, salas y conexiones por IP

```ts
// apps/server/src/index.ts
// El cliente sólo usa joinOrCreate y joinById (lib/network.ts): el resto no se expone.
matchMaker.controller.exposedMethods = ["joinOrCreate", "joinById"];
app.disable("x-powered-by"); // B6
```

```ts
// apps/server/src/rooms/CityRoom.ts
const MAX_COPIES_PER_CITY = 10;
const MAX_CONNECTIONS_PER_IP = 6;
const connectionsByIp = new Map<string, number>();

onCreate(options: Partial<JoinOptions> = {}) {
  // …
  if ((openCopies.get(map.city.id)?.size ?? 0) >= MAX_COPIES_PER_CITY) {
    throw new ServerError(503, "El barrio está lleno: probá en un rato.");
  }
  // …
}

onAuth(_client: Client, _options: unknown, context: AuthContext) {
  const ip = String(context.ip ?? "?");
  if (!isAllowedOrigin(context.headers.origin)) throw new ServerError(403, "Origen no permitido"); // M5
  const open = connectionsByIp.get(ip) ?? 0;
  if (open >= MAX_CONNECTIONS_PER_IP) throw new ServerError(429, "Demasiadas conexiones desde tu red.");
  connectionsByIp.set(ip, open + 1);
  return { ip }; // queda en client.auth; en onLeave: connectionsByIp.set(ip, n - 1) (y borrar en 0)
}
```

- `connectionsByIp` es global al proceso (no por sala), como `activeSessions`.
- Ojo con NAT (un colegio o un ciber detrás de una IP): 6 es un punto de partida; medir.
- `context.ip` sale de `X-Real-IP` antes que de `X-Forwarded-For` (`Server.js:239`): Caddy tiene que
  **pisar** `X-Real-IP`, si no, el atacante pone el que quiera:

```caddyfile
# deploy/Caddyfile
game.example.com {
	request_body {
		max_size 16KB
	}
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		-Server
	}
	# /health con detalle sólo desde la máquina (M7)
	@healthFull path /health/full
	respond @healthFull 404
	reverse_proxy 127.0.0.1:2567 {
		header_up X-Real-IP {remote_host}
	}
}
```

Para limitar pedidos por segundo en el borde (no sólo conexiones abiertas) hace falta el módulo
`caddy-ratelimit` (build con `xcaddy`) o Cloudflare delante; con `onAuth` alcanza para empezar.

### 3.6 M6 – Headers del cliente (no es alta, pero va en la Fase 1)

```ts
// apps/client/next.config.ts
const server = process.env.NEXT_PUBLIC_SERVER_URL ?? "";
const serverHttp = server.replace(/^ws/, "http"); // el matchmaking va por https://

const securityHeaders = [
  {
    // Empezar con Content-Security-Policy-Report-Only y pasar a la definitiva cuando no haya reportes.
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Next inyecta scripts inline; con nonces se puede sacar
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${server} ${serverHttp}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // …
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

Vercel ya agrega HSTS en sus dominios; con dominio propio, verificarlo con `curl -I`. Probar Phaser
con la CSP (no usa `eval`, pero hay que confirmar que no cargue nada de otro origen).

## 4. Checklist de salida a producción (en orden)

### Fase 0 – Bloqueantes (antes de compartir el link)

1. [x] **A1**: `.gitignore` con `.env*`, `git rm --cached` de los dos `.env`. Nada de secretos en
   `NEXT_PUBLIC_*` (hoy sólo hay URLs: bien). **Hecho (2026-10-03):** además el `.gitignore` tenía
   dos reglas pegadas en una línea (`apps/server/data/.env.local`), así que tampoco ignoraba
   `apps/server/data/`; quedó corregido. Los archivos siguen en disco y andan igual (`ADMIN_NAME`,
   `DAY_LENGTH_MINUTES`). En el historial de git quedan los valores viejos (sólo `ADMIN_NAME` y la
   duración del día: nada que rotar más allá de lo que resuelve C1).
2. [ ] **C1**: admin por `ADMIN_KEY_HASHES`; nombres reservados. Probar que entrar como "AGOSHO" desde
   otro navegador **no** da admin.
3. [x] **A2 + B3 + M2**: `session.closed`, `closeSession` con `terminate()`, `try/catch` en `route`,
   `process.on("uncaughtException")` → `flush()` y salir (PM2 lo levanta). **Hecho (2026-10-03):**
   `PlayerSession.closed`; `CityRoom.closeSession(session, código)` (corta actividades e intercambio,
   `client.leave` y, si a los 2 s sigue, `terminate()` del socket) para duplicada, spam y cárcel;
   `route` y el handler `"*"` ignoran sesiones cerradas antes del límite; el límite se olvida recién
   en `onLeave` (B3); no se puede invitar, responder ni cerrar un intercambio con una sesión cerrada;
   `try/catch` por mensaje (log + `closeSession` con 4500); `uncaughtException` /
   `unhandledRejection` → `saveEveryone()` + `playerStore.flush()` (tope 5 s) y `exit(1)`; al cerrar
   un intercambio se guardan los dos en el acto. Probado contra el server con un cliente que no
   contesta el cierre (lectura del socket pausada): después de entrar la misma clave en otra pestaña,
   0 de 10 chats y 0 de 10 invitaciones llegaron y el socket se cortó a los 2,3 s; expulsado por spam,
   0 de 10 chats y corte a los 2,4 s.
4. [x] **A3**: espera de la pesca independiente del resultado; revisar `[Balance]` al arrancar.
   **Hecho (2026-10-03):** `rollCatch` sortea la espera aparte (3,5–7,5 s × `waitFactor`, promedio
   5,5 s, el mismo que asume `needsBalance.ts`). Medido con 200.000 tiradas por caña: la espera media
   es igual para cada resultado y P(dificultad ≥ 4 | espera larga) = P(dificultad ≥ 4); esperas
   medias casi iguales a antes (básica 5,3 → 5,5 s, profesional 4,0 → 3,85 s). Sin avisos
   `[Balance]`. Se pierde que los peces difíciles tarden más (era justamente la filtración).
5. [x] **A4**: `exposedMethods`, tope de copias por barrio, `onAuth` con límite por IP y `Origin`.
   **Hecho (2026-10-03):** `exposedMethods =
   ["joinOrCreate", "joinById"]`; `MAX_COPIES_PER_CITY = 10` en `onCreate`; `CityRoom.onAuth`
   estático (corre en el pedido HTTP, antes de reservar asiento) con `connectionLimits.ts`: hasta 8
   conexiones abiertas por IP y un balde de 8 pedidos de entrada que se recarga uno cada 4 s;
   `app.disable("x-powered-by")` (B6). Probado contra el server: `create` y `join` → `invalid
   method`; desde una IP entran 8 y la 9.ª se rechaza; tras cerrar 3, enseguida se rechaza por
   pedidos seguidos y a los 8,5 s vuelve a entrar. El tope de copias no se probó (harían falta 800
   jugadores). El chequeo de `Origin` se hizo junto con M5 (punto 6).
6. [ ] **M5**: sacar `CORS_ORIGIN: "*"` de `deploy/ecosystem.config.cjs`; en el `.env` del VPS,
   `CORS_ORIGIN=https://tudominio.com,https://app.tudominio.com`; `credentials: false`.
   **Código hecho (2026-10-03), falta el `.env` del VPS:** el ecosystem ya no pone `CORS_ORIGIN`;
   la lista vive en `env.ts` (`isOriginAllowed`) y la usan Express, `/matchmake/*` y
   `CityRoom.onAuth`, que rechaza con 403 una página de otro origen antes de reservar el asiento
   (sin `Origin`, como `curl`, pasa: esto frena páginas ajenas, no scripts). En producción con `*`
   el server avisa `[Seguridad]` al arrancar. **`credentials: false` no se puede:** colyseus.js
   pide el matchmaking siempre con `withCredentials` y el navegador lo bloquearía; como no hay
   cookies, alcanza con no reflejar orígenes fuera de la lista. Probado contra el server con
   `CORS_ORIGIN=http://localhost:3000`: ese origen entra, `https://evil.example` → 403 sin
   `Allow-Origin` (también en el preflight), sin `Origin` entra.
7. [ ] **Caddy**: `request_body max_size`, `header_up X-Real-IP {remote_host}`, HSTS (sección 3.5).
   **Archivo hecho (2026-10-03), falta el VPS:** `deploy/Caddyfile` tiene `request_body max_size
   16KB`, `header_up X-Real-IP {remote_host}` (sin esto los límites por IP de A4 se esquivan), HSTS
   (1 año), `nosniff`, `-Server` y 404 a `/health/full` (listo para M7). Falta en el VPS: poner el
   dominio real, `caddy validate` (Caddy no está instalado en la máquina de desarrollo: no se validó)
   y mirar los headers con `curl -I` (pasos en la skill `despliegue`).
8. [ ] **VPS**: usuario sin privilegios para el proceso; `ufw default deny incoming`, permitir sólo
   22/80/443; SSH sólo con llave (`PasswordAuthentication no`); actualizaciones automáticas
   (`unattended-upgrades`); `HOST=127.0.0.1`; Node 22 (B8). **En el repo (2026-10-03):**
   `engines.node >= 22.0.0` en el `package.json` raíz; el resto es configurar la máquina.
9. [ ] **Cliente**: `NEXT_PUBLIC_SERVER_URL=wss://game.tudominio.com` en Production **y** Preview;
   comprobar en el navegador que el socket es `wss://` y el matchmaking `https://`.

### Fase 1 – Primera semana

10. [ ] **M7**: `/health` mínimo público; detalle con token o sólo local.
11. [ ] **M8 / backups**: `PLAYER_DATA_FILE=/var/lib/montevideo-world/players.json` (dir 0700, archivo
    0600, dueño el usuario del servicio); `writeFile(..., { mode: 0o600 })`. Backup **cada hora**
    copiando el archivo (la escritura atómica garantiza que la copia es consistente) a otro lugar
    (`restic`/`rclone` a un bucket con cifrado), retención 48 horarios + 30 diarios. **Probar una
    restauración** antes de necesitarla.
12. [ ] **M6**: headers en `next.config.ts` con CSP en `Report-Only`; a la semana, CSP definitiva.
13. [ ] **M10**: log `[Admin]` de cada comando y acción de admin, y del `join` (IP, clave nueva o
    conocida, hash corto).
14. [ ] **Logs y monitoreo**: `pm2 install pm2-logrotate` (tamaño y retención); chequeo externo de
    `/health` cada minuto (UptimeRobot, Healthchecks.io o similar) con aviso por mail/Telegram;
    alertas por `grep` (o Loki/Grafana más adelante) de `[RateLimit]`, `[Métricas]`,
    `[PlayerStore] no se pudo escribir` y reinicios de PM2 (`pm2 status` → `restarts`).
15. [ ] **Dependencias**: Dependabot (o `npm audit --omit=dev` en CI) y revisar mensualmente; anotar
    que el aviso de `nanoid` (B7) es conocido y no aplica.

### Fase 2 – Antes de crecer

16. [ ] **M1**: no persistir claves nuevas intactas; límite de claves nuevas por IP.
17. [ ] **M3**: un `findPath` por jugador por tick; tope de nodos del BFS.
18. [ ] **M4**: normalización de nombres (NFKC, sin `\p{Cf}`), nombres reservados por esqueleto,
    nombres únicos entre conectados; lo mismo para nombres de mascotas.
19. [ ] **M8**: indexar `players.json` por `sha256(clave)`.
20. [ ] **M9 / B4**: ban por nombre con vencimiento y aviso de a cuántas claves toca; `/silenciar`;
    bloquear jugadores en el cliente.
21. [ ] **B1, B2, B5, B6, B9**: arreglos chicos (lookups con `Object.hasOwn`, logs escapados,
    `x-powered-by`, cortes por punto de código).

### Fase 3 – Cuentas

22. [ ] Supabase + Google (sección 5): reemplaza la clave del navegador, el admin por clave, el JSON y
    los bans por nombre.

## 5. Qué depende de tener cuentas (Supabase)

El plan de cuentas y base de datos está en
[`supabase-base-de-datos-y-auth.md`](./supabase-base-de-datos-y-auth.md); acá sólo qué hallazgos
resuelve y qué tiene que tener en cuenta:

| Hallazgo | Hoy (transitorio) | Con cuentas |
| --- | --- | --- |
| C1 admin | Hash de la clave en `ADMIN_KEY_HASHES` | Rol en la base ("Admin por rol", sección 2 de ese doc). |
| Robo de la clave (M8, I3) | Hash en el archivo, CSP, TLS | JWT de Supabase verificado en `onAuth` (sección 2, "Flujo"); la clave del navegador sólo sirve para vincular la primera vez. Revocar sesiones = cerrar sesión en Supabase. |
| M1 crecimiento del JSON | No guardar claves intactas | Postgres (sección 3 y 4); un registro por cuenta, no por navegador. |
| M4 nombres | Normalización y reservados | Nombre único por cuenta ("Nombre", sección 2), validado en la base con la misma normalización. |
| M9 bans | Por clave + nombre con vencimiento | Por cuenta (`0002_bans_y_auditoria.sql`); evadirlos requiere otra cuenta de Google. |
| M10 auditoría | Log `[Admin]` | Tabla de auditoría (`0002_bans_y_auditoria.sql`). |
| M8 backups | `restic` del JSON | Backups/PITR de Supabase (igual conviene un `pg_dump` propio). |
| B4 spam | Cooldown y `/silenciar` | Límites y reportes por cuenta. |

Dos cosas de este doc que **también aplican al plan de Supabase**:

- **A2** sigue existiendo con cuentas: "una sesión por cuenta" (sección 4.5 de ese doc) tiene que
  cerrar la sesión vieja con `closeSession` (descartar sus mensajes y cortar el socket), no sólo con
  `client.leave`, o la duplicación por intercambio sigue igual.
- **M2**: si un crash deja a dos jugadores guardados en momentos distintos, un intercambio puede
  duplicar. Con la base, guardar a **los dos** participantes en la misma transacción al cerrar el
  intercambio (ese doc ya lo lista entre los momentos de escritura).
- La `SUPABASE_SERVICE_ROLE_KEY` (o la que use el server) va sólo en el entorno del VPS: nunca en
  `NEXT_PUBLIC_*` ni en un `.env` versionado (A1).
