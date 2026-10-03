# Montevideo World — Documentación viva

MMORPG web 2.5D con vista isométrica estilo Habbo. **v1 = prueba de concepto**: conectarse por
WebSocket, aparecer en un barrio de Montevideo (**Ciudad Vieja** al entrar; también **Tres Cruces**, con
viaje entre barrios desde la lista M), caminar haciendo clic en el piso (sincronizado en tiempo real) y chatear con globos
de texto sobre la cabeza del avatar. Hay bancos donde sentarse (clic) y una mochila con ropa
para ponerse/sacarse, más una barra de acceso rápido, dinero, tiendas y la primera actividad:
**pescar** en la Escollera Sarandí (con cañas de distinto nivel) y **vender** con un carrito en la
explanada del Estadio Centenario (Tres Cruces). Teclas: **M** lista de barrios, **H** mochila, **C** comandos, **Tab** jugadores
del barrio, **F** interactuar con lo que tenés al lado (tienda, banco, palmera, parada, jugador, picudo) o, si no
hay nada, pescar en la escollera / vender en el Centenario, **1–9** barra rápida, **WASD** caminar, **Y** cámara fija / libre, **Espacio** centrar la cámara, **flechas** mover la
cámara, **Esc** cierra.

> Mantené esta documentación actualizada: este archivo para lo que vale en todo el repo y la regla de
> `.claude/rules/` del sistema que cambies (cada una se carga sola al tocar sus archivos, ver `paths`).

## Stack

Versiones y dependencias: ver los `package.json`. Colyseus está fijado en **0.16** porque es la
última línea compatible con `colyseus.js` (desde 0.17 el SDK cliente pasó a `@colyseus/sdk`). Migrar implica actualizar server + client + schema juntos.

## Estructura

El árbol sale del código (`ls`, y cada archivo explica arriba qué hace). Lo que no se deduce:

- `docs/`: documentos de trabajo en .md, en `pending/` (por hacer) y `finished/` (hechos).
- Cliente (`apps/client/src`): `features/<tema>/` (componentes de un tema + su `<tema>.module.css`),
  `ui/` (HUD, avisos, íconos, botones sueltos), `shell/` (`App`, `PhaserGame`, registro de paneles),
  `lib/` (red, store, EventBus, `cx`) y `game/` (Phaser).
- `apps/client/AGENTS.md` / `apps/client/CLAUDE.md` los genera `next dev` (reglas de Next 16 para agentes): commitearlos.
- Documentación que se carga sola según lo que toques: `.claude/rules/*.md` (un archivo por sistema:
  ingreso y guardado, movimiento, mochila y dinero, tiendas, pesca y venta, necesidades, admin,
  intercambio, comandos y chat, picudos, mascotas, cárcel, interacción con F, barrios, entorno),
  `apps/client/src/CLAUDE.md` (celulares) y `apps/client/src/game/CLAUDE.md` (cámara). Skills:
  `recetas` (agregar mensajes, paneles, categorías de ítem, comandos) y `despliegue`.

## Arquitectura

- Una sala de Colyseus (`CityRoom`) por barrio y copia; se entra siempre a Ciudad Vieja y se viaja
  con boleto. El cliente (Next + Phaser) manda **intenciones** (`room.send(MessageType.X, …)`); el
  server valida, mueve un tile por tick (`STEP_MS`) y replica el mundo por el Schema (`GameState`).
- El servidor es **autoritativo**: el cliente nunca escribe posiciones ni saldos. Predice el camino
  del avatar propio para que arranque sin demora, pero siempre se corrige a lo que dice el server.
  No hay colisiones entre avatares.
- Lo que ven todos va en el Schema (posición, ropa puesta, energía, pesca/venta, picudos…). Lo
  privado de cada jugador (mochila, plata, hambre, salud) vive en su `PlayerSession` y se le manda
  sólo a él con mensajes (`inventory`, `wallet`, `needs`).
- El progreso (mochila, plata, ropa, necesidades, donador, condena) se guarda en un JSON por clave
  secreta del navegador (`playerStore`); en localStorage vive sólo la clave.

## Comandos

Scripts en el `package.json` de la raíz (`npm run dev`, `build`, `typecheck`…), todos desde la raíz.
Por workspace: `npm run <script> -w @montevideo-world/server` (o `@montevideo-world/client`, `@montevideo-world/shared`).

`shared` se consume **compilado** (`dist/`). Si ves `Cannot find module '@montevideo-world/shared'`,
corré `npm run build:shared`.

> **Ojo con el admin:** no hay cuentas ni contraseñas, así que cualquiera que entre con el nombre de
> `ADMIN_NAME` (variable del server) es admin. Antes de abrir el server al público, sumar una clave de
> admin (también en `.env`). Variables de entorno: `.claude/rules/entorno.md`.

## Convenciones de código

- TypeScript `strict` en todo el repo. Nada de `any` en código nuevo; los payloads de red llegan
  como `unknown` al server y se validan con type guards (`isMoveMessage`, `isChatMessage`…), que viven en
  `packages/shared/src/messageGuards.ts` (`MESSAGE_GUARDS`, uno por mensaje).
- Todo lo que cliente y servidor deben acordar (nombres de mensajes, tamaños, tiempos, mapa, reglas
  de sanitizado) vive en `packages/shared`. **Nunca** strings mágicos como `"move"`: usar `MessageType.Move`.
- `@montevideo-world/shared` (entrada raíz) no puede importar `@colyseus/schema` ni nada con efectos:
  la usa también el bundle del navegador. Los Schemas van en `@montevideo-world/shared/schema`.
- El cliente importa Schemas **sólo como tipo** (`import type { GameState } from "@montevideo-world/shared/schema"`):
  colyseus.js decodifica el estado por reflexión.
- Schemas: decoradores `@type(...)` con `experimentalDecorators: true` y
  **`useDefineForClassFields: false`** (si no, los campos pisan los setters de Colyseus y no se sincroniza nada).
- Phaser se importa como `import * as Phaser from "phaser"` (el build ESM no tiene default export)
  y **sólo** desde `src/game/**`, cargado con `import()` dinámico desde `PhaserGame.tsx`. Desde
  componentes React, únicamente `import type`.
- Estilos: cada carpeta de `features/` (y cada archivo de `ui/` / `shell/`) tiene su CSS Module con
  sus clases, incluidos sus ajustes de celular (mismos `@media` que antes). En el componente:
  `const cx = moduleClasses(styles)` (`lib/cx.ts`) y `className={cx("shop-row primary")}`: lo que
  está en el módulo sale con alcance local y lo demás queda global. En `app/globals.css` sólo va lo
  compartido: variables (`:root`), base, `modal`, botones (`primary`…), `key-hint`, el modo compacto
  general. Una clase que usen dos temas va en `globals.css`; selectores de un módulo que nombren
  clases globales, con `:global(.x)`.
- Archivos: componentes React en PascalCase (`ChatBox.tsx`), módulos en camelCase (`eventBus.ts`).
  Textos de UI en español rioplatense.
- Estado sólo de servidor de un jugador (camino, cooldowns, timers, mochila…) va en su `PlayerSession`
  (`rooms/session.ts`), no en el Schema ni en un `Map` nuevo de la sala. Lo que va a hacer al llegar
  (banco, tienda, palmera) es un solo `pending`; `halt(session)` lo borra junto con el camino.
- Cada mensaje vive en un sistema de `rooms/systems/` (`xRoutes(room)` + funciones que reciben la
  sala y la sesión); `CityRoom` sólo tiene ciclo de vida, ticks, registro y envíos.
- **Límite de frecuencia**: todo mensaje del cliente pasa por `RateLimiter` (`rateLimit.ts`, token
  bucket por cliente y tipo; la tabla de límites está en un solo lugar, `MESSAGE_RATE_LIMITS`). Lo que
  se pasa se descarta en silencio; un spam sostenido desconecta con código **4002** (`[RateLimit]` en
  el log). El chat y el saludo tienen además su cooldown (`CHAT_COOLDOWN_MS`).
- **Límites por IP** (`connectionLimits.ts`, desde el `onAuth` estático de `CityRoom`, que corre en el
  pedido HTTP antes de reservar el asiento): hasta 8 conexiones abiertas, un balde de 8 pedidos de
  entrada (uno cada 4 s) y 20 claves nuevas (sin progreso guardado) distintas por hora. Sólo se exponen `joinOrCreate` y `joinById`, y cada barrio tiene hasta 10
  copias. La IP sale de `X-Real-IP`: en producción Caddy la pisa con la real (`deploy/Caddyfile`).
- **Sacar a un jugador** siempre con `room.closeSession(session, código)`, nunca con
  `client.leave` suelto: marca la sesión `closed` (sus mensajes se ignoran y nadie puede intercambiar
  con ella), corta lo que hacía y corta el socket si en 2 s no contesta (si no, `ws` lo deja abierto
  hasta 30 s y se podían duplicar ítems). Un mensaje que tira una excepción saca sólo a ese jugador
  (código 4500); si algo se escapa igual, el proceso guarda a todos y sale para que PM2 lo levante.
- Plata y mochila: `wallet.debit` / `credit` devuelven false sin tocar nada si no se puede; después
  de cada cambio llamar `room.markWallet(session)` / `markInventory(session)`, que se mandan una sola
  vez antes del próximo envío privado (`room.sendTo`) o al terminar el handler (`flushPrivate`). Así
  el resultado ("Compraste…") llega después del saldo nuevo y nunca salen dos mochilas por acción.
- Balance: toda herramienta tiene que ser rentable y la comida no puede pasar del 15 % de lo que se
  gana por hora; el server avisa `[Balance] …` al arrancar si algo se rompe. Al cambiar precios,
  usos o probabilidades, revisar ese aviso.

## Manejo de estado: ¿dónde vive cada cosa?

| Tipo de estado | Dueño | Cómo se lee | Cómo se modifica |
| --- | --- | --- | --- |
| Mundo sincronizado (jugadores, posiciones, nombres, colores) | **Colyseus Schema** (`GameState`) en el server | Phaser: `getStateCallbacks(room)` → `onAdd/onChange/onRemove` | Sólo el server. El cliente envía intenciones (`room.send`) |
| Eventos efímeros de red (chat) | **Mensajes Colyseus** (`broadcast` / `onMessage`) | `bindRoomMessages` en `lib/network.ts` (único `onMessage` por tipo) los reemite al EventBus | `room.send(MessageType.Chat, …)` |
| UI del juego que llega por el EventBus (mochila, plata, energía, hora, jugadores, pesca/venta) y panel abierto | **`gameStore`** (`lib/gameStore.ts`) | `useGame((state) => state.x)` en cada componente, sin props desde `App` | Sólo el store, desde el EventBus (`bindGameStore`) o sus acciones (`openPanel`, `togglePanel`, `setHotbar`…) |
| UI local (input del chat, historial, pantalla de login) | **React** (`useState`) | Componentes | Handlers de React |
| Render/animación (posición interpolada, globos, hover) | **Phaser** (GameObjects) | La escena | `update()` / tweens |
| Puente React ↔ Phaser | **EventBus** (`lib/eventBus.ts`) | `eventBus.on(...)` (devuelve un `off`) | `eventBus.emit(...)` |

Reglas:

1. **El Schema es la única fuente de verdad del mundo.** React no copia posiciones a su estado;
   Phaser no inventa posiciones (sólo interpola hacia las del Schema).
2. **React no conoce Phaser y Phaser no conoce React.** Se hablan sólo por eventos tipados en
   `GameEvents` (`lib/eventBus.ts`). Para un evento nuevo, agregalo a esa interfaz primero.
3. Cada suscripción devuelve su función de limpieza y **se libera** (cleanup de `useEffect`,
   `dispose()` de la escena en `SHUTDOWN`/`DESTROY`). Así StrictMode y el hot reload no duplican handlers.
4. Abrir conexiones o crear juegos = efectos con cancelación. La conexión se abre en el submit de
   `JoinScreen` (event handler, no efecto) para que StrictMode no conecte dos veces; `PhaserGame`
   usa un flag `cancelled` + `game.destroy(true)` para no duplicar el canvas.

## Limitaciones conocidas de v1 / próximos pasos

- Sin cuentas: el progreso queda atado a la clave del navegador (borrar los datos del sitio o cambiar
  de navegador = empezar de cero). Persistencia en un archivo JSON: alcanza para una instancia; con
  más jugadores, pasar a una base de datos.
- Sin colisión entre avatares; el pathfinding sólo esquiva tiles no caminables del barrio.
- Las texturas horneadas se ven un poco suaves con el zoom al máximo.
- Pocas tiendas (ropa, pesca, pescadería, el kiosco de carritos y la Agencia STM); el stock es infinito y los precios son fijos.
- Pesca sin minijuego: el resultado se sortea al tirar y sólo hay que esperar. La venta en el
  Centenario funciona igual (sin minijuego ni mercadería que reponer). Cañas y carritos se gastan
  por uso y se rompen; no se pueden reparar. Prendas sin comprarlas: sólo las que regalan los hinchas al vender.
- Dos barrios (Ciudad Vieja y Tres Cruces), más el COMCAR (presos adentro, visitas afuera). Al entrar
  siempre se aparece en Ciudad Vieja (el server exige boleto para los demás); al viajar, en la zona de
  spawn del destino. Quien queda en otro barrio sin boleto STM (sólo se venden en Ciudad Vieja) puede
  salir y volver a entrar.
- Avatares dibujados con primitivas (4 orientaciones por espejado: frente/espalda × izq/der; de espaldas
  sólo mientras camina, al llegar queda de frente). El aspecto se elige al entrar y no se puede cambiar
  después sin reconectar. Próximo paso: spritesheets de 8 direcciones.
- Sin reconexión automática (`room.reconnectionToken` + `allowReconnection` en el server).
