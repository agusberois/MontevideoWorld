# Termas del Donador: edificio con jacuzzi sólo para donadores

> ✅ Hecho (2026-10-05). Cómo quedó: `.claude/rules/termas.md`. El plan original decía "Club del
> Donador" y `club-donador`; quedó **Termas del Donador** (`termas`), con la puerta como un `Door`
> sobre el edificio entero y el jacuzzi como `Jacuzzi` del mapa (no un landmark).

**Fecha:** 2026-10-05

**Resumen:** un edificio en Ciudad Vieja que **ven todos** pero en el que **sólo entran los donadores
y el admin**. Adentro hay una sala chica (un interior aparte, como el COMCAR es un barrio aparte) con
un **jacuzzi**: meterse en él recupera la energía mucho más rápido que un banco. Se reusa casi todo
lo que ya existe: el pase de viaje (`issueTravelTicket`) para entrar y salir sin boleto, las salas
por barrio (`CityRoom` + `CityDefinition`) para el interior y el patrón de los bancos para el
jacuzzi. Esfuerzo estimado: **M** (una semana), en cinco etapas que se pueden probar de a una.

## 1. Cómo se juega

- **Afuera** (Ciudad Vieja): el **Club del Donador**, un edificio con toldo dorado, un corazón ♥ y
  un cartel. Lo ve todo el barrio. Al lado de la puerta, un cartelito "♥ Sólo donadores".
- **Clic en la puerta** (o **F** al lado):
  - Donador o admin → camina hasta la puerta, se ve un fundido corto ("Entrando al Club…") y aparece
    adentro.
  - Cualquier otro → aviso: "♥ El Club es sólo para donadores del proyecto." No camina.
- **Adentro**: una sala de baldosas y madera con plantas, reposeras y el **jacuzzi** en el medio
  (3×3, agua celeste con burbujas). Se ve quiénes están (es una sala como cualquier otra: chat,
  gestos, todo igual).
- **Clic en el jacuzzi**: camina hasta el borde y se mete en un lugar libre (4 lugares). Se lo ve
  metido hasta la cintura, con burbujas. Mientras está adentro **recupera energía rápido**.
  Caminar a otro lado lo saca.
- **Salir**: clic en la puerta de adentro → vuelve a Ciudad Vieja, parado frente a la puerta del Club.

## 2. Decisiones de diseño

### 2.1 El interior es una sala aparte (no un área cerrada dentro de Ciudad Vieja)

Hay dos formas de hacerlo:

| | **A. Sala aparte** (elegida) | B. Área cerrada en Ciudad Vieja |
| --- | --- | --- |
| Qué es | Un `CityDefinition` nuevo, `club-donador`, chico (~16×14), que no sale en la lista de barrios | Tiles del mapa de Ciudad Vieja caminables sólo para donadores |
| Se siente un interior | Sí: cambia todo lo que se ve (como en Habbo) | No: es un pedazo de plaza con paredes |
| Encaje técnico | Reusa salas, pases de viaje, `filterBy(cityId)`, la persistencia del barrio | `CityMap.isWalkable` tendría que depender del jugador; rompe la predicción del cliente y el BFS compartido |
| Carga | Sólo la pagan los que entran | Todos dibujan el interior |

### 2.2 El acceso lo decide siempre el server

- Al pedir entrar (`door:enter`): `player.donor || player.admin`. Si no, aviso y nada.
- En `CityRoom.onJoin` de `club-donador`: además del pase, se vuelve a chequear que sea donador o
  admin, con lo guardado (`PlayerRecord.donor`) o con `isAdminName`. Así nadie entra pidiendo la sala
  a mano desde la consola.
- Si el admin le saca el donador (`/donador no`) **estando adentro**, se lo saca a Ciudad Vieja:
  `setDonor` del `CommandHost` le pide a su sala que lo mande afuera con el mismo pase de salida.
- El edificio de afuera se ve igual para todos. Sólo cambia lo que pasa al hacer clic.

### 2.3 Entrar y salir sin boleto

Funciona como `/trace` y el desmayo: el server emite un pase con `issueTravelTicket` y el destino
(`at` = el tile de la puerta), y manda `travel:ok`. Hay un solo cambio en el cliente: al entrar o salir
del Club no se muestra el ómnibus. Se muestra un fundido corto, con un `door: true` en
`TravelApprovedMessage`, como el `ambulance` del desmayo.

### 2.4 El jacuzzi y la energía

- Se meten hasta **4 a la vez** (`seats`): los tiles del borde de adentro del jacuzzi.
- Recupera `JACUZZI_ENERGY_REGEN` por segundo. Hoy, quieto son 2/s y sentado en un banco 10/s.
  Propuesta: **25/s**, con el mismo factor de hambre (`energyRegenFactor`). Suma también un poco de
  salud (`JACUZZI_HEALTH_REGEN`, el doble del banco).
- **Balance:** de 20 a 100 de energía, un banco tarda 8 s y el jacuzzi 3,2 s. Como hay que ir hasta
  el Club, la ventaja sobre los que no donan es muy chica: es un gusto, no una ventaja para ganar
  plata. No toca el `[Balance]` de la comida, porque no es una fuente de plata. Igual hay que
  revisarlo al cerrar el número.

### 2.5 Volver a entrar al juego estando adentro

Ya existe la persistencia del barrio (`PlayerRecord.location`). Si cierra la pestaña adentro del Club:

- Sigue siendo donador → vuelve adentro (en `onAuth`, el Club cuenta como "no hace falta boleto").
- Ya no es donador → aparece en Ciudad Vieja, frente a la puerta, con un aviso.

## 3. Cambios por parte

### 3.1 `packages/shared`

- `cities/types.ts`:
  - `CITY_IDS` suma `"club-donador"`.
  - `CityInfo.access?: "donor"`: lo ocultan la lista de barrios, la landing y `cityOccupancy`.
  - `CityInfo.indoor?: true`: sin lluvia ni noche oscura.
  - `CityDefinition` suma `doors?: Door[]` y `jacuzzis?: Jacuzzi[]`:
    - `Door { id, x, y, facing, to: { cityId, at: TilePoint }, access?: "donor" }`: un tile no caminable, como las paradas.
    - `Jacuzzi { area: TileRect, seats: TilePoint[] }`.
- `TileChar` suma `Floor` (baldosa de adentro, caminable) y `InnerWall` (pared, no caminable).
- `LandmarkKind` suma `donorClub` (el edificio de afuera) y `jacuzzi`.
- `map.ts` (`CityMap`):
  - `doorAt`, `jacuzziAt`, `freeJacuzziSeat` y los `kind` `"door"` / `"jacuzzi"` en
    `interactionAt` y `nearbyInteractions`, para que la F también funcione.
  - Las puertas y el área del jacuzzi no se caminan; los asientos sí (se camina "adentro" del agua).
- `cities/clubDonador/info.ts` + `map.ts`: el interior, con la puerta de salida, el jacuzzi,
  reposeras (`benches`), plantas (landmarks) y el `spawnArea` frente a la puerta.
- `cities/ciudadVieja/info.ts` + `map.ts`: el landmark `donorClub` y su `Door`. El lugar se elige en
  el mapa con el modo coordenadas (G); candidato: una manzana de pasto cerca de la Plaza Matriz.
- `needs.ts`: `JACUZZI_ENERGY_REGEN`, `JACUZZI_HEALTH_REGEN`.
- `messages.ts` + `messageGuards.ts` (receta `recetas`):
  - `door:enter { doorId }` y `jacuzzi:enter { x, y }`.
  - `TravelApprovedMessage.door?: boolean`.
- `schema/Player.ts`: `@type("boolean") bathing = false`. Lo ven todos, como `sitting`.

### 3.2 Server

- `rooms/systems/doors.ts` (nuevo, `doorRoutes(room)`):
  - `door:enter`, con `oncePerTick` como el banco: chequea el acceso, camina hasta la puerta y al
    llegar cruza (`pending: { kind: "door", door }`).
  - `crossDoor(room, session, door)`: guarda el progreso, emite el pase con `at` y manda
    `travel:ok { door: true }`.
- `rooms/systems/movement.ts`:
  - `jacuzzi:enter`: camina hasta el borde y al llegar ocupa un asiento libre. Es igual que
    `Sit`: `pending: { kind: "jacuzzi" }` y `player.bathing = true` en `stepPlayers`.
  - Cualquier `move` lo saca (`bathing = false`, como `sitting`).
- `rooms/session.ts`: `PendingAction` suma `door` y `jacuzzi`.
- `rooms/CityRoom.ts`:
  - `onJoin`: si la sala es `access: "donor"`, exige donador o admin.
  - `savedLocation` / `onAuth`: el Club no pide boleto para volver (ver 2.5).
- `needs.ts` (`Needs.tick`) + `systems/life.ts`: `bathing` en `NeedsTick`. Usa la tasa del jacuzzi en
  vez de la del banco.
- `rooms/systems/social.ts` (`createCommandHost.setDonor`): si le sacan el donador y está en el
  Club, `crossDoor` hacia afuera.
- `systems/travel.ts` (`cityOccupancy`) y la lista de barrios: no mostrar las salas `access: "donor"`.

### 3.3 Cliente

- `game/city/landmarks/ciudadVieja/clubDonador.ts`: la fachada (cara sur y este, toldo dorado,
  puerta de madera, corazón y cartel "CLUB DEL DONADOR").
- `game/city/landmarks/clubDonador/jacuzzi.ts`: el jacuzzi (borde de piedra clara, agua celeste).
  Burbujas y vapor animados en un `Graphics` aparte; si no, el horneado lo deja quieto.
- Tiles nuevos en `CityRenderer` / `IsoPainter`: `Floor` (baldosas) y `InnerWall` (paredes bajas,
  sólo al norte y al oeste, para no tapar la sala).
- `CityScene`:
  - Clic o F en una puerta → `door:enter`. Si no tenés acceso, el cliente igual lo manda: el server
    avisa.
  - Clic en el jacuzzi → `jacuzzi:enter`.
  - Hover con candado para los que no son donadores (usa `isDonor` del jugador propio).
- `Avatar.setBathing(bathing)`: baja el cuerpo, recorta las piernas con una máscara o un rectángulo
  de agua por delante y suma burbujas alrededor. Lo ven todos (`listen("bathing")`).
- `InteractHint` (la F): "Entrar al Club" / "Meterte al jacuzzi" / "♥ Sólo donadores".
- `TravelOverlay`: modo `door`, un fundido de 0,6 s en vez del ómnibus.
- `WeatherFx` / `DayNight`: no se dibujan con `indoor`. Luz fija, sin lluvia.
- `CityMenu` y landing: filtrar `access`.

### 3.4 Documentación

- Regla nueva `.claude/rules/club-donador.md` (paths de doors, jacuzzi, el barrio y el landmark).
- Ajustes en `barrios.md` (sala con acceso), `necesidades.md` (tasa del jacuzzi),
  `comandos-y-chat.md` (`/donador no` saca del Club), `ingreso.md` (volver adentro) y el
  `CLAUDE.md` raíz (lista de barrios y de reglas).

## 4. Etapas (cada una se prueba sola)

| # | Etapa | Se prueba con |
| --- | --- | --- |
| 1 | **Interior vacío**: barrio `club-donador` con piso, paredes y puerta de salida; `access` y `indoor`; oculto en listas | `/trace` del admin a alguien adentro, o entrando con el pase a mano |
| 2 | **Puerta con acceso**: `Door` en Ciudad Vieja (sin dibujo todavía), `door:enter`, pase sin boleto, fundido, `onJoin` exige donador | Entrar con un donador (`/donador si`), probar con uno que no lo es, `/donador no` estando adentro |
| 3 | **Edificio de afuera**: el landmark `donorClub`, el cartel y el candado al pasar el mouse | Mirarlo desde la plaza en escritorio y en celular |
| 4 | **Jacuzzi**: dibujo, asientos, `jacuzzi:enter`, `bathing`, `Avatar.setBathing`, tasa de energía | Cansarse pescando, meterse y medir cuánto tarda en llenar contra un banco |
| 5 | **Pulido**: persistencia (volver adentro), F en puertas y jacuzzi, avisos, documentación | Cerrar la pestaña adentro siendo donador y sin serlo |

## 5. Riesgos y cómo se cubren

- **Entrar sin ser donador** (cliente modificado): el server chequea en `door:enter` **y** en
  `onJoin` de la sala. El pase solo no alcanza.
- **El donador se lo sacan adentro**: `setDonor` lo saca en el momento. Si estaba desconectado, la
  regla de 2.5 lo deja afuera al volver.
- **Sin clave** (navegador sin almacenamiento): no se puede viajar, así que no se puede entrar al
  Club. El aviso es el mismo que para viajar.
- **Admin**: entra siempre. Ojo: hoy el admin sale del nombre (`ADMIN_NAME`), así que cualquiera con
  ese nombre entraría. Se arregla con la clave de admin pendiente de `seguridad-para-produccion.md`.
- **Muchas copias**: el Club es una sala como las otras (hasta `MAX_PLAYERS_PER_ROOM` y copias). Con
  pocos donadores, una sola copia.

## 6. Decidido (2026-10-05)

1. **Nombre**: **Termas del Donador** (por las termas del Daymán y el Arapey). En el código, `termas`.
2. **Dónde va**: en Ciudad Vieja, donde haya lugar libre.
3. **Cuánto cura**: 25/s de energía y también salud.
4. **Invitados**: no. Sólo donadores y admin.
5. **Extras para más adelante**: toallas o bata como prenda exclusiva, una barra con mate y bizcochos
   gratis, música de fondo cuando haya sonido.
