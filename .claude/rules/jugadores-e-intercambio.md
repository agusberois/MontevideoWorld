---
paths:
  - "apps/server/src/trades.ts"
  - "apps/server/src/rooms/systems/trading.ts"
  - "apps/server/src/rooms/systems/social.ts"
  - "packages/shared/src/trade.ts"
  - "apps/client/src/features/players/PlayerMenu.tsx"
  - "apps/client/src/features/players/PlayerDetails.tsx"
  - "apps/client/src/features/join/AvatarPreview.tsx"
  - "apps/client/src/features/trade/TradePanel.tsx"
  - "apps/client/src/features/trade/TradeInvites.tsx"
  - "apps/client/src/features/players/PlayersPanel.tsx"
---

# Jugadores: menú, detalles, saludar e intercambiar

Jugadores: clic sobre un avatar (`CityScene.playerAt` con `Avatar.containsWorldPoint`, el de más
adelante; no se camina; los picudos van antes y los gestos de cámara no son clic). Sobre **otro** →
la escena emite `player:click` → `PlayerMenu` (Saludar, Intercambiar, Burlarse si está preso,
Detalles del jugador, Bloquear). Sobre **el propio** → `player:details` → directo a tus detalles.

**Detalles del jugador** = panel registrado `playerDetails` (`PlayerDetails.tsx`; `openPlayerDetails(id)`
guarda `detailsId` en el store y no abre nada con un intercambio en curso; Esc y clic afuera
cierran; si el jugador se va del barrio, se cierra solo). Los datos salen de `players` del store:
`PlayerSummary` (`lib/eventBus.ts`) lleva **sólo lo público del Schema** (aspecto, ropa, admin,
donador, mascota, condena, qué hace con qué caña/carrito, energía); la escena lo arma en
`summarize` y vuelve a mandar `players:list` sólo si algo de eso cambió (caminar no). Lo privado
(plata, hambre, salud) se muestra únicamente en tus detalles, desde el store; nunca de otro. El
avatar se dibuja en SVG con `AvatarPreview` (el mismo de `JoinScreen`, con `outfit`): las mismas
formas que el juego (`lib/avatar/head.ts` y `clothing.ts`), sin dibujo propio. La fila **Barra** dice "Sin barra" hasta que existan las barras
(campo `barra?` de `PlayerDetailsData`, ver `docs/pending/funcionalidades-primera-version.md` §2.2).
De otro jugador tiene los botones Saludar, Intercambiar y Bloquear / Desbloquear.

 **Saludar** = `greet { targetId }`: el server lo publica como
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
