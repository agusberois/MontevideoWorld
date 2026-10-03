---
paths:
  - "apps/server/src/inventory.ts"
  - "apps/server/src/wallet.ts"
  - "packages/shared/src/items.ts"
  - "packages/shared/src/tools.ts"
  - "packages/shared/src/money.ts"
  - "apps/client/src/features/inventory/Backpack.tsx"
  - "apps/client/src/features/inventory/Hotbar.tsx"
  - "apps/client/src/features/inventory/HotbarPicker.tsx"
  - "apps/client/src/features/inventory/ItemIcon.tsx"
  - "apps/client/src/features/inventory/ToolWear.tsx"
  - "apps/client/src/features/inventory/itemCategoryUi.ts"
  - "apps/client/src/features/inventory/hotbarStorage.ts"
  - "apps/client/src/features/inventory/itemActions.ts"
  - "apps/client/src/lib/avatar/**"
  - "apps/client/src/game/objects/avatarLook.ts"
---

# Mochila, herramientas, barra rápida y dinero

Mochila. Un jugador nuevo aparece con el `STARTER_KIT` **puesto** (1 remera, 1 short, chancletas)
y en la mochila el `STARTER_INVENTORY` (la caña básica). La mochila es estado **privado** de la Room (`Inventory`, `INVENTORY_CAPACITY`
casilleros; prendas iguales se apilan hasta `MAX_STACK`, las herramientas no: ver abajo): no va en el Schema. El cliente la pide con
`inventory:get` después de registrar su handler (en `bindRoomMessages`) y el server responde, y
reenvía tras cada cambio, con `client.send("inventory", …)` sólo al dueño → EventBus
`inventory:update`.
**Orden**: cada pila lleva su casillero (`InventoryStack.slot`, lo pone el server; lo nuevo va al
primer libre y puede haber huecos). `inventory:move { from, to }` (`Inventory.move`) la muda a un
casillero vacío, la intercambia con lo que haya o junta dos pilas de la misma prenda; se guarda con
la mochila. En la mochila se arrastra (escritorio) o se mantiene apretado un ítem y se toca el
destino (celulares). Con un intercambio abierto no se reordena.
`room.send("equip", { slot, itemId })` saca la prenda de la mochila y la pone (lo que estaba puesto
vuelve a la mochila; si no entra, no cambia nada); `itemId: null` guarda lo puesto en la mochila.
**Herramientas con desgaste** (`ToolItem` = cañas y carritos, `isTool`): cada una ocupa su propio
casillero (`maxStack` = 1) y lleva `InventoryStack.uses` (usos restantes; sin `uses` = nueva, hasta
`maxUses`). Cada tirada / intento de venta que **llega al final** gasta uno (pique o no) y
con el último se rompe y sale de la mochila (aviso `notice`). Regla única: lo que se gasta, se
vende o se intercambia primero es la unidad **más gastada** de ese `itemId` (`wornestStack`;
`Inventory.remove` la devuelve con sus usos y `nextUses` dice cuáles saldrían). Una herramienta se
vende a `sellPrice(item, uses)` (mitad × usos restantes / máximo). En el intercambio pasa con su
desgaste y `TradeSide.uses` le muestra al otro los usos de cada una; con un intercambio abierto no
se puede pescar ni vender. Los guardados viejos (cañas apiladas, sin `uses`) se separan y vuelven
nuevas (`Inventory.restore`). Así las herramientas se terminan y hay que volver a comprarlas.
**Regla de balance: toda herramienta tiene que ser rentable**, o sea, lo que deja en promedio en
sus `maxUses` usos (`lifetimeValue`: `catchValue` por tirada en el Mercado del Puerto, `saleValue`
por intento de venta sin partidos ni regalos) tiene que superar su `price`. La tienda y la mochila
lo muestran ("rinde ~$382 en total") y el server avisa al arrancar (`[Balance] …`) si alguna deja
de serlo (`unprofitableTools`). Al cambiar precios, usos o probabilidades, revisar ese aviso.
Lo puesto (`hat/top/bottom/shoes`) sí va en el Schema: todos lo ven; la escena reemite la ropa propia
a React con `player:outfit`.
Barra rápida (1–9): guarda **ids** de ítems, no ítems; es preferencia de UI y vive en
`localStorage` (`features/inventory/hotbarStorage.ts`), no en el server. Se arrastra desde la mochila (HTML5 drag & drop),
se reordena arrastrando entre casilleros y se saca arrastrando afuera; sin arrastrar, tocar un
casillero vacío o mantener apretado / clic derecho en uno lleno abre `HotbarPicker` (elegir o quitar). Qué hace
cada ítem al activarlo está en un solo lugar, `features/inventory/itemActions.ts` (`itemAction`): ropa →
ponérsela/sacársela (`equip`); caña → pescar/recoger (como F); carrito → vender/dejar (como F en la explanada); pescado o comida → comerlo (`food:eat`,
da lo de `edibleValue`: hambre y energía); caja → abrirla. Lo que ya no tenés (ni
en la mochila ni puesto) se saca solo de la barra y el casillero queda libre; se espera
`HOTBAR_CLEANUP_MS` (1 s) sin cambios porque al ponerse/sacarse algo la mochila y la ropa
llegan por separado.
Los estilos de prenda van por lugar del cuerpo en `ITEM_STYLES` (shared; `ClothingItem` ata
`slot` y `style`, así una gorra con estilo de remera no compila). Cada estilo se dibuja en el
avatar (`lib/avatar/clothing.ts`, un `Record<SlotStyle<lugar>, …>` por lugar; lo usan igual el juego
y la vista previa en SVG) y en el ícono SVG
(`ItemIcon.tsx`, `switch` exhaustivo, pintado con `item.color`): un estilo nuevo no compila hasta
tener los dos dibujos.

Dinero. Saldo en pesos **enteros**, autoritativo y **privado** como la mochila: `Wallet` por jugador
en la Room (arranca en `STARTING_MONEY` = $100), no va en el Schema. El cliente lo pide con
`wallet:get` (en `bindRoomMessages`) y el server lo manda sólo al dueño con `wallet` → EventBus
`wallet:update` → HUD (`formatMoney`, "$1.250"). Para tiendas: `wallet.debit(precio)` / `credit`
devuelven false sin tocar nada si el monto es inválido, no alcanza o pasa `MAX_MONEY`; después de
cada operación llamar `room.markWallet(session)` (y `markInventory` si cambió la mochila): no se
mandan en el acto sino una sola vez, antes del próximo envío privado a ese jugador
(`room.sendTo`) o al terminar el handler (`flushPrivate`). Así nunca salen dos mochilas por una
acción y el resultado ("Compraste…") llega después del saldo nuevo.
