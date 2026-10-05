---
paths:
  - "packages/shared/src/fishing.ts"
  - "packages/shared/src/vending.ts"
  - "apps/server/src/fishing.ts"
  - "apps/server/src/vending.ts"
  - "apps/server/src/rooms/systems/activities.ts"
  - "apps/server/src/gameClock.ts"
  - "apps/client/src/features/activities/FishingWidget.tsx"
  - "apps/client/src/features/activities/VendingWidget.tsx"
  - "apps/client/src/game/objects/Customers.ts"
  - "apps/client/src/game/objects/Avatar.ts"
---

# Pesca y vendedor ambulante

Pesca. La Escollera Sarandí son tiles `TileChar.Jetty` ("E", caminables) que entran en el río (en
Ciudad Vieja hay dos iguales, para repartir a los que pescan: una sale de la punta oeste, al final de
la peatonal Sarandí, hacia el oeste —3 tiles de ancho y una plataforma de 7 × 11, `ESCOLLERA_PLATFORM`—
y la otra, igual, más al norte cerca de la bahía —brazo en las filas 14 a 16,
`ESCOLLERA_NORTE_PLATFORM`—, cada una con su farola);
`CityMap.fishingSpot` dice hacia dónde tirar y a cuántos tiles cae la boya (el agua más cercana, también
desde el medio de la escollera, donde no hay agua pegada); `Avatar` la dibuja en ese tile.
`CityMap.canFishAt` = parado en la escollera. Para pescar hace falta una **caña** (`RodItem`,
`category: "rod"`) en la mochila: se usa siempre la de mayor `tier` (`bestRod`). Hay 4 (`RODS`:
básica, fibra, carbono, profesional); cada una define `rareBoost` (el peso de cada pez se
multiplica por `(1 + rareBoost)^(dificultad−1)`), `nothingChance`, `doubleChance` (segundo pez
cuando pica) y `waitFactor`. Las probabilidades se calculan en shared (`fishChances`), así la
tienda y la mochila muestran lo mismo que sortea el server. `fish:cast` → el server valida (en la
escollera, sin camino pendiente, sin estar pescando, con caña), sortea con `rollCatch(rod)` y pone
`player.fishing = true` y `player.rod` (Schema: los demás ven la caña de su color). Manda
`fish:started { durationMs }` (3,5–7,5 s × `waitFactor`, sorteada **aparte** del resultado: si
dependiera del pez, tirar y cortar hasta ver una espera larga sería gratis) y al vencer el timer
(`this.clock.setTimeout`) cobra la tirada (`finishAttempt`: un uso de la caña y `FISH_ENERGY_COST`;
al empezar sólo se chequea que alcance la energía), agrega los peces a la mochila y manda
`fish:result { itemIds, hooked }`: `hooked` es todo lo que picó (también lo que no entró en la
mochila). **Sólo el que pesca** ve la captura (no está en el Schema, para no dibujarle a todo el
barrio los peces de todos): `CityScene` escucha `fishing:result` → `Avatar.reelIn(colores)` durante
`REEL_MS`: la boya se hunde, el agua salpica (ondas y gotas), la caña se dobla (`drawBentRod`) y sale
**cada pez** (con doble, dos: el segundo `REEL_FISH_DELAY` después y colgando al lado) en arco hasta
la punta. Llega con `fishing` ya en false: `setFishing(false)` no esconde la caña mientras dura
(`endReel` la esconde); caminar o volver a tirar la cortan. Moverse, sentarse, ir a una tienda, salir o `fish:stop` cancelan
(`stopFishing`) **sin cobrar nada**. Peces de dificultad ≥ 4 se anuncian en el chat. Los peces (`FISH`: pejerrey… corvina
negra) son ítems `category: "fish"`: no se ponen; se comen desde la barra rápida o se venden a precio completo
en la **Pescadería del Mercado** (tienda `building: "none"` sobre el área del Mercado del Puerto,
`buys: ["fish"]`), que además vende todas las especies con recargo (`FISH_BUY_MARKUP` = 1,5×).
Las tiendas sólo compran las categorías de su `buys`. Precios: `buyPrice(item)` (lo que cobra la
tienda) y `sellPrice(item)` (lo que paga); el server cobra/paga siempre con esas funciones.

Vendedor ambulante (Tres Cruces). `CityDefinition.vending` (`VendingZone`: nombre + áreas) marca
la **Explanada del Centenario**, el anillo de plaza alrededor del estadio; `CityMap.canVendAt` =
tile caminable dentro de esas áreas. Hace falta un **carrito** (`CartItem`, `category: "cart"`) en
la mochila y se usa el de mayor `tier` (`bestCart`): conservadora, garrapiñada, panchos y
parrillita de choripán (`CARTS`). Cada uno define `saleMin`/`saleMax` (lo que paga un hincha),
`noSaleChance`, `giftChance` y `waitFactor`. Se compran (y se venden a mitad de precio) en el
**Kiosco del Parque** (`building: "kiosk"`, al este del estadio). `vend:start` → el server valida
(en la zona, quieto, sin pescar ni vender, con carrito, con `VEND_ENERGY_COST` de energía), sortea
con `rollSale` y pone `player.vending = true` + `player.cart` (los demás ven el carrito al costado y
el grito del vendedor). Manda `vend:started { durationMs }` y al vencer el timer se cobra el intento
(`finishAttempt`: un uso del carrito y la energía; cortarlo antes no cuesta nada), se cobra la venta (`wallet.credit`),
`player.sales++` ("¡Vendido!" para todos) y manda `vend:result { ok, text, earned, giftId? }`. Con
`giftChance` el hincha además **regala una prenda** de `VENDING_GIFTS` (camiseta celeste, gorra…):
es la forma de conseguir ropa sin comprarla; se anuncia en el chat. **Partidos**: `MATCHES` (horas
del juego, p. ej. Nacional – Peñarol 15–17 h) → con `matchAt(minuto)` la venta paga el doble, los
hinchas llegan antes y regalan más. El partido de ahora lo decide el server (`gameClock.currentMatch()`:
el horario o el que forzó el admin) y cada sala lo copia a `state.match` en `syncClock`; el cliente
no lo calcula. La sala del barrio con zona de venta anuncia en el chat cuando
empieza y termina cada partido (`announceMatch`, desde `syncClock`). (Hubo una hinchada dibujada
en las gradas los días de partido; se sacó porque redibujar cientos de hinchas cada 90 ms hacía
lagear el juego.)
**El hincha** (sólo lo ve el vendedor): `CUSTOMER_LEAD_MS` antes del resultado el server le manda
a él `vend:customer { state: Arriving }` (`session.customerOut`) y al resolver `Bought` (con
`cartId`) o `Passed`; cortar la venta → `None`. No va en el Schema: así no se le dibujan a todo el
barrio los hinchas de todos. `Customers` (`game/objects/Customers.ts`, sólo dibujo) arma un `Avatar`
"Hincha" que sale de unos tiles más allá, camina hasta el carrito, dice algo y compra o sigue de
largo. **Al comprar, la entrega** (`handOver`): el vendedor y el hincha estiran el brazo
(`Avatar.offer`), la comida del carrito (`drawFood` por `tier`: refresco, garrapiñada, pancho o
choripán) vuela en arco a la mano del hincha, que se la queda (`Avatar.hold`), y una moneda vuelve
al vendedor (su carrito queda a la vista hasta entonces, `Avatar.keepCart`, aunque la venta ya
terminó); después agradece y se va desvaneciéndose. "¡Vendido!" (`player.sales`) lo ven todos. Moverse, sentarse, ir a una
tienda, salir o `vend:stop` cancelan sin cobrar (`stopActivities` corta pesca y venta a la vez).
La tecla **F** es la misma que para pescar: el cliente hace lo que corresponde al lugar (`toggleActivity`).
