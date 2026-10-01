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

### 2. `lib/network.ts` repite lo mismo por cada mensaje

Cada mensaje del server repite import + `onMessage` + variable de limpieza + llamada de limpieza.

**Propuesta:** una tabla `MessageType → evento del bus` recorrida con un loop. Agregar un mensaje pasa
a ser una sola línea.

### 3. `game/scenes/CityScene.ts` decide clic y hover por tipo de objeto

`handlePointerMove` y `handlePointerDown` preguntan "¿es tienda? ¿es banco? ¿es caminable?". Con
puertas, carteles, NPCs, cajeros o viaje entre barrios esto crece en `if`s.

**Propuesta:** que `CityMap` exponga `interactionAt(x, y)` y devuelva algo como
`{ kind, hoverArea, hoverColor, message }`. La escena queda genérica y el server puede usar la misma función.

### 4. Lógica por categoría de ítem repartida en la UI

`item.category === "fish"` aparece en `Backpack.tsx`, `ItemIcon.tsx` y `ShopPanel.tsx` (5 usos sólo en
`ShopPanel`). Sumar comida, carnada o herramientas obliga a recorrer todos esos componentes.

**Propuesta:** describir cada categoría en un solo lugar en `shared` (si se puede poner, si se apila,
cómo se vende, qué texto muestra la tienda) y un registro de íconos por categoría en el cliente.

### 5. Dibujo de prendas en `Avatar.ts` (746 líneas) e `ItemIcon.tsx`

Cada `ItemStyle` nuevo se dibuja en los dos archivos, y en `Avatar.ts` está entreverado en condiciones
(`top.style === "hoodie"`, `bottom.style === "shorts"`…).

**Propuesta:**

- Corto plazo: separar en `game/objects/clothing/{hat,top,bottom,shoes}.ts`, cada uno con un
  `Record<ItemStyle, dibujante>`. TypeScript obliga a dibujar cada estilo nuevo y `Avatar.ts` queda
  en animación y estado.
- Largo plazo: si van a ser muchos estilos, pasar a spritesheets por capas. Dibujar con primitivas no
  escala a cientos de prendas distintas.

### 6. Edificios emblemáticos en `game/city/landmarks.ts` (499 líneas, un `switch`)

Con varios barrios va a ser un archivo de miles de líneas. Además, el tipo de tienda `"clothing"` está
hardcodeado en `CityRenderer.ts`.

**Propuesta:** `game/city/landmarks/<barrio>/<edificio>.ts` más un `Record<LandmarkKind, dibujante>`,
y los edificios de tienda en el mismo registro.

### 7. `app/globals.css` (1216 líneas en un solo archivo)

**Propuesta:** CSS Modules por componente (`Backpack.module.css`), que Next soporta sin configurar
nada. Se puede migrar de a poco, componente por componente.

### 8. Todos los barrios viajan en el paquete del navegador

`getCity` importa `CITIES` completo: con muchos barrios, el cliente descarga todos los mapas.

**Propuesta:** cuando exista el viaje entre barrios, cargar cada uno con `import()` dinámico.

## Organización de carpetas

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

- [ ] **Ahora** (baratos, y cada feature nueva los encarece): 1 (store, atajos y paneles),
      2 (tabla de mensajes), 3 (`interactionAt`) y 4 (descriptor de categorías). Se pasa de tocar ~6
      lugares por feature a 1 o 2, sin cambiar nada del juego.
- [ ] **Al sumar estilos de ropa o un segundo barrio:** 5 y 6.
- [ ] **De a poco:** 7 y la reorganización de carpetas.
- [ ] **Con el viaje entre barrios:** 8.
