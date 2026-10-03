---
paths:
  - "packages/shared/src/weevils.ts"
  - "packages/shared/src/schema/Weevil.ts"
  - "apps/server/src/weevils.ts"
  - "apps/client/src/game/objects/Weevil.ts"
---

# Picudo rojo

Picudo rojo (sólo en palmeras, `TileChar.Palm`). Clic en una palmera (o en sus hojas: se
buscan palmeras hasta 2 tiles en diagonal) → `palm:shake { x, y }` → el server camina al jugador
hasta pegarse (`approachTile`) y la sacude: `WeevilManager.shake` larga 2–4 picudos (cada palmera
espera `PALM_COOLDOWN_MS`; tope `MAX_WEEVILS` por sala). Viven en el Schema (`state.weevils`):
los ve todo el barrio. El server los mueve cada 100 ms: persiguen al jugador **más cercano**
dentro de `WEEVIL_AGGRO_RANGE` (no al que sacudió; cambian de objetivo si otro queda más cerca),
pican a `WEEVIL_BITE_RANGE` (−`WEEVIL_BITE_ENERGY` de energía, `bites++` → "-2" en todos los
clientes) y, sin nadie cerca o pasado `WEEVIL_LIFETIME_MS`, vuelven a la palmera. Clic en un
picudo (tiene prioridad sobre todo) → `weevil:kick { id }`: si está a `WEEVIL_KICK_RANGE` muere
(`mode = "dead"`, "¡Plaf!"), el que pateó cobra `WEEVIL_REWARD` y su `player.kicks++` anima la
patada del avatar en todos los clientes.
