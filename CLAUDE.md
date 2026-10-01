# Montevideo World — Documentación viva

MMORPG web 2.5D con vista isométrica estilo Habbo. **v1 = prueba de concepto**: conectarse por
WebSocket, aparecer en un barrio de Montevideo (**Ciudad Vieja** al entrar; también **Tres Cruces**, con
viaje entre barrios desde la lista M), caminar haciendo clic en el piso (sincronizado en tiempo real) y chatear con globos
de texto sobre la cabeza del avatar. Hay bancos donde sentarse (clic) y una mochila con ropa
para ponerse/sacarse, más una barra de acceso rápido, dinero, tiendas y la primera actividad:
**pescar** en la Escollera Sarandí (con cañas de distinto nivel). Teclas: **M** lista de barrios, **H** mochila, **C** comandos, **Tab** jugadores
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
├── docs/                     # docs de trabajo en .md: pending/ (por hacer) y finished/ (hechos)
├── package.json              # workspaces + scripts orquestadores
├── tsconfig.base.json        # strict, experimentalDecorators, useDefineForClassFields:false
├── deploy/
│   ├── ecosystem.config.cjs  # PM2 para el VPS
│   └── Caddyfile             # TLS + proxy WSS
├── packages/shared/          # @montevideo-world/shared (compila a dist/ con tsc, CommonJS + .d.ts)
│   └── src/
│       ├── index.ts          # entrada "@montevideo-world/shared": SIN dependencias de runtime
│       ├── appearance.ts     # aspecto elegible: sexo, piel, pelo, color (paletas, random/sanitizeAppearance)
│       ├── commands.ts       # catálogo de comandos de chat (COMMANDS: nombre, uso, rol) + parseCommand
│       ├── constants.ts      # ROOM_NAME, tamaños de tile, STEP_MS, límites de chat…
│       ├── cities/           # barrios ("ciudades") como datos
│       │   ├── types.ts       # TileChar, CityDefinition, Landmark, PlaceLabel
│       │   ├── layoutBuilder.ts # arma layouts por capas (calles, plazas, agua → rambla automática)
│       │   ├── ciudadVieja.ts # layout, spawn y edificios emblemáticos de Ciudad Vieja
│       │   ├── tresCruces.ts  # Tres Cruces: shopping/terminal, Sanatorio Americano, Obelisco, Parque Batlle
│       │   └── index.ts       # CITIES, SPAWN_CITY_ID, getCity
│       ├── map.ts            # CityMap (caminables, spawn, findPath BFS 8 dir.) + getCityMap(id)
│       ├── items.ts          # catálogo: CLOTHING + FISH + RODS + BOXES (ITEMS, bestRod, rollLoot, STARTER_INVENTORY…)
│       ├── haggle.ts         # regatear al vender: haggleChance, maxHagglePrice (tope 5×)
│       ├── fishing.ts        # probabilidades por caña: catchWeight, fishChances, rareChance, rodPerks
│       ├── messages.ts       # MessageType + DTOs (Move, Chat, Sit, Equip, Inventory, Wallet, Shop, Fish…)
│       ├── money.ts          # STARTING_MONEY ($100), MAX_MONEY, isValidAmount, formatMoney
│       ├── sanitize.ts       # sanitizeName / sanitizeChat (mismas reglas en cliente y server)
│       ├── stamina.ts        # MAX_STAMINA, costos (caminar/pescar), recuperación, EXHAUSTED_RECOVERY
│       ├── time.ts           # hora del juego: darknessAt (curva de luz), formatClock, CLOCK_PRESETS
│       ├── weevils.ts        # picudo rojo: constantes (velocidad, alcance, picadura, recompensa…)
│       ├── trade.ts          # intercambio: TradeOffer, normalizeTradeOffer, changeOfferQuantity, límites
│       └── schema/           # entrada "@montevideo-world/shared/schema"
│           ├── Player.ts     # sessionId, name, color, gender/skin/hairColor/hairStyle, x, y, sitting, fishing, rod, ropa
│           ├── Weevil.ts     # picudo rojo: x, y (tiles con decimales), mode, targetId, bites
│           └── GameState.ts  # players, weevils (MapSchema), minuteOfDay (hora del juego)
├── apps/server/              # @montevideo-world/server
│   └── src/
│       ├── index.ts          # Express + CORS + http.Server + Colyseus Server
│       ├── env.ts            # carga apps/server/.env; ADMIN_NAME, DAY_LENGTH_MINUTES
│       ├── gameClock.ts      # reloj del juego global (hora = tiempo real transcurrido × velocidad)
│       ├── inventory.ts      # Inventory: casilleros con pilas (add/remove/canAdd/restore), sólo server
│       ├── playerStore.ts    # progreso por clave secreta en un JSON (mochila, plata, ropa) + sesiones activas
│       ├── wallet.ts         # Wallet: saldo con credit/debit validados, sólo server
│       ├── commands/         # un archivo por comando de chat (help, post, box) + registro en index.ts
│       ├── fishing.ts        # rollCatch(rod): qué pica con esa caña (0, 1 o 2 peces) y cuánto tarda
│       ├── stamina.ts        # Stamina: energía con decimales y estado "agotado", sólo server
│       ├── weevils.ts        # WeevilManager: salen de palmeras, persiguen al más cercano, pican, mueren
│       ├── trades.ts         # TradeManager (invitaciones e intercambios) + executeTrade/clampOffer
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
        │   ├── JoinScreen.tsx # nombre + creador de personaje (sexo, piel, pelo, color, dado) y conexión
        │   ├── AvatarPreview.tsx # vista previa SVG del avatar (misma geometría que Avatar.ts)
        │   ├── PhaserGame.tsx # monta/desmonta Phaser (seguro con StrictMode)
        │   ├── Hud.tsx        # barra de info con íconos: nombre, barrio, dinero, online, Barrios, Mochila, Salir
        │   ├── CityMenu.tsx   # lista de barrios (tecla M / Esc) con botón "Ir" para viajar
        │   ├── TravelOverlay.tsx # pantalla del viaje: ómnibus andando + barra de progreso (5 s)
        │   ├── Backpack.tsx   # mochila: ropa puesta + grilla de casilleros con pilas ×N (tecla H / Esc)
        │   ├── Hotbar.tsx     # barra de acceso rápido 1–9 (se arma arrastrando ítems de la mochila)
        │   ├── CommandsPanel.tsx # ayuda de comandos (tecla C): sólo los que tu rol puede usar
        │   ├── ShopPanel.tsx  # panel de tienda: Comprar / Vender
        │   ├── PlayersPanel.tsx # jugadores conectados en el barrio (tecla Tab / Esc)
        │   ├── PlayerMenu.tsx # menú al hacer clic en otro jugador: Saludar / Intercambiar
        │   ├── TradeInvites.tsx # invitaciones a intercambiar recibidas (Aceptar / Rechazar)
        │   ├── TradePanel.tsx # modal del intercambio: ofertas de los dos, plata y aceptar
        │   ├── FishingWidget.tsx # Pescar (F) / espera / resultado, sólo parado en la escollera
        │   ├── Notices.tsx    # avisos breves del server para el jugador (p. ej. "estás agotado")
        │   ├── AdminPanel.tsx # sólo admin (tecla P): mover el reloj del juego
        │   ├── Announcement.tsx # anuncio del admin (/post) en el medio de la pantalla
        │   ├── BoxReveal.tsx  # lo que salió de una caja sorpresa, en el medio de la pantalla
        │   ├── ItemIcon.tsx   # ícono SVG de cada prenda según su style y su color
        │   ├── UiIcon.tsx     # íconos SVG de interfaz (HUD, títulos): user, pin, moneyBag, map, backpack…
        │   └── ChatBox.tsx    # historial + input (overlay abajo a la derecha)
        ├── lib/
        │   ├── network.ts     # Client de Colyseus, joinCity → CitySession, bindRoomMessages, sendEquip
        │   ├── hotbar.ts      # barra rápida: localStorage + datos de drag & drop
        │   ├── playerKey.ts   # clave secreta del jugador en localStorage (con ella el server guarda su progreso)
        │   ├── itemActions.ts # qué hace cada tipo de ítem al usarlo desde la barra (1–9)
        │   └── eventBus.ts    # EventBus tipado React ↔ Phaser (sin Phaser, apto SSR)
        └── game/
            ├── createGame.ts  # new Phaser.Game + escena
            ├── iso.ts         # tileToWorld / worldToTile / tileDiamond / isoPoint (con altura)
            ├── color.ts       # shade()
            ├── city/
            │   ├── IsoPainter.ts   # cajas, caras, ventanas, arcos, techos, cúpulas en coords de tile
            │   ├── buildings.ts    # PieceSpec + casas, árboles, palmeras, bancos, tiendas (SHOP_STYLES por tipo)
            │   ├── landmarks.ts    # dibujo de cada edificio emblemático (por LandmarkKind)
            │   ├── CityRenderer.ts # hornea piso/edificios a texturas, profundidad, transparencia, carteles
            │   └── DayNight.ts     # velo de atardecer/noche según la hora + halos de luz (farola, faroles…)
            ├── scenes/CityScene.ts  # barrio, clic (caminar / sentarse), cámara que sigue al avatar (zoom con la rueda), sync de Schema
            └── objects/
                ├── Weevil.ts      # picudo rojo dibujado (patitas, mordisco, patas arriba al morir)
                ├── Avatar.ts      # avatar procedural (cuerpo completo, ropa redibujable, gorros,
                │                  # vista frente/espalda, sentado), interpolación, caminata, nombre y globo
                └── avatarLook.ts  # AvatarLook desde el aspecto del Schema + Outfit (ropa del Schema)
```

## Flujo de red

1. `JoinScreen` → `joinCity(name, appearance)` → `client.joinOrCreate("city", { name, cityId: SPAWN_CITY_ID, appearance })`.
   El aspecto (sexo, piel, pelo, color) se arma en la pantalla de ingreso (🎲 = `randomAppearance`) y
   se recuerda en `localStorage` (`mw:appearance`). El server lo valida con `sanitizeAppearance`
   (si no es válido sortea uno) y lo copia al Schema (`gender`, `skin`, `hairColor`, `hairStyle`,
   `color`): todos ven igual a cada jugador. El nombre sobre la cabeza va en `Player.color`.
   Siempre se entra a **Ciudad Vieja**. Las salas se separan por `cityId` (`filterBy`); un `cityId`
   desconocido hace fallar `onCreate`.
2. `CityRoom.onJoin` crea un `Player` en un tile caminable al azar de `spawnArea` (Plaza Independencia)
   y avisa a los demás por chat de sistema.
   **Progreso guardado.** El navegador genera una clave secreta (`lib/playerKey.ts`, `mw:playerKey`
   en localStorage) y la manda en `JoinOptions.playerKey`. Con ella el server guarda en
   `playerStore` (archivo JSON, `PLAYER_DATA_FILE`) la mochila, la plata y la ropa puesta: al
   salir, cada `SAVE_INTERVAL_MS` (15 s) y al apagar (`gameServer.onShutdown` → `flush`). Al entrar
   con una clave conocida se restaura todo (validando ítems, cantidades y montos); sin clave, kit
   inicial. En localStorage vive **sólo la clave**, nunca el progreso, así no se puede editar desde
   la consola. Una clave = una sesión: si entra de nuevo (otra pestaña), `activeSessions` cierra la
   vieja con código 4001 después de guardarla. El nombre y el aspecto se recuerdan en el navegador
   (`mw:name`, `mw:appearance`) y vienen prellenados en `JoinScreen`.
3. Clic en el piso → `room.send("move", { x, y })` → el server valida, calcula camino (`findPath`) y
   cada `STEP_MS` (250 ms) avanza un tile a cada jugador → el Schema replica `x/y` a todos.
4. `CityScene` escucha `onAdd / onChange / onRemove` del Schema e interpola cada avatar a velocidad
   constante hacia su tile (llega justo en `STEP_MS`, así se ve fluido aunque el server sea por tiles).
5. Clic en un banco → `room.send("sit", { x, y })` → el server camina al jugador hasta el tile de
   enfrente (`CityMap.benchApproach`) y, un tick después de llegar, si el banco sigue libre, lo pone en
   el tile del banco con `sitting = true`. Cualquier `move` lo levanta. La orientación sentada sale del
   banco (`CityMap.benchAt`), no del Schema.
6. Mochila. Un jugador nuevo aparece con el `STARTER_KIT` **puesto** (1 remera, 1 short, chancletas)
   y en la mochila el `STARTER_INVENTORY` (la caña básica). La mochila es estado **privado** de la Room (`Inventory`, `INVENTORY_CAPACITY`
   casilleros; prendas iguales se apilan hasta `MAX_STACK`): no va en el Schema. El cliente la pide con
   `inventory:get` después de registrar su handler (en `bindRoomMessages`) y el server responde, y
   reenvía tras cada cambio, con `client.send("inventory", …)` sólo al dueño → EventBus
   `inventory:update`.
   `room.send("equip", { slot, itemId })` saca la prenda de la mochila y la pone (lo que estaba puesto
   vuelve a la mochila; si no entra, no cambia nada); `itemId: null` guarda lo puesto en la mochila.
   Lo puesto (`hat/top/bottom/shoes`) sí va en el Schema: todos lo ven; la escena reemite la ropa propia
   a React con `player:outfit`.
   Barra rápida (1–9): guarda **ids** de ítems, no ítems; es preferencia de UI y vive en
   `localStorage` (`lib/hotbar.ts`), no en el server. Se arrastra desde la mochila (HTML5 drag & drop),
   se reordena arrastrando entre casilleros y se saca arrastrando afuera o con clic derecho. Qué hace
   cada ítem al activarlo está en un solo lugar, `lib/itemActions.ts` (`itemAction`): ropa →
   ponérsela/sacársela (`equip`); caña → pescar/recoger (como F); pescado → comerlo (`fish:eat`,
   recupera `fishStamina(dificultad)` = 10…30 de energía); caja → abrirla. Lo que ya no tenés (ni
   en la mochila ni puesto) se saca solo de la barra y el casillero queda libre; se espera
   `HOTBAR_CLEANUP_MS` (1 s) sin cambios porque al ponerse/sacarse algo la mochila y la ropa
   llegan por separado.
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
   **Regatear** (sólo al vender): `shop:haggle { shopId, itemId, price }`, todo o nada. Se puede pedir
   entre `sellPrice + 1` y `maxHagglePrice` (5×); la tienda acepta con `haggleChance` =
   `(sellPrice / price)^1,2` (la misma fórmula que muestra el panel). Si acepta se cobra `price`; si
   no, el ítem se pierde igual y no se cobra nada. Con exponente > 1, en promedio regatear rinde un
   poco menos que vender normal: es una apuesta, no una forma de farmear plata.
   Ciudad Vieja tiene la **Ropería Sarandí** (26,19) junto a la peatonal, que vende todo el catálogo,
   y **Pesca Sarandí** (7,25), sobre la rambla frente a la escollera, que vende las cañas y compra las
   usadas (`buys: ["rod"]`). El edificio de cada tienda sale de `Shop.building` (`ShopBuilding`):
   para un tipo nuevo, sumar su estilo en `SHOP_STYLES` (`buildings.ts`).
9. Pesca. La Escollera Sarandí son tiles `TileChar.Jetty` ("E", caminables) que entran en el río;
   `CityMap.canFishAt` = parado en la escollera. Para pescar hace falta una **caña** (`RodItem`,
   `category: "rod"`) en la mochila: se usa siempre la de mayor `tier` (`bestRod`). Hay 4 (`RODS`:
   básica, fibra, carbono, profesional); cada una define `rareBoost` (el peso de cada pez se
   multiplica por `(1 + rareBoost)^(dificultad−1)`), `nothingChance`, `doubleChance` (segundo pez
   cuando pica) y `waitFactor`. Las probabilidades se calculan en shared (`fishChances`), así la
   tienda y la mochila muestran lo mismo que sortea el server. `fish:cast` → el server valida (en la
   escollera, sin camino pendiente, sin estar pescando, con caña), sortea con `rollCatch(rod)` y pone
   `player.fishing = true` y `player.rod` (Schema: los demás ven la caña de su color). Manda
   `fish:started { durationMs }` (más largo cuanto más difícil el pez) y al vencer el timer
   (`this.clock.setTimeout`) agrega los peces a la mochila y manda `fish:result { itemIds }`. Moverse, sentarse, ir a una tienda, salir o `fish:stop` cancelan
   (`stopFishing`). Peces de dificultad ≥ 4 se anuncian en el chat. Los peces (`FISH`: pejerrey… corvina
   negra) son ítems `category: "fish"`: no se ponen; se comen desde la barra rápida o se venden a precio completo
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
   Comando de chat **`/post <mensaje>`** (sólo admin): se publica en presence (`ANNOUNCEMENT_TOPIC`)
   y **cada sala de todos los barrios** lo reenvía como `announcement` → `Announcement.tsx` lo
   muestra en el medio de la pantalla ("AGOSHO: hola que tal").
12. Jugadores: clic sobre otro avatar (`Avatar.containsWorldPoint`, no se camina) → la escena emite
   `player:click` → `PlayerMenu`. **Saludar** = `greet { targetId }`: el server lo publica como
   mensaje de chat propio ("👋 ¡Hola, X!", con el cooldown del chat). **Intercambiar** =
   `trade:request` → al otro le llega `trade:invite` (vence en `TRADE_INVITE_MS`; si los dos se
   invitan, arranca directo) → `trade:respond { fromId, accept }`. Con el intercambio abierto
   (`TradeManager`, uno por jugador) cada uno manda su oferta completa con `trade:offer { items,
   money }` (sólo de la mochila: lo puesto no se intercambia); cualquier cambio de oferta **anula las
   dos aceptaciones**. Cuando los dos mandan `trade:accept`, `executeTrade` simula con copias de las
   mochilas (que tengan lo ofrecido, que entre lo que reciben, tope de plata) y recién ahí aplica.
   Si la mochila o la plata cambian durante el intercambio, `clampOffer` recorta la oferta.
   El server manda `trade:state` (a cada uno desde su lado) y `trade:closed` al terminar; salir de
   la sala cancela. Con un intercambio abierto, React no abre otros paneles ni atajos.
13. Comandos de chat. Todo mensaje que empieza con `/` es un comando y **no va al chat**:
   `handleChat` → `runCommand` (`commands/index.ts`) lo parsea (`parseCommand`), lo busca en
   `COMMANDS` (shared), chequea el rol (`user` o `admin`, contra `player.admin`) y llama a su handler.
   Las respuestas son `notice` privados. Los handlers sólo usan `CommandHost` (avisar, dar ítems,
   anunciar), no el estado privado de la sala. Comandos: `/help` (lista los que podés usar),
   `/post <mensaje>` (admin), `/box [cantidad]` (admin, 1–10 cajas sorpresa a la mochila propia) y
   `/plata <monto> [jugador]` (admin: carga plata a un jugador del barrio por nombre, sin distinguir
   mayúsculas y con espacios; sin nombre, a uno mismo; acepta "1.000"). El HUD tiene el botón
   **Comandos (C)** → `CommandsPanel`, que lista desde `COMMANDS` sólo los que tu rol puede usar.
14. Cajas sorpresa (`BoxItem`, `category: "box"`, en `BOXES`). Se consiguen con `/box` y se pasan
   por intercambio; no se compran ni venden. En la mochila: clic, o arrastrarla y soltarla fuera del
   panel → `box:open { itemId }` → el server sortea el premio con `rollLoot` (pesos de `loot`; la de
   peces suma 100 = %), consume la caja, agrega el premio (si no entra, no se abre) y manda
   `box:opened` → `BoxReveal`. Premios de dificultad ≥ 4 se anuncian en el chat.
15. Picudo rojo (sólo en palmeras, `TileChar.Palm`). Clic en una palmera (o en sus hojas: se
   buscan palmeras hasta 2 tiles en diagonal) → `palm:shake { x, y }` → el server camina al jugador
   hasta pegarse (`approachTile`) y la sacude: `WeevilManager.shake` larga 2–4 picudos (cada palmera
   espera `PALM_COOLDOWN_MS`; tope `MAX_WEEVILS` por sala). Viven en el Schema (`state.weevils`):
   los ve todo el barrio. El server los mueve cada 100 ms: persiguen al jugador **más cercano**
   dentro de `WEEVIL_AGGRO_RANGE` (no al que sacudió; cambian de objetivo si otro queda más cerca),
   pican a `WEEVIL_BITE_RANGE` (−`WEEVIL_BITE_STAMINA` de energía, `bites++` → "-2" en todos los
   clientes) y, sin nadie cerca o pasado `WEEVIL_LIFETIME_MS`, vuelven a la palmera. Clic en un
   picudo (tiene prioridad sobre todo) → `weevil:kick { id }`: si está a `WEEVIL_KICK_RANGE` muere
   (`mode = "dead"`, "¡Plaf!"), el que pateó cobra `WEEVIL_REWARD` y su `player.kicks++` anima la
   patada del avatar en todos los clientes.
16. Chat → `room.send("chat", { text })` → el server sanitiza, aplica cooldown y hace
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
| `NEXT_PUBLIC_SERVER_URL` | `ws://<host de la página>:2567` | URL WebSocket del servidor. Sin definir, usa el mismo host que la página (`getServerUrl`), así se puede jugar desde otras compus de la red local entrando por `http://<ip>:3000`. En producción **debe ser `wss://`** (el sitio en Vercel es https). Se inlinea en build: cambiarla requiere redeploy. |

### Servidor (entorno del proceso; ver `apps/server/.env.example`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `2567` | Puerto HTTP/WS |
| `HOST` | `0.0.0.0` | Interfaz. Detrás de un reverse proxy usar `127.0.0.1` |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas (`https://montevideo-world.vercel.app,http://localhost:3000`). Aplica a Express **y** a `/matchmake/*` de Colyseus |
| `NODE_ENV` | — | `production` en el VPS (lo setea `npm start`) |
| `ADMIN_NAME` | — | Nombre con el que se entra como **admin** (sin distinguir mayúsculas). Local: `AGOSHO`. Vacío = sin admin |
| `DAY_LENGTH_MINUTES` | `24` | Minutos reales que dura un día del juego (24 → 1 hora del juego por minuto real) |
| `PLAYER_DATA_FILE` | `apps/server/data/players.json` | Archivo donde se guarda el progreso de cada jugador (mochila, plata, ropa). Está en `.gitignore`. En el VPS conviene una ruta fuera del repo y con backup |

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
   `player:stamina`, `notice`, `player:admin`, `city:clock`, `announcement`, `player:click`,
   `trade:invite`, `trade:state`, `trade:closed`, `box:opened`). Para un evento nuevo, agregalo a
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
- Tres Cruces (60×46): manzanas con **edificios en altura** (`TileChar.Tower` → `towerSpec`) y casas
  sobre el borde (`LayoutBuilder.edges`), Bulevar Artigas y Av. Italia, el Shopping (con la
  terminal y la tienda `building: "none"` "Moda Tres Cruces"), el Sanatorio Americano, el Obelisco y
  el Parque Batlle con el Velódromo y el Estadio Centenario (óvalos con gradas: `drawBowl`).
- Antes de `scatter` de árboles, poner `Plaza` bajo el área de cada emblemático: si no, le crecen
  árboles adentro.
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
3. Aparece solo en la lista (tecla M, sólo nombres) con su botón **Ir · $52**. Viajar cuesta un
   boleto de STM (`TRAVEL_FARE`): `travel:request { cityId }` → el server cobra, guarda el progreso
   y emite un boleto (`travelTickets`, vence en `TRAVEL_TICKET_MS`) → `travel:ok` → `App.travel`
   sale de la sala y `travelTo(cityId)` entra a la del destino con el mismo nombre, aspecto y clave.
   Mientras tanto se ve `TravelOverlay` (ómnibus de STM animado en SVG/CSS); el viaje dura como
   mínimo `TRAVEL_MS` (5 s) aunque el server responda antes.
   `CityRoom.onJoin` rechaza entrar a un barrio que no sea el de spawn sin boleto vigente para ese
   barrio (y lo consume): no se puede viajar gratis pidiendo otra sala desde el cliente. Sin clave
   (navegador sin almacenamiento) no se puede viajar.
4. Si tiene un cartel "MW" (`logoSign`), sumar el punto del techo de su tipo en `ROOF_SPOTS`.

## Cómo agregar un mensaje nuevo (receta)

1. `packages/shared/src/messages.ts`: agregar la clave en `MessageType` y su DTO.
2. `apps/server/src/rooms/CityRoom.ts`: `this.onMessage(MessageType.X, (client, msg: unknown) => …)` con type guard.
3. Si el server responde con un broadcast: registrarlo en `bindRoomMessages` y reemitir por el EventBus.
4. `npm run typecheck`.

## Cómo agregar un comando de chat (receta)

1. `packages/shared/src/commands.ts`: sumarlo a `COMMANDS` (`name`, `usage`, `description`, `role`).
2. `apps/server/src/commands/<nombre>.ts`: exportar un `CommandHandler` (`({ client, player, args, rest }, host) => …`).
3. `apps/server/src/commands/index.ts`: agregarlo a `HANDLERS` (el `Record<CommandName, …>` no compila si falta).
4. Si necesita algo nuevo de la sala, sumarlo a `CommandHost` (`commands/types.ts`) e implementarlo en `CityRoom.commandHost`.

Aparece solo en `/help` para quien lo pueda usar.

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

- Sin cuentas: el progreso queda atado a la clave del navegador (borrar los datos del sitio o cambiar
  de navegador = empezar de cero). Persistencia en un archivo JSON: alcanza para una instancia; con
  más jugadores, pasar a una base de datos.
- Sin colisión entre avatares; el pathfinding sólo esquiva tiles no caminables del barrio.
- Zoom con la rueda del mouse (0,5× a 2×, se recuerda en `mw:zoom`). Las texturas horneadas se
  ven un poco suaves al acercar al máximo.
- Tres tiendas (ropa y pescadería); el stock es infinito y los precios son fijos.
- Pesca sin minijuego: el resultado se sortea al tirar y sólo hay que esperar. La caña no se
  gasta ni se rompe. Todavía no hay
  forma de conseguir prendas nuevas (el resto del catálogo existe pero nadie lo tiene).
- Dos barrios (Ciudad Vieja y Tres Cruces). Al entrar siempre se aparece en Ciudad Vieja; al viajar,
  en la zona de spawn del destino.
- Al entrar al juego siempre se aparece en Ciudad Vieja (el server exige boleto para los demás
  barrios). Quien queda en otro barrio sin $52 puede salir y volver a entrar.
- Avatares dibujados con primitivas (4 orientaciones por espejado: frente/espalda × izq/der; de espaldas
  sólo mientras camina, al llegar queda de frente). El aspecto se elige al entrar y no se puede cambiar
  después sin reconectar. Próximo paso: spritesheets de 8 direcciones.
- Sin predicción de movimiento en el cliente (con latencia alta el propio avatar arranca con delay).
- Sin reconexión automática (`room.reconnectionToken` + `allowReconnection` en el server).
