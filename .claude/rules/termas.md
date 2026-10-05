---
paths:
  - "packages/shared/src/cities/termas/**"
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
  afuera la puerta es el edificio entero; adentro, un tile de la pared oeste (`innerWallSpec(true)`
  la dibuja con puerta). Clic o F → `door:enter { doorId }` (`systems/doors.ts`, con `oncePerTick`):
  `doorBlocked` (donador o admin, y con clave) → si está al lado cruza; si no, camina (`pending:
  "door"`). `crossDoor` guarda, emite el pase con `at` y manda `travel:ok { door: true }` → el
  cliente cambia de sala con `DoorOverlay` (fundido de `DOOR_MS`, no el ómnibus).
- **Acceso en el server**: además del pase, `onJoin` de una sala `access: "donor"` exige donador
  guardado o el nombre de admin (`hasDonorAccess`). `/donador no` estando adentro lo saca por la
  puerta (`leaveRestricted`, desde `setDonor`). Al volver a entrar al juego (`resume`), vuelve a las
  Termas si sigue siendo donador (`canResumeTo`, no pide boleto); si no, Ciudad Vieja con aviso.
- **Jacuzzi** (`CityDefinition.jacuzzis`, `Jacuzzi`: área 3×3 no caminable y `seats`): clic → 
  `jacuzzi:enter { x, y }` → camina al borde del lugar libre más cercano (`seatApproach`) y al llegar
  `enterJacuzzi` lo pone en el lugar con `player.bathing = true` (Schema). Cualquier otra cosa lo
  saca (`standUp` baja `sitting` y `bathing`). Metido recupera `JACUZZI_ENERGY_REGEN` (25/s, un banco
  da 10) y `JACUZZI_HEALTH_REGEN` (el doble del banco) en `Needs.tick`. Gestos: sólo los `seated`.
- **Adentro** (22×18): el spa, con el jacuzzi de 5 × 5 en el medio (12 lugares: el borde de adentro
  sin las esquinas), reposeras simples y dobles alrededor, plantas de varios tipos (`plant`,
  `pottedPalm`, `flowers`) y faroles dorados (`lamp`) que se prenden de noche (`nightLights`). Adentro
  no llueve, pero la noche sí llega (sigue la hora del juego).
- **Dibujo**: `TileChar.Floor` (baldosas, caminable) e `InnerWall` (paredes sólo al norte y al
  oeste); `jacuzziSpec(size)` va con `depth` bajo y `occludes: false` (queda detrás de los avatares);
  `Avatar.setBathing` hunde el cuerpo (`BATH_DROP`), esconde piernas y sombra y dibuja el agua por
  delante con burbujas. `indoor`: sin lluvia.
