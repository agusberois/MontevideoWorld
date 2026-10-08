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

Mochila. Un jugador nuevo aparece con el `STARTER_KIT` **puesto** (la ropa de recién llegado:
musculosa amarilla y short gris, descalzo) y en la mochila el `STARTER_INVENTORY` (una torta
frita: arranca con hambre en 50, `STARTING_HUNGER`, y sin caña). La ropa de recién llegado (`NEWBIE_CLOTHING`, `newbie: true`) marca a
los nuevos: no está en `CLOTHING`, así que ninguna tienda la vende; se puede vender a una ropería
pero da $1 (`price` 2 × `SELL_RATIO`). La mochila la marca con `newbiePerk`. La ropa de trabajo
(`WORK_CLOTHING`, el chaleco flúo del cuidacoches) tampoco se vende en tiendas: la da la profesión.
Categoría `letter` (el sobre de la bienvenida, ver `bienvenida.md`): no se intercambia
(`ItemCategoryInfo.untradable` → `isTradable`, lo miran `checkOffer` y el panel de intercambio); la compra
el Kiosco de la Plaza ($5) y se puede **tirar** desde la mochila (`droppable` → `inventory:drop`, con confirmación). La mochila es estado **privado** de la Room (`Inventory`, `INVENTORY_CAPACITY`
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
en la Room (arranca en `STARTING_MONEY` = $20), no va en el Schema. El cliente lo pide con
`wallet:get` (en `bindRoomMessages`) y el server lo manda sólo al dueño con `wallet` → EventBus
`wallet:update` → HUD (`formatMoney`, "$1.250"). Para tiendas: `wallet.debit(precio)` / `credit`
devuelven false sin tocar nada si el monto es inválido, no alcanza o pasa `MAX_MONEY`; después de
cada operación llamar `room.markWallet(session)` (y `markInventory` si cambió la mochila): no se
mandan en el acto sino una sola vez, antes del próximo envío privado a ese jugador
(`room.sendTo`) o al terminar el handler (`flushPrivate`). Así nunca salen dos mochilas por una
acción y el resultado ("Compraste…") llega después del saldo nuevo.

## Economía (la escalera de niveles)

Se piensa en **acciones** (tiradas, ventas, temas, autos), no en horas: repetir lo mismo cientos de
veces aburre. Cada acción dura lo mismo en las cuatro actividades (**5–8 s**, × `waitFactor`) y paga
bastante; las herramientas duran pocos usos y **subir de nivel cuesta ~50, ~100 y ~150 acciones** con
lo que deja el nivel anterior. Cada nivel rinde claramente más por acción que el anterior (si no,
no conviene subir). Las tres profesiones con herramienta van parejas:

| Nivel | Pesca / Venta / Música | Precio | Usos | $ por acción | Para pagar el siguiente |
| --- | --- | --- | --- | --- | --- |
| 1 | Caña básica / Conservadora / Armónica | $60 | 60 | ~$10 | ~50 acciones |
| 2 | Fibra / Garrapiñada / Guitarra | $500 | 100 | ~$18 | ~100 acciones |
| 3 | Carbono / Panchos / Bandoneón | $1.300 | 150 | ~$28 | ~150 acciones |
| 4 | Profesional / Choripán / Tambor | $3.000 | 200 | ~$42 | — |

- **Pesca:** los peces valen $6–25 los comunes y mucho los raros (lenguado $70, corvina negra $150):
  sacar uno es un evento. Las cañas buenas los hacen más probables (`rareBoost`: corvina negra 1 % con
  la básica, ~10 % con la profesional) y suman doble pesca.
- **Venta y música:** $10–16 por venta / propina con nivel 1 hasta $40–54 con nivel 4 (la música,
  con público, hasta el doble). **Cuidacoches:** $6–14 por auto, sin herramienta (~$7 por acción).
- **Para mantenerla:** precio del nivel k ≈ acciones buscadas × lo que deja neto el anterior
  (`valuePerUse − precio/usos`); `lifetimeValue` tiene que superar el precio con margen (hoy ×2,7 o
  más, también con el peor clima). `needsBalance.ts` usa 6,5 s por acción.
- **Lo demás, en acciones de nivel 1 (~$9):** ropa de tienda $120–1.200 (13 a 130 acciones), calzado
  rápido $800 / $2.000 / $4.500 / $9.000, mascotas $400–4.000, fundar una barra $5.000. Los regalos
  de los hinchas son raros (0,4–1,4 % por intento: valen como un 10 % de lo que deja el carrito).
  Comida, remedios, boleto y casino no cambian (la comida queda muy por debajo del 15 %).
