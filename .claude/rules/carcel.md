---
paths:
  - "apps/server/src/bans.ts"
  - "apps/server/src/rooms/systems/travel.ts"
  - "apps/server/src/commands/ban.ts"
  - "packages/shared/src/jail.ts"
  - "packages/shared/src/cities/comcar.ts"
  - "apps/client/src/features/jail/JailBanner.tsx"
  - "apps/client/src/game/city/landmarks/comcar/**"
---

# Cárcel (COMCAR, `/ban`)

- `/ban <minutos> <jugador>` (admin, hasta `MAX_BAN_MINUTES`; 0 = liberar). `bans.ts` anota hasta
  cuándo por **id** (`playerId` de la clave; va al guardado, `PlayerRecord.jailedUntil`: sigue preso si
  se reinicia el server) y por **nombre** (`nameKey`: también los parecidos), pero el de nombre
  **vence a `NAME_BAN_MAX_MS` (1 h) como mucho**: frena al que vuelve sin clave con el mismo nombre
  sin dejar preso por días a otro que lo use. Quien no tiene clave queda preso 1 h como mucho.
- Desconectado: van presos todos los guardados con ese nombre (`idsByName`). El admin recibe cuántos
  tocó (0: sólo por nombre; más de 1: aviso de que pueden ser personas distintas y cómo deshacerlo) y
  queda `[Ban] "nombre" desconectado → N guardados (ids cortos) hasta …` en el log.
- Conectado: su sala (`jail`, vía `playerDirectory`) le corta lo que hacía, avisa y le manda
  `travel:ok { cityId: JAIL_CITY_ID }`; el cliente viaja solo. Si en `JAIL_TRAVEL_GRACE_MS` sigue
  ahí, se lo desconecta con `JAILED_KICK_CODE`.
- `onJoin`: preso → cualquier barrio que no sea el COMCAR lo rechaza con `ServerError(JAILED_JOIN_CODE)`
  y `joinCity` (cliente) entra entonces al COMCAR. Al COMCAR sólo entran presos o quien trae pase
  (`/trace` del admin). Preso no puede pedir viajes (`TravelRequest` en `systems/travel.ts`).
- En el COMCAR, `updateJail` (cada segundo, desde `syncClock`) copia los segundos que quedan a
  `Player.jailLeft` (→ `player:jail` → `JailBanner` y la lista de barrios; todos le ven el cartel
  "🔒 PRESO", `Avatar.setPrisoner`) y al cumplir (o liberarlo) lo manda a Ciudad Vieja.
- **Visitas**: el COMCAR es un barrio más de la lista (M, "de visita"), con parada y boleto. Es un
  `CityDefinition` con `prison: { yard }`: los presos aparecen en el patio (`CityMap.prisonTiles`),
  encerrados por el muro; los que llegan en ómnibus aparecen en `spawnArea`, la explanada de afuera,
  y se van cuando quieren. El muro sur es una reja (`TileChar.Fence`, `fenceSpec`, se ve a través):
  desde afuera se ve el patio. No hay camino entre los dos lados. Banear a alguien que está de visita
  lo mete en el patio (`teleport`). Clic en un preso → **Burlarse** (`taunt { targetId }`: sólo si
  vos no estás preso; sale en el chat una burla al azar, con el cooldown del chat).
- No sale en la landing (`!city.prison`). Muro = `TileChar.Wall` (`wallSpec`), pabellones
  `cellBlock` y garitas `watchtower` (`landmarks/comcar/`).
