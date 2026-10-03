---
paths:
  - "apps/server/src/trades.ts"
  - "apps/server/src/rooms/systems/trading.ts"
  - "apps/server/src/rooms/systems/social.ts"
  - "packages/shared/src/trade.ts"
  - "apps/client/src/features/players/PlayerMenu.tsx"
  - "apps/client/src/features/trade/TradePanel.tsx"
  - "apps/client/src/features/trade/TradeInvites.tsx"
  - "apps/client/src/features/players/PlayersPanel.tsx"
---

# Jugadores: saludar e intercambiar

Jugadores: clic sobre otro avatar (`Avatar.containsWorldPoint`, no se camina) → la escena emite
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
