---
paths:
  - "apps/client/src/game/movement.ts"
  - "apps/client/src/game/__sim/**"
  - "apps/client/src/game/objects/Avatar.ts"
  - "apps/client/src/game/scenes/CityScene.ts"
  - "packages/shared/src/map.ts"
  - "apps/server/src/rooms/systems/movement.ts"
---

# Movimiento, predicción y bancos

Clic en el piso → `room.send("move", { x, y })` → el server valida, calcula camino (`findPath`) y
cada `STEP_MS` (250 ms) avanza un tile a cada jugador → el Schema replica `x/y` a todos.

`CityScene` escucha `onAdd / onChange / onRemove` del Schema. Cada `Avatar` recorre una **cola de
tiles** (`pushTile`): interpola cada paso (lerp) en `STEP_MS` y encadena el siguiente con el
tiempo que sobró, sin frenar entre tiles; si la red trae varios juntos se apura un poco
(`CATCH_UP_*`) y si se atrasa demasiado o el tile no es vecino, salta (`snapTo`).
**Predicción del avatar propio** (`game/movement.ts`, `LocalMover`, sin Phaser): al pedir un
destino el cliente **planea el recorrido desde donde el avatar realmente va a estar** (el tile al
que ya está yendo, si es parte de lo predicho; si no, el último tile del server) y lo empieza a
mostrar en el acto, como mucho `MAX_LEAD` tiles por delante de lo que el server confirmó. Le
manda al server **ese mismo recorrido** (`MoveMessage.path`, con el tile donde cree que está el
server al principio); el server lo sigue si es válido paso a paso (`CityMap.followRoute`: desde
donde está, o desde el primer tile vecino si por la latencia se pasó uno; vecinos caminables,
sin cortar esquinas) y si no llega al destino completa con `findPath`. Sigue siendo autoritativo
(un paso por tick, mismas reglas): el recorrido del cliente no da ventaja, sólo hace que los dos
caminen exactamente lo mismo. **Un pedido de camino por tick** (`oncePerTick` en `rooms/session.ts`,
para `move`, `sit`, `palm:shake` y `shop:visit`): el primero de cada tick se resuelve en el acto; los
que llegan después en ese tick no buscan camino, queda el último y `stepPlayers` lo resuelve al
empezar el próximo (`halt` lo descarta). Así un bot a 20 `move`/s hace 4 BFS por segundo, no 20.
Cada tile del server confirma el próximo paso esperado (o el de
después); un tile de más pegado al recorrido se tolera (vuelve solo); otra cosa se corrige
caminando (nunca saltando). Si no confirma nada en `PREDICTION_STALL_MS` (agotado, rechazo) el
avatar vuelve caminando a su posición real. Ir a un banco, tienda, palmera… cancela la
predicción y sigue al server. Probarlo con `npm run sim:movement -w @montevideo-world/client`
(escenarios de teclado y clics + prueba al azar con latencia y jitter: saltos y finales distintos
tienen que dar 0).
Caminar es un toque / clic corto (arrastrar mueve la cámara, ver `apps/client/src/game/CLAUDE.md`) o **WASD** en
escritorio: cada tecla es una dirección de la pantalla (W = arriba = tile (−1,−1) en el mapa
isométrico) y combinadas dan las 8. Manteniendo apretado, `updateWasd` pide ir hasta
`WASD_LOOKAHEAD` tiles en línea recta desde el tile al que ya va (un pedido nuevo cada vez que
avanza o cambia la dirección, así girar no tiene idas y vueltas); si choca, prueba las dos
direcciones vecinas para deslizarse por la pared; al soltar frena en el tile al que ya iba. Un
clic mientras se mantiene WASD manda (la última orden gana) hasta que cambien las teclas. Teclas
físicas (`event.code`), no cuentan escribiendo ni con un panel abierto, y si la cámara estaba
suelta vuelve al avatar.

Clic en un banco → `room.send("sit", { x, y })` → el server camina al jugador hasta el tile de
enfrente (`CityMap.benchApproach`) y, un tick después de llegar, si el banco sigue libre, lo pone en
el tile del banco con `sitting = true`. Cualquier `move` lo levanta. La orientación sentada sale del
banco (`CityMap.benchAt`), no del Schema.
