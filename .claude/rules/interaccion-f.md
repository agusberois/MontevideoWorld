---
paths:
  - "apps/client/src/game/scenes/CityScene.ts"
  - "apps/client/src/ui/InteractPrompt.tsx"
  - "apps/client/src/lib/gameActions.ts"
  - "packages/shared/src/map.ts"
---

# Interactuar con F (sin mouse)

Qué hay en cada tile del mapa lo dice **`CityMap.interactionAt(x, y)`** (shared): `{ kind, target, area }`
con `kind` = parada, tienda, palmera, banco o piso, en ese orden de prioridad (con `palmReach`, el clic
en las hojas también encuentra la palmera). La escena lo usa igual para el hover (`HOVER_COLORS[kind]`
sobre `area`), el clic y la F (`interactionsAround`: lo de los 8 tiles pegados), y lo que hace cada
`kind` está en un solo `switch` (`CityScene.describe`). **Para algo nuevo del mapa** (puertas,
carteles, cajeros…): sumar su `kind` a `MapInteraction` y a `interactionAt`; TypeScript pide después
su color en `HOVER_COLORS` y su caso en `describe`, y si se usa con F, ponerlo en `NEARBY_PRIORITY`.
Picudos y jugadores no son del mapa (se mueven): los resuelve la escena antes (clic en tu propio
avatar = tus detalles, ver `jugadores-e-intercambio.md`).

`CityScene.findInteraction` busca, desde el tile del avatar propio según el server (cada
`INTERACT_CHECK_MS`), con qué puede interactuar, en este orden: **levantarse** del banco, **patear**
un picudo a `WEEVIL_KICK_RANGE`, **entrar** a una tienda pegada (`isNearShop`), **tomar el ómnibus**
en una parada vecina, **sentarse** en un banco vecino libre, **sacudir** una palmera vecina y
**hablar** con un jugador vecino (abre su menú). Avisa a React con `interact:prompt` →
`InteractPrompt` (cartel "F · Sentarse", que también se toca en celulares). La F (`pressF` en App):
si estás pescando o vendiendo lo corta; si hay algo al lado, interactúa (`interact:use`, la escena
vuelve a buscar en ese momento y ejecuta la misma acción que el clic: `sitOn`, `visitShop`,
`shakePalm`, `goToBusStop`, `openPlayerMenu`, `kickWeevil`); si no, pesca o vende. Con algo al lado
los widgets de pesca / venta no muestran la F (`keyHint`). Así se juega todo con WASD + F.
