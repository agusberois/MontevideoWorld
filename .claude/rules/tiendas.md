---
paths:
  - "apps/server/src/rooms/systems/shops.ts"
  - "packages/shared/src/haggle.ts"
  - "apps/client/src/features/shop/ShopPanel.tsx"
  - "apps/client/src/game/city/buildings.ts"
---

# Tiendas, carrito y regateo

Tiendas (`CityDefinition.shops`: área cuadrada no caminable + `stock`). Clic en la tienda →
`shop:visit { x, y }` → el server camina al jugador a un tile pegado (`CityMap.shopApproach`) y al
llegar le manda `shop:open { shopId }` (sólo a él) → React abre `ShopPanel`. `shop:buy` / `shop:sell
{ shopId, itemId }` exigen estar pegado a la tienda (`isNearShop`); comprar cobra `item.price` si
alcanza y hay lugar en la mochila; vender paga `sellPrice` (mitad) por prendas **de la mochila** (lo
puesto no se vende). El server responde `shop:result { ok, text }` y reenvía saldo e inventario.
**Cantidad**: `shop:buy` / `shop:sell` llevan `quantity` (1…`SHOP_MAX_QUANTITY`, 1 si no viene);
el server compra / vende las que alcancen, entren o tengas y responde un solo resultado con lo que
salió de verdad (`action`, `itemId`, `quantity`: "Compraste 3 de 5 × Alfajor por $45: no te
alcanzó la plata"). En `ShopView` cada fila tiene − / número / + (`QuantityPicker`, tope: plata,
lugar en la mochila o lo que tenés). El resultado se ve en un aviso grande arriba de la lista
(`shop-toast`, con el ítem y el saldo nuevo; el error tiembla) y la fila brilla con "+N" / "−N".
**Vender (pestaña Vender), como el carrito**: cada fila tiene una casilla (tildarla elige todas las
unidades; con más de una, − / número / + para bajarlas) y abajo una barra con cuánto te pagan,
**Tildar todo**, **Regatear** y **Vender** → `shop:sell-many { shopId, items }`, todo o nada
(`saleQuote` en `systems/shops.ts`: tienda al lado, que compre cada cosa, que esté todo en la mochila,
y el total con cada herramienta según su desgaste, de la más gastada a la menos, probado en
`inventory.clone()`). Responde `shop:result` con `action: "sell"` y `sold` (las filas brillan) y el
panel limpia lo elegido. `shop:sell` / `shop:haggle` de a un ítem siguen andando en el server.
**Carrito (pestaña Comprar)**: no hay un botón por ítem. Cada fila tiene su cantidad (de 0, tope
lugar en la mochila) y abajo una barra con el total y un solo **Comprar** → `shop:checkout {
shopId, items: [{ itemId, quantity }] }` (`ShopCheckout` en `systems/shops.ts`). Es **todo o nada**: si no
alcanza la plata para el total o no entra todo (se prueba en `inventory.clone()`), no compra
nada y dice por qué; si no, cobra una vez y responde `shop:result` con `bought` (cada fila
comprada brilla) y el panel vacía el carrito. `shop:buy` de a un ítem sigue andando en el server.
**Regatear** (sólo al vender, **todo lo elegido junto**): el formulario va arriba de la barra →
`shop:haggle-many { shopId, items, price }`, todo o nada sobre el lote: se puede pedir entre el total
normal + 1 y `maxHagglePrice(total)` (5×); la tienda acepta con `haggleChance` = `(total / price)^1,2`
(la misma fórmula que muestra el panel). Si acepta se cobra `price`; si no, se pierde todo lo
elegido y no se cobra nada (el resultado llega igual con `action: "sell"`, así el panel limpia). Con exponente > 1, en promedio regatear rinde un
poco menos que vender normal: es una apuesta, no una forma de farmear plata.
**Calzados Sarandí** (Ciudad Vieja, junto a la Ropería; también **Calzados 18 de Julio** en el Centro) vende los calzados comunes y los rápidos
(`WALKING_SHOES`): `ClothingOf.speed` (1,1 a 1,5) hace caminar más rápido con ellos puestos. El
server avanza `walkSpeed(player.shoes)` tiles por tick con un crédito (`session.stepCredit` en
`stepPlayers`: con 1,5, tres tiles cada dos ticks; cansado manda la lentitud) y el cliente acorta el
paso (`Avatar.setTired(tired, speed)`); si el server avanza dos tiles de una, `pushTile` camina por el
del medio. La tienda y la mochila muestran "👟 Caminás 50 % más rápido" (`speedPerk`).
Ciudad Vieja tiene la **Ropería Sarandí** junto a la peatonal, que vende todo el catálogo,
y **Pesca Sarandí**, en la punta frente a la Escollera Sarandí, que vende las cañas y compra las
usadas (`buys: ["rod"]`). **Precio por tienda**: `Shop.priceFactor` multiplica el precio de compra (`buyPrice(item,
priceFactor)`, en el server y en `ShopPanel`, que muestra tachado el precio normal). Los mayoristas
del Barrio de los Judíos usan 0,75; tiene que quedar por encima de lo que la tienda paga al comprar
(`sellPrice`, la mitad en ropa) o se podría comprar y revender ganando. La ropa de `KOREAN_FASHION`
sólo la vende Moda Coreana y la de `LONDON_PARIS_FASHION`, sólo London París (Centro); ninguna está en `CLOTHING`.
Los instrumentos (`INSTRUMENTS`) los vende y los compra usados la **Casa de Música** (Centro, `building: "music"`). El edificio de cada tienda sale de `Shop.building` (`ShopBuilding`):
para un tipo nuevo, sumar su estilo en `SHOP_STYLES` (`buildings.ts`).
