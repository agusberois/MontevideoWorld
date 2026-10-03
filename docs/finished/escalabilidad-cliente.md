# Escalabilidad del cliente (`apps/client`)

**Fecha:** 2026-10-01

**Resumen:** la base del cliente está bien pensada y no hace falta rediseñarla. Lo que no escala son
unos pocos archivos donde cada feature nueva suma código a mano en varios lugares. Este doc lista esos
puntos por prioridad, con una propuesta para cada uno.

## Lo que ya escala bien (no tocar)

- **Mismo mapa en server y cliente:** `CityMap`, `findPath` y `getCityMap` son la misma lógica en los
  dos lados, así que no se desincronizan.
- **EventBus tipado** (`lib/eventBus.ts`): simple, sin dependencias, con limpieza de cada suscripción.
- **Barrios como datos** (`CityDefinition` + `LayoutBuilder`): agregar un barrio es sobre todo escribir datos.
- **Ítems que sólo cambian color o precio:** son una línea en `items.ts`.
- **Texturas horneadas** en `CityRenderer` y escala por `PieceSpec.scale`: buen rendimiento.

## Puntos a mejorar, por prioridad

### 1. `components/App.tsx` concentra todo

Tiene 13 `useState`, todas las suscripciones al EventBus, el reseteo de estado al salir, los atajos de
teclado y qué panel se abre. Cada feature nueva toca 6 lugares del mismo archivo: estado, suscripción,
`handleLeave`, el `if/else` de teclas, el tipo del panel y el JSX.

**Propuesta:**

- Store del juego (`lib/gameStore.ts`, con `useSyncExternalStore` o zustand) que escuche el EventBus
  y se resetee entero al salir. Los componentes leen lo que necesitan con un hook, sin props desde `App`.
- Atajos como tabla: `{ KeyM: "cities", KeyH: "backpack", … }`.
- Paneles como registro (`id → componente`) en vez de una cadena de `panel === "x" &&`.

**Hecho (2026-10-02):** `lib/gameStore.ts` (store con `useSyncExternalStore`, sin dependencias nuevas;
`reset` al salir y `resetCity` al viajar), `lib/gameActions.ts` (F, pesca, venta, barra rápida, viaje) y
`components/panels.ts` (registro con la tecla de cada panel: la tabla de atajos sale de ahí). Los
componentes leen con `useGame`; `App.tsx` pasó de 443 a ~180 líneas y de 18 `useState` a 2.

### 2. `lib/network.ts` repite lo mismo por cada mensaje

Cada mensaje del server repite import + `onMessage` + variable de limpieza + llamada de limpieza.

**Propuesta:** una tabla `MessageType → evento del bus` recorrida con un loop. Agregar un mensaje pasa
a ser una sola línea.

**Hecho (2026-10-02):** `SERVER_MESSAGES` en `lib/network.ts` (evento del bus → `MessageType`) y
`bindRoomMessages` la recorre con un loop.

### 3. `game/scenes/CityScene.ts` decide clic y hover por tipo de objeto

`handlePointerMove` y `handlePointerDown` preguntan "¿es tienda? ¿es banco? ¿es caminable?". Con
puertas, carteles, NPCs, cajeros o viaje entre barrios esto crece en `if`s.

**Propuesta:** que `CityMap` exponga `interactionAt(x, y)` y devuelva algo como
`{ kind, hoverArea, hoverColor, message }`. La escena queda genérica y el server puede usar la misma función.

**Hecho (2026-10-02):** `CityMap.interactionAt(x, y, { palmReach })` devuelve `{ kind, target, area }` y
`interactionsAround` lo de los tiles pegados (tecla F). Los colores quedaron en el cliente
(`HOVER_COLORS`, son presentación) y lo que hace cada `kind` en un único `switch` (`CityScene.describe`)
que usan el clic y la F. Verificado tile por tile en los dos barrios: mismo resultado que antes. Antes,
hover y clic revisaban en distinto orden (palmera antes que parada / tienda en el hover); ahora es uno
solo. El server no lo usa todavía: recibe mensajes por tipo (`sit`, `shop:visit`…) y valida cada uno.

### 4. Lógica por categoría de ítem repartida en la UI

`item.category === "fish"` aparece en `Backpack.tsx`, `ItemIcon.tsx` y `ShopPanel.tsx` (5 usos sólo en
`ShopPanel`). Sumar comida, carnada o herramientas obliga a recorrer todos esos componentes.

**Propuesta:** describir cada categoría en un solo lugar en `shared` (si se puede poner, si se apila,
cómo se vende, qué texto muestra la tienda) y un registro de íconos por categoría en el cliente.

**Hecho (2026-10-02):** `ITEM_CATEGORIES` en `items.ts` (nombre, herramienta, recargo, cuánto paga la
tienda, textos de la tienda); `buyPrice`, `sellPrice`, `isTool`, el maker y el server salen de ahí
(precios verificados iguales para los 35 ítems y todo nivel de desgaste). En el cliente,
`itemCategoryUi.ts` (estrellas y ventajas), `CATEGORY_ICONS` en `ItemIcon` y un `switch` exhaustivo
(`cellView`) en la mochila en vez de 5 bloques de JSX. Todos son `Record<ItemCategory, …>` o switches
exhaustivos: una categoría nueva no compila hasta tener todo. Quedan `category ===` sólo como type
guards en shared (`isRod`, `isCart`…) y en `itemActions.ts` (que ya era un switch por categoría).

### 5. Dibujo de prendas en `Avatar.ts` (746 líneas) e `ItemIcon.tsx`

Cada `ItemStyle` nuevo se dibuja en los dos archivos, y en `Avatar.ts` está entreverado en condiciones
(`top.style === "hoodie"`, `bottom.style === "shorts"`…).

**Propuesta:**

- Corto plazo: separar en `game/objects/clothing/{hat,top,bottom,shoes}.ts`, cada uno con un
  `Record<ItemStyle, dibujante>`. TypeScript obliga a dibujar cada estilo nuevo y `Avatar.ts` queda
  en animación y estado.
- Largo plazo: si van a ser muchos estilos, pasar a spritesheets por capas. Dibujar con primitivas no
  escala a cientos de prendas distintas.

**Hecho (2026-10-02):** `game/objects/clothing/` con `body.ts` (geometría del cuerpo, contorno,
`itemColor`, `hairCap`) y un archivo por lugar (`hat`, `top`, `bottom`, `shoes`), cada uno con un
`Record<SlotStyle<lugar>, dibujante>`. En shared, `ITEM_STYLES` agrupa los estilos por lugar y
`ClothingItem` es una unión por `slot` (`ClothingOf<S>`): una prenda con un estilo de otro lugar no
compila. `ItemIcon` tiene ahora un chequeo `never` (antes un estilo sin ícono pasaba sin aviso).
Probado agregando un estilo falso: fallan `shoes.ts` e `ItemIcon.tsx`. `Avatar.ts` bajó de 1076 a
~885 líneas. El dibujo es el mismo (mismas primitivas en el mismo orden). Queda pendiente el largo plazo
(spritesheets).

### 6. Edificios emblemáticos en `game/city/landmarks.ts` (499 líneas, un `switch`)

Con varios barrios va a ser un archivo de miles de líneas. Además, el tipo de tienda `"clothing"` está
hardcodeado en `CityRenderer.ts`.

**Propuesta:** `game/city/landmarks/<barrio>/<edificio>.ts` más un `Record<LandmarkKind, dibujante>`,
y los edificios de tienda en el mismo registro.

**Hecho (2026-10-02):** `game/city/landmarks/` con una carpeta por barrio (`ciudadVieja/`,
`tresCruces/`, `comcar/`) y un archivo por edificio, que exporta su `LandmarkDrawing` (`size`, `maxZ`,
`draw` y, si lleva el cartel "MW", `roof`; o `pieces` para áreas alargadas como la Puerta de la
Ciudadela). `landmarks/index.ts` los junta en `LANDMARKS: Record<LandmarkKind, LandmarkDrawing>` (un tipo
nuevo no compila sin dibujo) y exporta `landmarkPieces` y `roofSpot`, que reemplaza a `ROOF_SPOTS`. Lo
compartido va en `common.ts` (colores de aberturas, `facesOf`, la bandera) y en el `common.ts` de cada
barrio (óvalos y hormigón de Tres Cruces, hormigón del COMCAR). El código de dibujo se movió sin tocar
(comparado línea por línea con el archivo anterior). El `"clothing"` escrito a mano en `CityRenderer` ya
no estaba: las tiendas usan `SHOP_STYLES` (`Record<ShopBuilding, …>` en `buildings.ts`), que ya es un
registro tipado y queda aparte.

### 7. `app/globals.css` (1216 líneas en un solo archivo)

**Propuesta:** CSS Modules por componente (`Backpack.module.css`), que Next soporta sin configurar
nada. Se puede migrar de a poco, componente por componente.

**Hecho (2026-10-02):** `globals.css` pasó de 3539 a ~650 líneas. Un módulo por carpeta de
`features/` (`shop.module.css`, `inventory.module.css`…) y por archivo de `ui/` / `shell/` (19 en
total). Para no reescribir 270 `className` a mano, cada componente usa `cx = moduleClasses(styles)`
(`lib/cx.ts`): los nombres que están en el módulo salen con alcance local y los demás quedan globales,
así el JSX sólo cambió de `className="a b"` a `className={cx("a b")}`. Una clase es de un tema si su
nombre no aparece en ningún otro archivo; las demás (30: `modal`, `primary`, `key-hint`…) siguen en
`globals.css`. Las reglas de celular (`@media` del final) se repartieron con su clase, bajo el mismo
`@media`. Verificado: ninguna regla se perdió ni se duplicó (sólo la animación `notice-in`, copiada a
dos módulos porque también la usa `globals.css`); ningún elemento con una clase propia y una global
cambia de cuál gana (los módulos se cargan después de `globals.css`); `next build` compila y el
servidor de desarrollo sirve las clases de cada módulo. Falta revisarlo a ojo en el juego.

### 8. Todos los barrios viajan en el paquete del navegador

`getCity` importa `CITIES` completo: con muchos barrios, el cliente descarga todos los mapas.

**Propuesta:** cuando exista el viaje entre barrios, cargar cada uno con `import()` dinámico.

**Hecho (2026-10-03):** cada barrio es una carpeta en `packages/shared/src/cities/<barrio>/` con
`info.ts` (`CityInfo`: id, nombre, descripción, edificios y tiendas) y `map.ts` (`CityDefinition` =
la info + layout, bancos, paradas, carteles, zonas). La entrada principal de shared exporta sólo lo
liviano (`CITY_INFOS`, `getCityInfo`, `whereToBuy`…); los mapas están en `@montevideo-world/shared/cities`
(server y simulador) y en `@montevideo-world/shared/cities/<barrio>` (uno por barrio, para el cliente).
`apps/client/src/lib/cityMaps.ts` los descarga con `import()` en paralelo con la conexión (`joinCity`)
y la escena los toma ya cargados. `CITY_IDS` + `Record<CityId, …>` hacen que un barrio nuevo no compile
hasta estar en los registros y en el cargador. Verificado: los tres barrios armados con los archivos
nuevos son idénticos campo por campo a los de antes; en el build cada mapa es un chunk aparte (~4–6 KB)
que no está en la carga inicial de `/jugar`; el simulador de movimiento da 0 saltos y 0 finales
distintos; el server crea las salas (entrar a Ciudad Vieja aparece en la plaza; a Tres Cruces sin
boleto, rechazado). El ahorro hoy es chico (~15 KB sin comprimir); importa a medida que haya más barrios.

## Organización de carpetas

**Hecho (2026-10-02):** `components/` (33 archivos) quedó en `features/<tema>/` (join, inventory,
shop, pets, activities, chat, admin, players, trade, cities, health, jail, boxes, landing), `ui/` (Hud,
Notices, UiIcon, InteractPrompt, CameraButton) y `shell/` (App, PhaserGame, panels). `lib/hotbar.ts` e
`itemActions.ts` pasaron a `features/inventory/` (`hotbar.ts` como `hotbarStorage.ts`: en macOS
chocaba con `Hotbar.tsx`). Imports, comentarios, `CLAUDE.md`, reglas y skills actualizados.

`components/` tiene 18 archivos sueltos. Propuesta de agrupar por feature:

```
src/
  features/
    inventory/   Backpack.tsx, Hotbar.tsx, ItemIcon.tsx, hotbar.ts
    shop/        ShopPanel.tsx
    fishing/     FishingWidget.tsx
    chat/        ChatBox.tsx
    admin/       AdminPanel.tsx, Announcement.tsx
    players/     PlayersPanel.tsx
    cities/      CityMenu.tsx
  ui/            Hud.tsx, Notices.tsx, UiIcon.tsx, paneles base
  lib/           network.ts, eventBus.ts, gameStore.ts, keybindings.ts
  game/          (como está, con clothing/ y landmarks/ separados)
```

## Plan sugerido

- [x] **Ahora** (baratos, y cada feature nueva los encarece): 1 (store, atajos y paneles),
      2 (tabla de mensajes), 3 (`interactionAt`) y 4 (descriptor de categorías). Se pasa de tocar ~6
      lugares por feature a 1 o 2, sin cambiar nada del juego.
- [x] **Al sumar estilos de ropa o un segundo barrio:** 5 y 6.
- [x] **De a poco:** 7 y la reorganización de carpetas.
- [x] **Con el viaje entre barrios:** 8 (separando antes la info liviana del mapa).
