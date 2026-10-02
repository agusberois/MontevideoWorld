# Escalabilidad y optimización del servidor (`apps/server`)

**Fecha:** 2026-10-02

**Resumen:** con los números de hoy (decenas de jugadores, un proceso), el server sobra: un tick de
movimiento, el pathfinding y los picudos cuestan fracciones de milisegundo. Lo que no escala es
**dónde vive el estado** (un JSON que se reescribe entero y bloquea el proceso, mapas globales en
memoria) y **cómo crece `CityRoom.ts`** (1395 líneas, una sala que hace todo). También hay un tope
de 50 jugadores por sala que parte el barrio en copias que no se ven entre sí. Este doc lista los
puntos por prioridad, con mediciones y una propuesta para cada uno.

## Lo que ya escala bien (no tocar)

- **Server autoritativo con intenciones**: el cliente nunca escribe estado; cada mensaje se valida
  con un type guard. Es la base correcta para cualquier crecimiento.
- **Estado privado fuera del Schema** (mochila, plata, energía, caminos): no se sincroniza de más.
- **`maxPayload` de 4 KB** (default de `@colyseus/ws-transport`): un cliente no puede mandar mensajes
  gigantes. El recorrido de `move` (hasta 512 tiles) entra en ese límite.
- **Reloj del juego sin contador** (`gameClock`): sale de la hora real; no hay que avanzarlo ni guardarlo.
- **Lógica pura en `shared`** (`findPath`, `followRoute`, `fishChances`, `rollLoot`, precios): se puede
  probar sin server y es la misma que muestra el cliente.
- **Escritura atómica del JSON** (archivo temporal + `rename`): si el proceso se corta, no se corrompe.

## Mediciones (MacBook, Node 22)

| Qué | Resultado |
| --- | --- |
| `findPath` (BFS) en Ciudad Vieja, 48×38 | 0,17 ms promedio (camino medio 19 tiles) |
| `findPath` en Tres Cruces, 60×46 | 0,39 ms promedio (camino medio 28 tiles) |
| `getItem` (búsqueda lineal en 35 ítems) | 0,14 µs por llamada |
| Guardar `players.json` con 1.000 jugadores | 1,2 MB · 8 ms con el proceso bloqueado |
| … con 10.000 jugadores | 11,8 MB · **90 ms bloqueado** |
| … con 50.000 jugadores | 59 MB · **~490 ms bloqueado** |

Un tick de movimiento es cada 250 ms y el de picudos cada 100 ms: 90 ms bloqueado ya se nota como
un tirón en todos los barrios a la vez. El pathfinding no es un problema ni con mapas el doble de
grandes (el BFS crece con la superficie: ~1 ms en un mapa de 120×90).

## Puntos a mejorar, por prioridad

### 1. Una sala por barrio de hasta 50: el jugador 51 cae en una copia vacía

`MAX_PLAYERS_PER_ROOM = 50` y las salas se separan por `cityId` (`filterBy`). Cuando una sala de
Ciudad Vieja se llena, Colyseus la bloquea y `joinOrCreate` **crea otra sala de Ciudad Vieja**: los
que entran después no ven a los primeros, aunque `/mensaje` y los anuncios sí les llegan. Tampoco
hay forma de elegir a cuál entrar ni de juntarse con un amigo.

**Propuesta:**

- Corto plazo: definir el tope que de verdad soporta un barrio (con los mapas agrandados, 50–80) y
  mostrar "Ciudad Vieja · 2" en el HUD cuando haya más de una copia, para que no parezca un bug.
- Mediano plazo: al viajar o al entrar, preferir la copia donde está tu amigo / tu grupo
  (`joinById`), y mostrar la ocupación en la lista de barrios (`matchMaker.query`).
- Si se quiere un barrio sin tope: _interest management_ (cada cliente recibe sólo los jugadores
  cercanos, con `StateView` de `@colyseus/schema` 3) en vez de partir en copias. Es un cambio grande:
  sólo si hace falta.

**Hecho, corto plazo (2026-10-02):** `MAX_PLAYERS_PER_ROOM` pasó de 50 a 80 y cada sala sabe qué copia
del barrio es (`GameState.copy`, el número libre más bajo; `openCopies` en `CityRoom.ts`). El HUD
muestra "Ciudad Vieja · 2" con un tooltip que explica que el barrio estaba lleno. Probado con 85 bots
(`colyseus.js` desde Node, contra un server aparte): 80 en la copia 1 y 5 en la copia 2. Con los 80
caminando a la vez, el server usó 3,3 % de CPU en promedio (9 % máx.) y los patches llegaron cada
~250 ms (p99 514 ms). Queda el mediano plazo (elegir la copia de un amigo, ocupación en la lista).

### 2. `playerStore`: un JSON que se reescribe entero y bloquea el proceso

- `saveAllPlayers` corre cada 15 s en **cada sala** y marca para guardar a todos los conectados,
  **cambien o no**: con gente conectada, el archivo se reescribe entero como mínimo cada 15 s.
- `flush` usa `JSON.stringify(…, null, 2)` + `writeFileSync`: el proceso entero (todas las salas)
  queda frenado mientras tanto (ver mediciones).
- El archivo **nunca se limpia**: cada navegador nuevo (cada clave) suma un registro para siempre,
  aunque haya entrado una sola vez.
- Todo vive en memoria del proceso: no hay forma de tener dos procesos.

**Propuesta, en orden:**

1. Ya (barato): guardar sólo lo que cambió (`dirty` por jugador: marcarlo en `Inventory`, `Wallet` y al
   cambiar la ropa), escribir con `fs.promises.writeFile` y sin indentar. Con eso el bloqueo baja a la
   serialización y sólo cuando hubo cambios.
   **Hecho 2.1 (2026-10-02):** `playerStore.set` compara con lo último guardado (huella JSON por
   clave) y, sin cambios, no hace nada; `flush` es asíncrono (`fs/promises`), de a una escritura, sin
   indentar, y avisa en el log si armar el JSON frenó el server más de 50 ms. Probado con un server
   aparte: 50 jugadores quietos durante un ciclo de 15 s → archivo sin tocar; 5 cambios → 5/5
   guardados; cambio + apagado enseguida → guardado. Con 50.000 jugadores guardados, el bloqueo
   pasó de ~490 ms (medido antes: stringify indentado + escritura síncrona) a ~115–140 ms, que es
   armar el JSON. `players.json` ya no viene indentado.
2. Limpiar claves sin actividad (p. ej. 90 días sin `updatedAt` y con el kit inicial intacto): así el
   archivo no crece sin techo y armarlo sigue siendo barato.

### 3. `CityRoom.ts` concentra todo (1395 líneas)

Es el equivalente a lo que era `App.tsx` en el cliente. Una sala maneja movimiento, bancos, tiendas,
regateo, ropa, pesca, venta, picudos, intercambios, admin, maker, viajes, chat y comandos. Cada
feature nueva toca:

- el registro de `onMessage`;
- un `Map` privado nuevo (hoy son 11, más el de intercambios);
- el `onLeave`, para limpiarlo;
- las cancelaciones cruzadas: cada acción repite `pendingSits/Shops/Palms.delete(...)` y
  `stopActivities`;
- un type guard al final del archivo.

**Propuesta:**

- **Estado por jugador en un solo objeto** (`PlayerSession { inventory, wallet, stamina, key, path,
  pending, timers, lastChatAt }`) en vez de 11 `Map` paralelos: `onLeave` borra una entrada y no se
  puede olvidar ninguna.
- **"Lo que va a hacer al llegar" como un solo campo** (`pending: { kind: "sit" | "shop" | "palm", … }`)
  en vez de tres mapas que hay que limpiar a mano en cada handler (hoy se repite en 10 lugares).
  Empalma con `CityMap.interactionAt` (el `kind` es el mismo que ya usa el cliente).
- **Sistemas en archivos** (`rooms/systems/fishing.ts`, `vending.ts`, `shops.ts`, `trades.ts`,
  `admin.ts`, `travel.ts`), cada uno con sus handlers y que reciben la `PlayerSession`, como ya se hizo
  con `commands/`. `CityRoom` queda en ciclo de vida, tick y registro.
- **Registro de mensajes como tabla** (`MessageType → { guard, handler }`), igual que
  `SERVER_MESSAGES` en el cliente. Los type guards (hoy 14 escritos a mano al final del archivo) pasan
  a `shared` junto a cada DTO, así el cliente puede usarlos en tests.

### 4. Sin límite de frecuencia salvo en el chat

Sólo el chat tiene cooldown. Todos los demás mensajes (`move`, `shop:buy`, `box:open`, `trade:offer`,
`admin:nearby:get`…) se procesan sin límite. Cada `move` puede disparar un BFS, y cada operación de
tienda o mochila manda la mochila entera de vuelta. Un cliente modificado que mande cientos de
mensajes por segundo le cuesta CPU y ancho de banda a toda la sala.

**Propuesta:** un _token bucket_ por cliente y por tipo de mensaje en el registro de mensajes
(punto 3). Por ejemplo `move` 20/s, tienda 10/s, el resto 5/s. Lo que pasa del límite se descarta en
silencio, y si se repite mucho, se desconecta. Es un solo lugar si el registro es una tabla.

**Hecho (2026-10-02):** `apps/server/src/rateLimit.ts` (`RateLimiter`, sin Colyseus, con `now`
inyectable): un _token bucket_ por cliente y por tipo. Todos los mensajes de `CityRoom` se registran
con `this.handle(MessageType.X, handler)`, que chequea el límite antes de llamar al handler; los tipos
sin handler caen en `onMessage("*")` y cuentan con el límite por defecto (así un cliente modificado
tampoco llena el log con "onMessage not registered"). Tabla única `MESSAGE_RATE_LIMITS`:

| Mensajes | Sostenido | Ráfaga |
| --- | --- | --- |
| `move` | 20/s | 40 |
| Tienda (`shop:*`), mochila (`inventory:get`, `wallet:get`, `equip`, `fish:eat`, `box:open`), `trade:offer`, `admin:give` | 10/s | 20 |
| El resto (sentarse, pescar, vender, palmeras, picudos, intercambio, viaje, chat, admin…) | 5/s | 10 |

El chat y el saludo conservan además su cooldown. Lo que pasa el límite se descarta en silencio y
suma a un contador de abuso por cliente que baja 20 por segundo: al pasar 1.000 se desconecta al
cliente con código **4002** y un `console.warn` (`[RateLimit] …`). Pasarse por menos de 20 mensajes/s
nunca desconecta. El estado del cliente se libera en `onLeave`. Probado con un server aparte y 50
bots (uno con pedidos tipo WASD, un tile cada 250 ms con su recorrido, y otro con 5 clics por
segundo): **0 descartados**. 30 `move`/s durante 20 s: ~145 de 585 descartados, sigue conectado.
Spam de `move` a ~450/s: desconectado a los ~2,5 s; spam de `shop:buy` + `box:open` (~370/s entre
los dos): desconectado a los ~3,2 s. Durante el spam, el server en 2,5–5 % de CPU (máx. 12 %) y el
tick de jugadores en 0,2–0,5 ms de promedio. Con reloj simulado: 12 `move`/s durante 60 s más una
ráfaga de 30 → 0 descartados; 25/s durante 5 min → descarta ~5/s y no desconecta; 500/s → desconecta
a los 2,3 s. La tabla es holgada; si aparece un uso legítimo que la toque, se ve en `/health`
(`rateLimited` por sala).

### 5. Mensajes privados de más: mochila entera en cada cambio

`sendInventory` manda la mochila completa (hasta 20 casilleros) en cada cambio, y a veces dos veces en
el mismo tick: al terminar una pesca, `finishAttempt` la manda y `resolveCatch` la vuelve a mandar.
Además cada envío llama a `revalidateTrade`.

**Propuesta:** marcar "mochila / plata cambió" y mandar una sola vez al final del tick (o del
handler). Es chico hoy (~1 KB) pero se multiplica con la cantidad de jugadores y features.

### 6. Estado global en memoria del proceso

`playerDirectory`, `activeSessions`, `travelTickets` y `gameClock` viven en variables del módulo.
Funciona con una instancia (y está documentado), pero:

- `travelTickets` **nunca borra** los boletos que no se usaron (vencidos se quedan en el `Map`). Es una
  fuga chica pero sin techo. Hay que limpiar los vencidos al emitir uno nuevo.

  **Hecho (2026-10-02):** `issueTravelTicket` (`playerStore.ts`) borra los vencidos cada vez que
  emite uno (hay como mucho uno por clave y duran 30 s: recorrerlos es nada). `/health` muestra
  cuántos hay (`store.travelTickets`). Probado: 3 boletos comprados y sin usar, 32 s después se
  compra otro → queda 1.
- Para escalar a varios procesos hay que mover directorio, sesiones y boletos a **presence**
  (`RedisPresence`) y el matchmaking a `RedisDriver`. Mientras haya un proceso, no
  hace falta: un proceso Node con Colyseus aguanta del orden de cientos a pocos miles de jugadores
  con esta carga.

### 7. Ajustes chicos de rendimiento (hacerlos al pasar)

- **Picudos**: `host.players()` arma un array nuevo con todos los jugadores **por cada picudo, cada
  100 ms** (24 picudos × 50 jugadores = 1.200 objetos 10 veces por segundo). Armarlo una vez por tick.
  Además, con 0 picudos el intervalo corre igual: no cuesta casi nada, pero se puede saltear.
- **Patch rate**: Colyseus manda cambios cada 50 ms (20 por segundo), pero los jugadores se mueven
  cada 250 ms y los picudos cada 100 ms. `setPatchRate(100)` reduciría a la mitad los envíos sin
  cambio visible (el cliente interpola). Medirlo antes con 30–50 clientes.
- **`getItem`** es una búsqueda lineal. Hoy son 35 ítems y 0,14 µs por llamada, pero se llama en
  todas las operaciones de mochila. Un `Map` por id cuando el catálogo crezca.
- **`Inventory.count` / `canAdd` / `wornestStack`** recorren los casilleros. Con 20, no importa.

**Hecho, sólo picudos (2026-10-02):** `WeevilManager.tick` pide la lista de jugadores una sola vez
por tick (y sólo si algún picudo persigue), en vez de una por picudo; sin picudos en la sala, la sala
ni llama al tick. Con 50 bots y 24 picudos, el tick de picudos mide 0,13–0,27 ms de promedio. Patch
rate, `getItem` e `Inventory` siguen pendientes.

### 8. Observabilidad

No hay métricas: sólo `/health` (salas y jugadores) y `console.log`. Al probar con más gente no se
va a saber qué se pone lento.

**Propuesta:** medir la duración del tick (`stepPlayers`, picudos) y del `flush`, con un aviso si un
tick pasa de ~20 ms. Exponer en `/health` el promedio y el máximo, los jugadores por sala y el
tamaño del store. Opcional: `@colyseus/monitor` en desarrollo.

**Hecho (2026-10-02):** `apps/server/src/metrics.ts`. `CityRoom` mide `stepPlayers` y el tick de
picudos con `performance.now()` y los anota en un buffer circular fijo (`Float64Array` de 1.024
mediciones por tipo, todas las salas juntas: nada se aloca por tick). Un tick de más de 20 ms cuenta
como lento (`slowTotal`); se avisa en el log (`[Métricas] …`) cuando hay 3 o más en 10 s o uno de
más de 100 ms, y como mucho un aviso cada 10 s por tipo. Un tick lento suelto no se avisa porque en
las pruebas aparecieron picos aislados de 20–49 ms con tick promedio de 0,2 ms: con `--trace-gc` se
vio que coinciden con _scavenges_ del GC (uno de 18 ms) o con el primer tick después de arrancar
(compilación). `playerStore` guarda cómo salió la última escritura (`lastFlush`: cuándo, ms armando
el JSON, ms totales con la escritura, bytes, jugadores) y conserva su aviso de >50 ms. `/health` suma:

- `cities`: por sala, `roomId`, `cityId`, `copy`, `players`, `weevils`, `rateLimited`, `kicked`;
- `ticks.players` / `ticks.weevils`: `samples`, `avgMs`, `maxMs`, `slowTotal`;
- `store`: `players` (guardados), `lastFlush`, `travelTickets`; `memoryMb` (`rss`, `heapUsed`).

Con 50 bots caminando, 24 picudos y 3 bots con boleto: tick de jugadores 0,23–0,7 ms de promedio,
tick de picudos 0,14–0,27 ms (máx. 2,4–2,7 ms en corridas sin picos de GC), `lastFlush` 0,3 ms
armando 14 KB (50 jugadores), CPU del server 2,4–5 % (máx. 12 %), RSS 104 MB. Sin avisos de tick lento.

## Fuera de alcance (pero anotado)

- Admin por nombre sin contraseña y `CORS_ORIGIN=*` en `ecosystem.config.cjs`: es seguridad, no
  rendimiento. Ya figura en `CLAUDE.md`; hay que resolverlo antes de abrir el server al público.
- Sin reconexión (`allowReconnection`): un corte de wifi saca al jugador del barrio. Es experiencia
  de usuario; se cruza con el punto 1 (volver a la misma copia del barrio).
- Migración a una base de datos: se decidió dejarla para mucho más adelante, así que no forma parte
  de este plan. Mientras tanto el progreso sigue en `players.json` (punto 2).

## Plan sugerido

- [x] **Ahora** (antes de probar con 25–50 personas): 1 (tope y copias del barrio, al menos que se
      vea), 2.1 (guardar sólo lo que cambió, sin bloquear), 4 (límite de frecuencia) y 8 (métricas
      del tick) para poder medir la prueba. _Hechos los cuatro (2026-10-02); del 1 queda el mediano plazo._
- [ ] **Antes de abrir al público**: 2.2 (limpiar claves sin actividad) y ~~6 (limpiar boletos
      vencidos)~~ _hecho (2026-10-02)_.
- [ ] **Con la próxima feature grande del server**: 3 (`PlayerSession`, sistemas y tabla de
      mensajes), que es donde más se ahorra por feature, y 5.
- [ ] **Al pasar / si las métricas lo piden**: 7. _Hecho lo de los picudos (2026-10-02); quedan
      patch rate, `getItem` e `Inventory`._
- [ ] **Sólo si un proceso no alcanza**: Redis (presence + driver).
