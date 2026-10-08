---
paths:
  - "apps/server/src/commands/**"
  - "apps/server/src/directory.ts"
  - "apps/server/src/rooms/systems/social.ts"
  - "packages/shared/src/commands.ts"
  - "packages/shared/src/sanitize.ts"
  - "apps/client/src/features/chat/ChatBox.tsx"
  - "apps/client/src/features/chat/CommandsPanel.tsx"
  - "apps/client/src/features/boxes/BoxReveal.tsx"
---

# Chat, comandos de chat y cajas sorpresa

**"Escribiendo" (💬 sobre la cabeza)**: con el foco en el chat y algo escrito que no sea un comando
(`/mensaje` es privado), `ChatBox` manda `chat:typing { typing }` al empezar, lo repite cada
`TYPING_REFRESH_MS` y manda `false` al terminar (mandó, borró, perdió el foco, viajó; con la sala
cerrada no manda). El server lo pone en `Player.typing` (Schema: lo ven todos), no a presos ni
silenciados, lo apaga al hablar (`sayAs`) y si no recibe nada en `TYPING_TIMEOUT_MS` (`tickTyping`).
El cliente lo dibuja con `Avatar.setTyping` (💬 compartido con `labelImage`, se mece; con el globo
del chat a la vista se esconde).

Comandos de chat. Todo mensaje que empieza con `/` es un comando y **no va al chat**:
`handleChat` → `runCommand` (`commands/index.ts`) lo parsea (`parseCommand`), lo busca en
`COMMANDS` (shared), chequea el rol (`user` o `admin`, contra `player.admin`) y llama a su handler.
Las respuestas son `notice` privados. Los handlers sólo usan `CommandHost` (avisar, dar ítems,
anunciar), no el estado privado de la sala. Comandos: `/help` (lista los que podés usar),
`/mensaje <jugador> <texto>` (todos: mensaje **privado** a un conectado en cualquier barrio; el
nombre puede tener espacios, se toma el más largo que coincida con un conectado; cada sala anota
a sus jugadores en `playerDirectory` al entrar y los saca al salir, y el destinatario lo recibe por
su sala con `deliverPrivate`. Viaja como `chat` con `kind: "private"` sólo a los dos: al que lo
recibe con `name` = quién lo manda, y al que lo manda una copia con `to`. Sin globo; en el
`ChatBox` se ve en violeta y clic en el nombre deja escrito "/mensaje <nombre> " para responder),
`/seguir [jugador]` (todos: caminás solo detrás de un jugador de la misma sala; sin nombre deja de
seguir; ver `movimiento.md`),
`/post <mensaje>` (admin), `/box [cantidad]` (admin, 1–10 cajas sorpresa a la mochila propia) y
`/plata <monto> [jugador]` (admin: carga plata a un jugador del barrio por nombre, sin distinguir
mayúsculas, tildes ni letras parecidas —`nameKey`, como todas las búsquedas por nombre— y con espacios; sin nombre, a uno mismo; acepta "1.000") y `/donador <si|no> [jugador]`
(admin: marca a un jugador como **donador** del proyecto; entra a las Termas del Donador, y con `no`
estando adentro se lo saca por la puerta) y `/trace <jugador>` (admin: te lleva al
lado de un conectado en cualquier barrio o copia, sin boleto. En la misma sala lo teletransporta
(`teleport`: corta todo y cambia `x/y`; el cliente, ante un salto de más de 2 tiles, aparece sin
caminar). En otra sala emite un pase (`issueTravelTicket` con `near` = el jugador) y `travel:ok`
con `roomId`: el cliente entra con `joinById` a esa copia y `onJoin` lo pone al lado (`tileNear`).
`playerDirectory` guarda `cityId` y la sala (`mailbox.roomId`, `tileOf`, `jail`)) y
`/mover <jugador>` (admin: `/trace` al revés, trae a un conectado al tile del admin; en otra sala
su sala le emite el pase con `at` = ese tile, `PrivateMailbox.summon`; no trae presos ni, a la sala
del Hotel del Donador, a quien no es donador) y
`/god` (admin: modo vuelo para recorrer el mapa rápido; ver "Vuelo" en `movimiento.md`) y
`/ban <minutos> <jugador>` (admin; 0 = liberar, ver `.claude/rules/carcel.md`) y
`/silenciar <minutos> <jugador>` (admin, hasta `MAX_MUTE_MINUTES`, sólo a conectados de cualquier
barrio vía `mailbox.mute`; 0 = levantarlo: `mutes.ts`, por id la condena entera y por nombre como
mucho 1 h, sólo en memoria. Silenciado no sale su chat, `/mensaje`, saludo ni burla; los demás
comandos sí) y `/curar [jugador]` (admin:
energía, hambre y salud al 100; también el botón **Curarme** del panel de Admin). El donador va en el Schema
(`player.donor`) y en el progreso guardado (`PlayerRecord.donor`, así sigue al volver o al viajar):
todos ven un distintivo dorado "♥ DONADOR" arriba de su nombre (`Avatar.setDonor`; el globo de
chat sube para no taparlo) y en la lista de jugadores (Tab). Se puede marcar con el jugador
conectado: la escena escucha el cambio. Sin clave, se ve pero no queda guardado. El HUD tiene el botón
**Comandos (C)** → `CommandsPanel`, que lista desde `COMMANDS` sólo los que tu rol puede usar.
**Autoayuda en el chat** (`ChatBox`, mismo filtro por rol): al escribir `/` aparece la lista de
comandos arriba del input y se va filtrando por lo que se escribe (`/me` → `/mensaje`); ↑ / ↓
eligen, Tab, Enter o clic completan (`/mensaje `), Enter con el comando ya entero lo envía y Esc
cierra la lista. Ya escrito el comando y un espacio, se muestra su `usage` como recordatorio.

Cajas sorpresa (`BoxItem`, `category: "box"`, en `BOXES`). Se consiguen con `/box` y se pasan
por intercambio; no se compran ni venden. En la mochila: clic, o arrastrarla y soltarla fuera del
panel → `box:open { itemId }` → el server sortea el premio con `rollLoot` (pesos de `loot`; la de
peces suma 100 = %), consume la caja, agrega el premio (si no entra, no se abre) y manda
`box:opened` → `BoxReveal`. Premios de dificultad ≥ 4 se anuncian en el chat.

Chat → `room.send("chat", { text })` → el server sanitiza, aplica cooldown y hace
`broadcast("chat", ChatBroadcastMessage)` → `ChatBox` lo agrega al historial y `CityScene`
muestra el globo sobre la cabeza durante `CHAT_BUBBLE_MS`.

**Antispam y bloqueo.** El chat (y `/mensaje`) además del cooldown descarta el **mismo texto** (sin
mayúsculas) si llega a menos de `REPEAT_CHAT_MS` (5 s) del anterior, con aviso. **Bloquear** es del
cliente: botón en el menú del jugador (clic en su avatar) y en la lista (Tab); se guarda en el
navegador (`features/players/blockStorage.ts`, esqueleto `nameKey`) y vive en `gameStore.blocked`.
`bindRoomMessages` (`lib/network.ts`) no reemite al EventBus el chat ni los privados de un bloqueado,
así no llegan ni al `ChatBox` ni al globo; la copia de un privado propio (`to`) siempre pasa.
