# Montevideo World — Documentación viva

MMORPG web 2.5D con vista isométrica estilo Habbo. **v1 = prueba de concepto**: conectarse por
WebSocket, aparecer en un barrio de Montevideo (por ahora sólo **Ciudad Vieja**, con sus edificios
emblemáticos), caminar haciendo clic en el piso (sincronizado en tiempo real) y chatear con globos
de texto sobre la cabeza del avatar. Hay bancos donde sentarse (clic) y una mochila con ropa
para ponerse/sacarse, más una barra de acceso rápido, dinero, tiendas y la primera actividad:
**pescar** en la Escollera Sarandí. Teclas: **M** lista de barrios, **H** mochila, **Tab** jugadores
del barrio, **F** pescar, **1–9** barra rápida, **Esc** cierra.

> Mantené este archivo actualizado cuando cambien la arquitectura, los comandos o las convenciones.

## Stack

| Capa | Tecnología |
| --- | --- |
| Monorepo | npm workspaces, TypeScript 5.9 |
| Cliente (`apps/client`) | Next.js 16 (App Router, Turbopack), React 19, Phaser 3.90, colyseus.js 0.16 |
| Servidor (`apps/server`) | Node.js ≥ 20.9, Colyseus 0.16 (`@colyseus/core` + `@colyseus/ws-transport`), Express 5, cors |
| Compartido (`packages/shared`) | `@colyseus/schema` 3, constantes, mapa, pathfinding, DTOs de mensajes |

Colyseus está fijado en **0.16** porque es la última línea compatible con `colyseus.js`
(desde 0.17 el SDK cliente pasó a `@colyseus/sdk`). Migrar implica actualizar server + client + schema juntos.

## Estructura

```
.
├── CLAUDE.md
├── package.json              # workspaces + scripts orquestadores
├── tsconfig.base.json        # strict, experimentalDecorators, useDefineForClassFields:false
├── deploy/
│   ├── ecosystem.config.cjs  # PM2 para el VPS
│   └── Caddyfile             # TLS + proxy WSS
├── packages/shared/          # @montevideo-world/shared (compila a dist/ con tsc, CommonJS + .d.ts)
│   └── src/
│       ├── index.ts          # entrada "@montevideo-world/shared": SIN dependencias de runtime
│       ├── constants.ts      # ROOM_NAME, tamaños de tile, STEP_MS, límites de chat…
│       ├── cities/           # barrios ("ciudades") como datos
│       │   ├── types.ts       # TileChar, CityDefinition, Landmark, PlaceLabel
│       │   ├── layoutBuilder.ts # arma layouts por capas (calles, plazas, agua → rambla automática)
│       │   ├── ciudadVieja.ts # layout, spawn y edificios emblemáticos de Ciudad Vieja
│       │   └── index.ts       # CITIES, SPAWN_CITY_ID, getCity
│       ├── map.ts            # CityMap (caminables, spawn, findPath BFS 8 dir.) + getCityMap(id)
│       ├── items.ts          # catálogo: CLOTHING + FISH (ITEMS, getClothing, sellPrice, STARTER_KIT…)
│       ├── messages.ts       # MessageType + DTOs (Move, Chat, Sit, Equip, Inventory, Wallet, Shop, Fish…)
│       ├── money.ts          # STARTING_MONEY ($100), MAX_MONEY, isValidAmount, formatMoney
│       ├── sanitize.ts       # sanitizeName / sanitizeChat (mismas reglas en cliente y server)
│       ├── stamina.ts        # MAX_STAMINA, costos (caminar/pescar), recuperación, EXHAUSTED_RECOVERY
│       ├── time.ts           # hora del juego: darknessAt (curva de luz), formatClock, CLOCK_PRESETS
│       └── schema/           # entrada "@montevideo-world/shared/schema"
│           ├── Player.ts     # sessionId, name, color, x, y (tile), sitting, hat/top/bottom/shoes
│           └── GameState.ts  # players: MapSchema<Player>, minuteOfDay (hora del juego)
├── apps/server/              # @montevideo-world/server
│   └── src/
│       ├── index.ts          # Express + CORS + http.Server + Colyseus Server
│       ├── env.ts            # carga apps/server/.env; ADMIN_NAME, DAY_LENGTH_MINUTES
│       ├── gameClock.ts      # reloj del juego global (hora = tiempo real transcurrido × velocidad)
│       ├── inventory.ts      # Inventory: casilleros con pilas (add/remove/canAdd), sólo server
│       ├── wallet.ts         # Wallet: saldo con credit/debit validados, sólo server
│       ├── fishing.ts        # rollCatch: qué pica (por catchWeight) y cuánto tarda
│       ├── stamina.ts        # Stamina: energía con decimales y estado "agotado", sólo server
│       └── rooms/CityRoom.ts # una sala por barrio (filterBy cityId): join/leave, move, chat, sit, equip, tick
└── apps/client/              # @montevideo-world/client
    ├── vercel.json           # install/build desde la raíz del monorepo
    ├── public/mw-logo.svg    # logo "MW": favicon (metadata.icons), pantalla de ingreso y cartel en el juego
    ├── AGENTS.md / CLAUDE.md # generados por `next dev` (reglas de Next 16 para agentes): commitearlos
    ├── .env.local.example
    └── src/
        ├── app/              # layout.tsx, page.tsx, globals.css
        ├── components/
        │   ├── App.tsx        # máquina de estados: JoinScreen ↔ juego
        │   ├── JoinScreen.tsx # pide nombre y abre la conexión
        │   ├── PhaserGame.tsx # monta/desmonta Phaser (seguro con StrictMode)
        │   ├── Hud.tsx        # barra de info con íconos: nombre, barrio, dinero, online, Barrios, Mochila, Salir
        │   ├── CityMenu.tsx   # lista de barrios (tecla M / Esc)
        │   ├── Backpack.tsx   # mochila: ropa puesta + grilla de casilleros con pilas ×N (tecla H / Esc)
        │   ├── Hotbar.tsx     # barra de acceso rápido 1–9 (se arma arrastrando prendas)
        │   ├── ShopPanel.tsx  # panel de tienda: Comprar / Vender
        │   ├── PlayersPanel.tsx # jugadores conectados en el barrio (tecla Tab / Esc)
        │   ├── FishingWidget.tsx # Pescar (F) / espera / resultado, sólo parado en la escollera
        │   ├── Notices.tsx    # avisos breves del server para el jugador (p. ej. "estás agotado")
        │   ├── AdminPanel.tsx # sólo admin (tecla P): mover el reloj del juego
        │   ├── Announcement.tsx # anuncio del admin (/post) en el medio de la pantalla
        │   ├── ItemIcon.tsx   # ícono SVG de cada prenda según su style y su color
        │   ├── UiIcon.tsx     # íconos SVG de interfaz (HUD, títulos): user, pin, moneyBag, map, backpack…
        │   └── ChatBox.tsx    # historial + input (overlay abajo a la derecha)
        ├── lib/
        │   ├── network.ts     # Client de Colyseus, joinCity → CitySession, bindRoomMessages, sendEquip
        │   ├── hotbar.ts      # barra rápida: localStorage + datos de drag & drop
        │   └── eventBus.ts    # EventBus tipado React ↔ Phaser (sin Phaser, apto SSR)
        └── game/
            ├── createGame.ts  # new Phaser.Game + escena
            ├── iso.ts         # tileToWorld / worldToTile / tileDiamond / isoPoint (con altura)
            ├── color.ts       # shade()
            ├── city/
            │   ├── IsoPainter.ts   # cajas, caras, ventanas, arcos, techos, cúpulas en coords de tile
            │   ├── buildings.ts    # PieceSpec + casas de relleno, árboles, palmeras, bancos, tienda
            │   ├── landmarks.ts    # dibujo de cada edificio emblemático (por LandmarkKind)
            │   ├── CityRenderer.ts # hornea piso/edificios a texturas, profundidad, transparencia, carteles
            │   └── DayNight.ts     # velo de atardecer/noche según la hora + halos de luz (farola, faroles…)
            ├── scenes/CityScene.ts  # barrio, clic (caminar / sentarse), cámara que sigue al avatar, sync de Schema
            └── objects/
                ├── Avatar.ts      # avatar procedural (cuerpo completo, ropa redibujable, gorros,
                │                  # vista frente/espalda, sentado), interpolación, caminata, nombre y globo
                └── avatarLook.ts  # piel/pelo determinísticos por sessionId + Outfit (ropa del Schema)
```

## Flujo de red

1. `JoinScreen` → `joinCity(name)` → `client.joinOrCreate("city", { name, cityId: SPAWN_CITY_ID })`.
   Siempre se entra a **Ciudad Vieja**. Las salas se separan por `cityId` (`filterBy`); un `cityId`
   desconocido hace fallar `onCreate`.
2. `CityRoom.onJoin` crea un `Player` en un tile caminable al azar de `spawnArea` (Plaza Independencia)
   y avisa a los demás por chat de sistema.
3. Clic en el piso → `room.send("move", { x, y })` → el server valida, calcula camino (`findPath`) y
   cada `STEP_MS` (250 ms) avanza un tile a cada jugador → el Schema replica `x/y` a todos.
4. `CityScene` escucha `onAdd / onChange / onRemove` del Schema e interpola cada avatar a velocidad
   constante hacia su tile (llega justo en `STEP_MS`, así se ve fluido aunque el server sea por tiles).
5. Clic en un banco → `room.send("sit", { x, y })` → el server camina al jugador hasta el tile de
   enfrente (`CityMap.benchApproach`) y, un tick después de llegar, si el banco sigue libre, lo pone en
   el tile del banco con `sitting = true`. Cualquier `move` lo levanta. La orientación sentada sale del
   banco (`CityMap.benchAt`), no del Schema.
6. Mochila. Un jugador nuevo aparece con el `STARTER_KIT` **puesto** (1 remera, 1 short, chancletas)
   y la mochila vacía. La mochila es estado **privado** de la Room (`Inventory`, `INVENTORY_CAPACITY`
   casilleros; prendas iguales se apilan hasta `MAX_STACK`): no va en el Schema. El cliente la pide con
   `inventory:get` después de registrar su handler (en `bindRoomMessages`) y el server responde, y
   reenvía tras cada cambio, con `client.send("inventory", …)` sólo al dueño → EventBus
   `inventory:update`.
   `room.send("equip", { slot, itemId })` saca la prenda de la mochila y la pone (lo que estaba puesto
   vuelve a la mochila; si no entra, no cambia nada); `itemId: null` guarda lo puesto en la mochila.
   Lo puesto (`hat/top/bottom/shoes`) sí va en el Schema: todos lo ven; la escena reemite la ropa propia
   a React con `player:outfit`.
   Barra rápida (1–9): guarda **ids** de prendas, no prendas; es preferencia de UI y vive en
   `localStorage` (`lib/hotbar.ts`), no en el server. Se arrastra desde la mochila (HTML5 drag & drop),
   se reordena arrastrando entre casilleros y se saca arrastrando afuera o con clic derecho. Al
   activarla: si la prenda está puesta → `equip(slot, null)`; si está en la mochila → `equip(slot, id)`.
   Los íconos de prendas son SVG por `style` pintados con `item.color` (`ItemIcon.tsx`): al agregar
   un `ItemStyle` nuevo, dibujarlo ahí y en `Avatar.ts`.
7. Dinero. Saldo en pesos **enteros**, autoritativo y **privado** como la mochila: `Wallet` por jugador
   en la Room (arranca en `STARTING_MONEY` = $100), no va en el Schema. El cliente lo pide con
   `wallet:get` (en `bindRoomMessages`) y el server lo manda sólo al dueño con `wallet` → EventBus
   `wallet:update` → HUD (`formatMoney`, "$1.250"). Para tiendas: `wallet.debit(precio)` / `credit`
   devuelven false sin tocar nada si el monto es inválido, no alcanza o pasa `MAX_MONEY`; después de
   cada operación llamar `sendWallet(client)` (y `sendInventory` si cambió la mochila).
8. Tiendas (`CityDefinition.shops`: área cuadrada no caminable + `stock`). Clic en la tienda →
   `shop:visit { x, y }` → el server camina al jugador a un tile pegado (`CityMap.shopApproach`) y al
   llegar le manda `shop:open { shopId }` (sólo a él) → React abre `ShopPanel`. `shop:buy` / `shop:sell
   { shopId, itemId }` exigen estar pegado a la tienda (`isNearShop`); comprar cobra `item.price` si
   alcanza y hay lugar en la mochila; vender paga `sellPrice` (mitad) por prendas **de la mochila** (lo
   puesto no se vende). El server responde `shop:result { ok, text }` y reenvía saldo e inventario.
   Ciudad Vieja tiene la **Ropería Sarandí** (26,19) junto a la peatonal, que vende todo el catálogo.
9. Pesca. La Escollera Sarandí son tiles `TileChar.Jetty` ("E", caminables) que entran en el río;
   `CityMap.canFishAt` = parado en la escollera. `fish:cast` → el server valida (en la escollera, sin
   camino pendiente, sin estar pescando), sortea con `rollCatch` (20 % nada; si no, por `catchWeight`)
   y pone `player.fishing = true` (Schema: los demás ven la caña). Manda `fish:started { durationMs }`
   (más largo cuanto más difícil el pez) y al vencer el timer (`this.clock.setTimeout`) agrega el pez
   a la mochila y manda `fish:result`. Moverse, sentarse, ir a una tienda, salir o `fish:stop` cancelan
   (`stopFishing`). Peces de dificultad ≥ 4 se anuncian en el chat. Los peces (`FISH`: pejerrey… corvina
   negra) son ítems `category: "fish"`: no se ponen ni van a la barra rápida; se venden a precio completo
   en la **Pescadería del Mercado** (tienda `building: "none"` sobre el área del Mercado del Puerto,
   `buys: ["fish"]`), que además vende todas las especies con recargo (`FISH_BUY_MARKUP` = 1,5×).
   Las tiendas sólo compran las categorías de su `buys`. Precios: `buyPrice(item)` (lo que cobra la
   tienda) y `sellPrice(item)` (lo que paga); el server cobra/paga siempre con esas funciones.
10. Stamina (energía 0–100). La lleva el server (`Stamina` en la Room, con decimales) y copia el valor
   redondeado a `player.stamina` (Schema) → la escena emite `player:stamina` → barra en el HUD. Se
   calcula en el tick de `stepPlayers`: cada paso gasta `WALK_STAMINA_COST`, tirar la línea
   `FISH_STAMINA_COST`; quieto (sin camino y sin pescar) recupera `IDLE_STAMINA_REGEN`/s y sentado en un
   banco `SIT_STAMINA_REGEN`/s. Si una acción no alcanza queda **agotado**: se frena y no puede caminar
   ni pescar hasta recuperar `EXHAUSTED_RECOVERY` (si no, cada tick de descanso daría para un paso
   más). El aviso llega con `notice` (mensaje privado) → `Notices`.
11. Hora del juego y admin. `gameClock` (server, global para todos los barrios) avanza solo; cada sala
   copia el minuto del día a `state.minuteOfDay` una vez por segundo. El cliente escucha ese campo:
   `DayNight` calcula la oscuridad con `darknessAt` (oscurece 18:00–20:30 con tono cálido, aclara
   06:00–07:30) y la anima suave; el HUD muestra la hora (`city:clock`). Al entrar, si el nombre
   coincide con `ADMIN_NAME`, `player.admin = true` (nombre con ★ en naranja y botón **Admin (P)**).
   `admin:time { minuteOfDay }` mueve el reloj (sólo admins; se anuncia en el chat) y desde ahí sigue.
   Comando de chat **`/post <mensaje>`** (sólo admin, se detecta en `handleChat`): no va al chat; se
   publica en presence (`ANNOUNCEMENT_TOPIC`) y **cada sala de todos los barrios** lo reenvía como
   `announcement` → `Announcement.tsx` lo muestra en el medio de la pantalla ("AGOSHO: hola que tal").
   Un no-admin que lo usa recibe un `notice` y no se publica nada.
12. Chat → `room.send("chat", { text })` → el server sanitiza, aplica cooldown y hace
   `broadcast("chat", ChatBroadcastMessage)` → `ChatBox` lo agrega al historial y `CityScene`
   muestra el globo sobre la cabeza durante `CHAT_BUBBLE_MS`.

El servidor es **autoritativo**: el cliente nunca escribe posiciones, sólo pide intenciones.
En v1 no hay predicción del lado del cliente ni colisiones entre avatares.

## Comandos

Todos desde la raíz:

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala todos los workspaces |
| `npm run dev` | Compila `shared` y levanta en paralelo: `tsc --watch` (shared), `tsx watch` (server :2567), `next dev` (client :3000) |
| `npm run build` | Build completo: shared → server → client |
| `npm run build:shared` | Sólo `packages/shared` → `dist/` |
| `npm run build:server` | shared + server (usar en el VPS) |
| `npm run build:client` | shared + client (lo usa Vercel) |
| `npm run start:server` | `node apps/server/dist/index.js` en modo producción |
| `npm run start:client` | `next start` (sólo para probar el build localmente) |
| `npm run typecheck` | `tsc --noEmit` en server y client |
| `npm run clean` | Borra `dist/` y `.next/` |

Por workspace: `npm run <script> -w @montevideo-world/server` (o `@montevideo-world/client`, `@montevideo-world/shared`).

`shared` se consume **compilado** (`dist/`). Si ves `Cannot find module '@montevideo-world/shared'`,
corré `npm run build:shared`.

## Variables de entorno

### Cliente (`apps/client/.env.local`, y en Vercel → Project Settings → Environment Variables)

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | `ws://localhost:2567` | URL WebSocket del servidor. En producción **debe ser `wss://`** (el sitio en Vercel es https). Se inlinea en build: cambiarla requiere redeploy. |

### Servidor (entorno del proceso; ver `apps/server/.env.example`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `2567` | Puerto HTTP/WS |
| `HOST` | `0.0.0.0` | Interfaz. Detrás de un reverse proxy usar `127.0.0.1` |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas (`https://montevideo-world.vercel.app,http://localhost:3000`). Aplica a Express **y** a `/matchmake/*` de Colyseus |
| `NODE_ENV` | — | `production` en el VPS (lo setea `npm start`) |
| `ADMIN_NAME` | — | Nombre con el que se entra como **admin** (sin distinguir mayúsculas). Local: `AGOSHO`. Vacío = sin admin |
| `DAY_LENGTH_MINUTES` | `24` | Minutos reales que dura un día del juego (24 → 1 hora del juego por minuto real) |

El server carga `apps/server/.env` al arrancar (`src/env.ts`, importado primero en `index.ts`, con
`process.loadEnvFile`). Lo que ya venga del entorno (shell, PM2, systemd) tiene prioridad. `.env` está
en `.gitignore`; la plantilla es `apps/server/.env.example`.

> **Ojo con el admin:** no hay cuentas ni contraseñas, así que cualquiera que entre con el nombre de
> `ADMIN_NAME` es admin. Antes de abrir el server al público, sumar una clave de admin (también en `.env`).

## Convenciones de código

- TypeScript `strict` en todo el repo. Nada de `any` en código nuevo; los payloads de red llegan
  como `unknown` al server y se validan con type guards (`isMoveMessage`, `isChatMessage`).
- Todo lo que cliente y servidor deben acordar (nombres de mensajes, tamaños, tiempos, mapa, reglas
  de sanitizado) vive en `packages/shared`. **Nunca** strings mágicos como `"move"`: usar `MessageType.Move`.
- `@montevideo-world/shared` (entrada raíz) no puede importar `@colyseus/schema` ni nada con efectos:
  la usa también el bundle del navegador. Los Schemas van en `@montevideo-world/shared/schema`.
- El cliente importa Schemas **sólo como tipo** (`import type { GameState } from "@montevideo-world/shared/schema"`):
  colyseus.js decodifica el estado por reflexión.
- Schemas: decoradores `@type(...)` con `experimentalDecorators: true` y
  **`useDefineForClassFields: false`** (si no, los campos pisan los setters de Colyseus y no se sincroniza nada).
- Phaser se importa como `import * as Phaser from "phaser"` (el build ESM no tiene default export)
  y **sólo** desde `src/game/**`, cargado con `import()` dinámico desde `PhaserGame.tsx`. Desde
  componentes React, únicamente `import type`.
- Archivos: componentes React en PascalCase (`ChatBox.tsx`), módulos en camelCase (`eventBus.ts`).
  Textos de UI en español rioplatense.
- Estado sólo de servidor (caminos, cooldowns) va en campos privados de la Room, no en el Schema.

## Manejo de estado: ¿dónde vive cada cosa?

| Tipo de estado | Dueño | Cómo se lee | Cómo se modifica |
| --- | --- | --- | --- |
| Mundo sincronizado (jugadores, posiciones, nombres, colores) | **Colyseus Schema** (`GameState`) en el server | Phaser: `getStateCallbacks(room)` → `onAdd/onChange/onRemove` | Sólo el server. El cliente envía intenciones (`room.send`) |
| Eventos efímeros de red (chat) | **Mensajes Colyseus** (`broadcast` / `onMessage`) | `bindRoomMessages` en `lib/network.ts` (único `onMessage` por tipo) los reemite al EventBus | `room.send(MessageType.Chat, …)` |
| UI (input del chat, historial, pantalla de login, HUD) | **React** (`useState`) | Componentes | Handlers de React |
| Render/animación (posición interpolada, globos, hover) | **Phaser** (GameObjects) | La escena | `update()` / tweens |
| Puente React ↔ Phaser | **EventBus** (`lib/eventBus.ts`) | `eventBus.on(...)` (devuelve un `off`) | `eventBus.emit(...)` |

Reglas:

1. **El Schema es la única fuente de verdad del mundo.** React no copia posiciones a su estado;
   Phaser no inventa posiciones (sólo interpola hacia las del Schema).
2. **React no conoce Phaser y Phaser no conoce React.** Se hablan sólo por eventos tipados en
   `GameEvents` (`chat:message`, `players:list`, `player:self`, `player:outfit`, `inventory:update`,
   `wallet:update`, `shop:open`, `shop:result`, `fishing:status`, `fishing:started`, `fishing:result`,
   `player:stamina`, `notice`, `player:admin`, `city:clock`, `announcement`). Para un evento nuevo, agregalo a
   esa interfaz primero.
3. Cada suscripción devuelve su función de limpieza y **se libera** (cleanup de `useEffect`,
   `dispose()` de la escena en `SHUTDOWN`/`DESTROY`). Así StrictMode y el hot reload no duplican handlers.
4. Abrir conexiones o crear juegos = efectos con cancelación. La conexión se abre en el submit de
   `JoinScreen` (event handler, no efecto) para que StrictMode no conecte dos veces; `PhaserGame`
   usa un flag `cancelled` + `game.destroy(true)` para no duplicar el canvas.

## Barrios (ciudades) y mapa

- Un barrio es un `CityDefinition` en `packages/shared/src/cities/`: `layout` (un carácter por tile,
  ver `TileChar`), `spawnArea`, `landmarks` y `placeLabels`. Ejes: **x = oeste→este, y = norte→sur**.
- Caminable = `WALKABLE_TILE_CHARS` (rambla, calle, peatonal, plaza, pasto) **menos** el área de los
  `landmarks` (salvo sus `passable`, p. ej. el arco de la Puerta de la Ciudadela) y los `benches`.
  Los bancos miran al sur o al este (hacia la cámara) para que se vea de frente a quien se sienta. Lo calcula `CityMap`,
  que usan igual el server (validar movimiento, pathfinding, spawn) y el cliente (hover/clic).
- Diseño de Ciudad Vieja: manzanas como **parques de pasto caminable** con pocas casas sueltas y
  árboles (sólo donde no cortan el paso); los edificios emblemáticos son los protagonistas.
- Logo: `CityDefinition.logoSign = { landmarkId }` pone el cartel "MW" sobre el techo de ese edificio
  emblemático (en Ciudad Vieja, el **Cabildo**). El punto del techo de cada tipo está en `ROOF_SPOTS`
  (`landmarks.ts`, coordenadas del dibujo base; se escala con el edificio) y el nombre del edificio se
  sube por encima del cartel. La escena carga `/mw-logo.svg` en `preload` (`LOGO_TEXTURE`).
- Render (`game/city/`): cada volumen se dibuja con `IsoPainter` y se **hornea una vez a textura**
  (`generateTexture`); piezas iguales comparten textura. Las áreas de un solo volumen deben ser
  **cuadradas**: así un único depth `(x + w - 1 + y) * TILE_HEIGHT/2 + 1` ordena bien contra los avatares
  (depth = y de los pies). Áreas alargadas se parten en piezas 1×1 (ver `gatePieces`).
- Cada dibujo de landmark está escrito para un tamaño base; si el `area` es más grande se escala al
  hornear (`PieceSpec.scale`): crece en planta y en altura sin pixelarse.
- Sólo se ven las caras **sur** (izquierda) y **este** (derecha): las fachadas importantes van ahí.
- Los edificios que tapan al avatar propio se vuelven translúcidos (`updateOcclusion`). Nombre y globo
  del avatar viven en un overlay por encima de todo.

### Agregar un barrio

1. Crear `packages/shared/src/cities/<barrio>.ts` (usar `LayoutBuilder`) y sumarlo a `CITIES`.
2. Si tiene un tipo de edificio nuevo: agregarlo a `LandmarkKind` y dibujarlo en `landmarks.ts`.
3. Aparece solo en la lista (tecla M). Viajar entre barrios todavía no existe: hay que agregar un
   mensaje/flujo que salga de la sala actual y haga `joinOrCreate` con el nuevo `cityId`.

## Cómo agregar un mensaje nuevo (receta)

1. `packages/shared/src/messages.ts`: agregar la clave en `MessageType` y su DTO.
2. `apps/server/src/rooms/CityRoom.ts`: `this.onMessage(MessageType.X, (client, msg: unknown) => …)` con type guard.
3. Si el server responde con un broadcast: registrarlo en `bindRoomMessages` y reemitir por el EventBus.
4. `npm run typecheck`.

## Despliegue

### Cliente → Vercel

1. Importar el repo en Vercel. **Root Directory: `apps/client`** (Framework: Next.js; dejar activado
   "Include files outside the root directory").
2. `apps/client/vercel.json` ya define `installCommand: cd ../.. && npm ci` y
   `buildCommand: cd ../.. && npm run build:client` (compila `shared` antes que Next).
3. Variable de entorno `NEXT_PUBLIC_SERVER_URL=wss://game.tudominio.com` (Production y Preview).
4. Deploy. Requiere `package-lock.json` commiteado en la raíz.

### Servidor → VPS (Ubuntu/Debian)

```bash
# Node 22 + PM2 + Caddy
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
sudo apt install -y caddy

git clone <repo> montevideo-world && cd montevideo-world
npm ci
npm run build:server
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup   # seguir la instrucción que imprime

# TLS/WSS: editar el dominio en deploy/Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

- DNS: registro A `game.tudominio.com` → IP del VPS. Abrir puertos 80/443 (no hace falta exponer 2567).
- Verificar: `curl https://game.tudominio.com/health`.
- Actualizar: `git pull && npm ci && npm run build:server && pm2 restart montevideo-world-server`.
- Colyseus guarda las salas en memoria: **una sola instancia** (`instances: 1`). Escalar horizontalmente
  requiere `@colyseus/redis-presence` + `@colyseus/redis-driver`.

## Limitaciones conocidas de v1 / próximos pasos

- Sin autenticación ni persistencia (el nombre es libre, todo se pierde al reiniciar).
- Sin colisión entre avatares; el pathfinding sólo esquiva tiles no caminables del barrio.
- Sin zoom: la cámara sigue al avatar propio a escala 1.
- Inventario y dinero sin persistencia: al reconectar se vuelve a aparecer con el kit inicial y $100.
  Dos tiendas (ropa y pescadería); el stock es infinito y los precios son fijos.
- Pesca sin minijuego: el resultado se sortea al tirar y sólo hay que esperar. Todavía no hay
  forma de conseguir prendas nuevas (el resto del catálogo existe pero nadie lo tiene).
- Los rasgos físicos (piel/pelo) salen del `sessionId` y no se eligen.
- Un solo barrio (Ciudad Vieja) y sin viaje entre barrios: la lista (M) es informativa.
- El spawn en Ciudad Vieja lo decide el cliente (`SPAWN_CITY_ID` en `joinCity`); el server acepta
  cualquier `cityId` válido.
- Avatares dibujados con primitivas (4 orientaciones por espejado: frente/espalda × izq/der; de espaldas sólo mientras camina, al llegar queda de frente). El aspecto
  (piel, pelo, pantalón, zapatos) sale del `sessionId`, no es elegible; la remera usa `Player.color`.
  Próximo paso: elegirlo en `JoinScreen` y sincronizarlo en el Schema, o pasar a spritesheets de 8 direcciones.
- Sin predicción de movimiento en el cliente (con latencia alta el propio avatar arranca con delay).
- Sin reconexión automática (`room.reconnectionToken` + `allowReconnection` en el server).
