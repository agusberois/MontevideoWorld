---
paths:
  - "packages/shared/src/cities/termas/**"
  - "packages/shared/src/cities/termasPiso2/**"
  - "apps/server/src/rooms/systems/doors.ts"
  - "apps/client/src/game/city/landmarks/ciudadVieja/termas.ts"
  - "apps/client/src/game/city/landmarks/termas/**"
  - "apps/client/src/game/city/buildings.ts"
---

# Hotel del Donador (puertas y jacuzzi)

**Hotel del Donador** (en el código sigue llamándose `termas`): edificio en Ciudad Vieja (landmark
`termas`, 125,43, 4×4, al norte de la Plaza Independencia; un cinco estrellas de mármol y dorado con
mansarda, cúpula, pórtico y alfombra roja, `landmarks/ciudadVieja/termas.ts`) que ven todos;
**sólo entran donadores y el admin**. Adentro es otra sala: el barrio `termas` (`CityInfo.access:
"donor"`, `indoor: true`), que no sale en la lista de barrios (`isPublicCity`), en la landing ni se
llega en ómnibus (`TravelRequest` lo rechaza). Diseño completo en `docs/finished/club-de-donadores.md`.

- **Puertas** (`CityDefinition.doors`, `Door`: área no caminable, `to: { cityId, at }`, `access`):
  afuera la puerta es el edificio entero; adentro, dos tiles de la pared oeste (puerta doble: `innerWallSpec("start" | "end")`,
  la misma que en el casino; una puerta de un tile sale simple, `"single"`). Clic o F → `door:enter { doorId }` (`systems/doors.ts`, con `oncePerTick`):
  `doorBlocked` (donador o admin, y con clave) → si está al lado cruza; si no, camina (`pending:
  "door"`). `crossDoor` guarda, emite el pase con `at` y manda `travel:ok { door: true }` → el
  cliente cambia de sala con `DoorOverlay` (fundido de `DOOR_MS`, no el ómnibus).
- **Acceso en el server**: además del pase, `onJoin` de una sala `access: "donor"` exige donador
  guardado o el nombre de admin (`hasDonorAccess`). `/donador no` estando adentro lo saca por la
  puerta (`leaveRestricted`, desde `setDonor`). Al volver a entrar al juego (`resume`), vuelve a las
  Termas si sigue siendo donador (`canResumeTo`, no pide boleto); si no, Ciudad Vieja con aviso.
- **Jacuzzi** (`CityDefinition.jacuzzis`, `Jacuzzi`: área no caminable y `seats`): entran hasta
  `JACUZZI_CAPACITY` (20) por jacuzzi (`isJacuzziFull`, al pedir y al meterse); arriba de cada uno
  se ve "x/20" (`game/city/JacuzziCounters.ts`, contado del Schema, en rojo si está lleno). Clic →
  `jacuzzi:enter { x, y }` → camina al borde del lugar libre más cercano (`seatApproach`) y al llegar
  `enterJacuzzi` lo pone en el lugar con `player.bathing = true` (Schema) y le avisa que está
  recargando. Cualquier otra cosa lo saca (`standUp` baja `sitting` y `bathing`). Metido recarga las
  tres barras en `Needs.tick`: `JACUZZI_ENERGY_REGEN` (25/s, un banco da 10), `JACUZZI_HEALTH_REGEN`
  y `JACUZZI_HUNGER_REGEN` (0,5/s cada una; la saciedad sube en vez de bajar y el hambre no frena
  nada). Gestos: sólo los `seated`.
- **Dos pisos** (80 lugares de jacuzzi): la planta baja (`termas`) y el **piso 2** (`termas-2`,
  `cities/termasPiso2/`), dos salas iguales armadas con `spaFloor` (`termas/map.ts`); sólo cambian
  las puertas y el spawn. Se pasa por la **escalera**, que es una `Door` con `stairs` (`access:
  "donor"`): un área de 2 × 2 sobre el piso, en la esquina noroeste contra la pared norte
  (`STAIRS_AREA`; se aparece al pie, en `STAIRS_ARRIVAL`), que el cliente dibuja con `stairsSpec`
  (`buildings.ts`): abajo, escalones de mármol que suben hasta el borde de la pared con baranda y
  pasamanos dorados; arriba, el hueco con los escalones que bajan (recortados al rombo del hueco con
  `clipConvex`, si no lo hondo asomaba por debajo del piso de adelante) y la misma baranda. El piso 2 no tiene
  salida a la calle: `leaveRestricted` usa la de la planta baja (`publicExit`). Lo de acceso, la
  vuelta al entrar al juego y el resto es genérico por `CityInfo.access`, así que vale para los dos.
- **Adentro** (22×18, cada piso): el spa, con dos jacuzzis de 7 × 7 uno al lado del otro (20 lugares cada
  uno: el borde de adentro sin las esquinas), reposeras contra la pared norte y del lado sur, plantas de varios tipos (`plant`,
  `pottedPalm`, `flowers`) y faroles dorados (`lamp`) que se prenden de noche (`nightLights`). Adentro
  no llueve, pero la noche sí llega (sigue la hora del juego).
- **Dibujo**: `TileChar.Floor` (baldosas, caminable) e `InnerWall` (paredes sólo al norte y al
  oeste); `jacuzziSpec(size)` va con `depth` bajo y `occludes: false` (queda detrás de los avatares);
  `Avatar.setBathing` hunde el cuerpo (sin círculo de agua: el agua es la del jacuzzi) (`BATH_DROP`), lo dibuja sin remera (sólo el dibujo: la ropa puesta no cambia), esconde piernas y sombra y dibuja burbujas por
  delante. `indoor`: sin lluvia.
