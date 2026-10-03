---
name: recetas
description: Recetas paso a paso para agregar a Montevideo World un mensaje de red nuevo, un panel o dato de UI, una categoría de ítem o un comando de chat (qué archivos tocar y en qué orden). Usar antes de agregar cualquiera de esas cosas.
---

# Recetas para agregar cosas

## Cómo agregar un mensaje nuevo (receta)

1. `packages/shared/src/messages.ts`: agregar la clave en `MessageType` y su DTO.
   Si es cliente → servidor, sumarlo a `ClientToServerMessages`; si es servidor → cliente, a
   `ServerToClientMessages`.
2. `packages/shared/src/messageGuards.ts`: su type guard en `MESSAGE_GUARDS` (`noPayload` si no trae
   datos). No compila hasta que esté.
3. `apps/server/src/rooms/systems/<tema>.ts`: su ruta en el objeto de `<tema>Routes(room)`:
   `[MessageType.X]: (session, message) => …` (el mensaje ya llega validado y tipado; el registro
   en `CityRoom.route` aplica el límite de frecuencia y descarta lo que no pasa el guard). Tampoco
   compila hasta que esté. Para responder, `room.sendTo(session, MessageType.Y, …)`. Por defecto
   entra a 5/s con ráfaga de 10; si el juego normal puede mandarlo más seguido (clics de UI,
   movimiento), sumarlo a `MESSAGE_RATE_LIMITS` en `apps/server/src/rateLimit.ts`.
4. Si el server le manda algo al cliente: sumar el evento a `GameEvents` (`lib/eventBus.ts`) y una línea
   `"evento": MessageType.X` en `SERVER_MESSAGES` (`lib/network.ts`), que lo reemite por el EventBus.
5. `npm run typecheck`.

## Cómo agregar un panel o un dato de UI (receta)

- **Panel**: sumar su id a `PanelId` (`lib/gameStore.ts`) y una línea en `PANELS` (`shell/panels.ts`)
  con el componente (recibe `PanelProps`: `room`, `cityId`, `onClose`) y, si tiene, su tecla
  (`event.code`) y `adminOnly`. Se abre con `openPanel("id")`; la tecla y Esc ya andan.
- **Dato que llega por el EventBus**: sumarlo a `GameStoreState` e `INITIAL`, escucharlo en
  `bindGameStore` y, si es del barrio (se borra al viajar), a `CITY_FIELDS`. Los componentes lo leen
  con `useGame`. El selector devuelve un campo del estado o un primitivo, nunca un objeto nuevo.

## Cómo agregar una categoría de ítem (receta)

1. `packages/shared/src/items.ts`: el tipo (`interface XItem`), sumarlo a `ItemCategory` / `ItemDefinition` y una
   entrada en `ITEM_CATEGORIES` (nombre, si es herramienta, recargo al comprar, cuánto paga la tienda y
   los textos de la tienda). Precios, apilado y el maker salen de ahí.
2. `npm run typecheck`: no compila hasta que tenga su ícono (`CATEGORY_ICONS` en `ItemIcon.tsx`), su
   casillero en la mochila (`cellView` en `Backpack.tsx`), su acción en la barra rápida (`itemAction`) y
   su entrada en `itemCategoryUi.ts` (`{}` si no tiene estrellas ni ventajas).
3. Para venderla, sumarla a `buys` de alguna tienda.

## Cómo agregar un comando de chat (receta)

1. `packages/shared/src/commands.ts`: sumarlo a `COMMANDS` (`name`, `usage`, `description`, `role`).
2. `apps/server/src/commands/<nombre>.ts`: exportar un `CommandHandler` (`({ client, player, args, rest }, host) => …`).
3. `apps/server/src/commands/index.ts`: agregarlo a `HANDLERS` (el `Record<CommandName, …>` no compila si falta).
4. Si necesita algo nuevo de la sala, sumarlo a `CommandHost` (`commands/types.ts`) e implementarlo en `createCommandHost` (`rooms/systems/social.ts`).

Aparece solo en `/help` para quien lo pueda usar.
