---
paths:
  - "packages/shared/src/cities/**"
  - "packages/shared/src/map.ts"
  - "apps/client/src/game/city/**"
  - "apps/client/src/features/cities/CityMenu.tsx"
  - "apps/client/src/features/cities/TravelOverlay.tsx"
  - "apps/server/src/rooms/systems/travel.ts"
  - "apps/client/src/lib/cityMaps.ts"
---

# Barrios (ciudades) y mapa

- Un barrio es una carpeta en `packages/shared/src/cities/<barrio>/` con dos archivos:
  `info.ts` (`CityInfo`: id, nombre, descripción, `landmarks`, `shops`; lo liviano, que el navegador
  tiene siempre por `CITY_INFOS` en la entrada principal de shared) y `map.ts` (`CityDefinition` =
  la info + `layout`, un carácter por tile, ver `TileChar`, `spawnArea`, `benches`, `busStops`,
  `placeLabels`, `vending`, `prison`). Ejes: **x = oeste→este, y = norte→sur**.
- Los mapas completos están en la entrada `@montevideo-world/shared/cities` (`CITIES`, `getCity`,
  `getCityMap`): la usa el server. El cliente **no** la importa: `lib/cityMaps.ts` descarga el mapa de
  cada barrio con `import("@montevideo-world/shared/cities/<barrio>")` (un chunk por barrio) en
  paralelo con la conexión (`joinCity`), y la escena lo toma ya cargado (`loadedCityMap`). En la
  entrada principal de shared no importar nada de `cities/*/map.ts` (se volverían a bajar todos).
- Caminable = `WALKABLE_TILE_CHARS` (rambla, calle, peatonal, plaza, pasto) **menos** el área de los
  `landmarks` (salvo sus `passable`, p. ej. el arco de la Puerta de la Ciudadela), los `benches`,
  las `busStops` y las `shops`.
  Los bancos miran al sur o al este (hacia la cámara) para que se vea de frente a quien se sienta. Lo calcula `CityMap`,
  que usan igual el server (validar movimiento, pathfinding, spawn) y el cliente (hover/clic).
- **Tamaño**: cada barrio está pensado para 25–50 jugadores a la vez sin amontonarse: spawn amplio,
  muchos bancos, escollera / explanada grandes. `Player.x/y` son `uint8`: ningún mapa puede pasar
  de 255 tiles de ancho ni de alto (quedarse muy por debajo, ~120).
- Diseño de Ciudad Vieja (74×58, río desde la fila 44): manzanas como **parques de pasto caminable** con pocas casas sueltas y
  árboles (sólo donde no cortan el paso); los edificios emblemáticos son los protagonistas. Plazas:
  Independencia (spawn, con canteros y palmeras), Matriz, Zabala y España; rambla Gran Bretaña de dos
  tiles con bancos mirando al río; Escollera Sarandí de 3 tiles de ancho con plataforma en la punta.
- Tres Cruces (84×64, spawn en la explanada del shopping): manzanas con **edificios en altura** (`TileChar.Tower` → `towerSpec`) y casas
  sobre el borde (`LayoutBuilder.edges`), Bulevar Artigas y Av. Italia, el Shopping (con la
  terminal y la tienda `building: "none"` "Moda Tres Cruces"), el Sanatorio Americano, el Obelisco y
  el Parque Batlle con el Velódromo y el Estadio Centenario (óvalos con gradas: `drawBowl`), la
  Explanada del Centenario (zona de venta) y el Kiosco del Parque (carritos).
- Barrio de los Judíos (Villa Muñoz, 84×64, spawn en la Plazoleta Villa Muñoz frente a San
  Pancracio): grilla de manzanas de casas bajas (`edges` al 40 % del borde, pocos árboles: ~730
  objetos, como Tres Cruces; con el borde lleno pasaba los 1.500), Arenal Grande doble mano con
  veredas anchas y la peatonal Emilio Reus (3 tiles, con bancos) entre las **Casas de Reus al Norte**
  (`reusHouses`: una pieza 1×1 pastel por tile, color por `tileHash`). Emblemáticos: Sinagoga
  (`synagogue`), Iglesia de San Pancracio (`church`) y el Espacio de Arte Contemporáneo en la ex
  Cárcel de Miguelete (`artCenter`, con el cartel "MW"). Es **el barrio con más tiendas** (9):
  mayoristas de ropa (`wholesale`, `shoes`, con `priceFactor` 0,75), Moda Coreana (ropa exclusiva,
  `KOREAN_FASHION`), panadería (`bakery`), rotisería (`rotisserie`), farmacia y un puesto de tortas
  fritas. Sin zona de venta: la venta con carrito es de los hinchas del Centenario.
- Antes de `scatter` de árboles, poner `Plaza` bajo el área de cada emblemático: si no, le crecen
  árboles adentro.
- Logo: `CityDefinition.logoSign = { landmarkId }` pone el cartel "MW" sobre el techo de ese edificio
  emblemático (en Ciudad Vieja, el **Cabildo**). El punto del techo de cada tipo es el `roof` de su
  dibujo (`landmarks/<barrio>/<edificio>.ts`, coordenadas del dibujo base; se escala con el edificio) y el nombre del edificio se
  sube por encima del cartel. La escena carga `/mw-logo.svg` en `preload` (`LOGO_TEXTURE`).
- Render (`game/city/`): cada volumen se dibuja con `IsoPainter` y se **hornea una vez a textura**
  (`generateTexture`); piezas iguales comparten textura. Las áreas de un solo volumen deben ser
  **cuadradas**: así un único depth `(x + w - 1 + y) * TILE_HEIGHT/2 + 1` ordena bien contra los avatares
  (depth = y de los pies). Áreas alargadas se parten en piezas 1×1 (ver `gatePieces`).
- El piso se hornea en trozos de `GROUND_CHUNK` (2048 px) como mucho (`drawGround`): una sola textura
  de un mapa grande pasaría el máximo de muchas GPU de celular (4096 px).
- Cada dibujo de landmark está escrito para un tamaño base; si el `area` es más grande se escala al
  hornear (`PieceSpec.scale`): crece en planta y en altura sin pixelarse.
- Sólo se ven las caras **sur** (izquierda) y **este** (derecha): las fachadas importantes van ahí.
- Los edificios que tapan al avatar propio se vuelven translúcidos (`updateOcclusion`). Nombre y globo
  del avatar viven en un overlay por encima de todo.

## Agregar un barrio

1. Crear `packages/shared/src/cities/<barrio>/info.ts` (`<BARRIO>_INFO ... satisfies CityInfo`) y
   `map.ts` (usar `LayoutBuilder`; `{ ...<BARRIO>_INFO, layout, … }`). Sumar el id a `CITY_IDS`
   (`types.ts`): TypeScript pide después la info en `CITY_INFOS` (`cities/info.ts`, por orden de la
   lista), el mapa en `BY_ID` y `CITIES` (`cities/index.ts`) y su `import()` en `LOADERS`
   (`apps/client/src/lib/cityMaps.ts`).
2. Si tiene un tipo de edificio nuevo: agregarlo a `LandmarkKind`, dibujarlo en
   `game/city/landmarks/<barrio>/<edificio>.ts` (exporta un `LandmarkDrawing`: `size`, `maxZ`, `draw`, o
   `pieces` si el área es alargada) y sumarlo a `LANDMARKS` (`landmarks/index.ts`; no compila si falta).
   Lo que compartan varios edificios va en `common.ts` (general o del barrio).
3. Aparece solo en la lista (tecla M, sólo nombres) con su botón **Ir · 1 boleto**. Cada viaje gasta
   un **Boleto STM** de la mochila (`TicketItem`, `TICKET_ID`, categoría `ticket`): se compran a
   `TRAVEL_FARE` ($52) en la **Agencia STM** de Ciudad Vieja (27,3, sobre la Rambla 25 de Agosto,
   `building: "stm"`), se apilan y se pueden intercambiar o vender a mitad de precio. Los avisos dicen
   dónde comprarlos con `whereToBuy(TICKET_ID)` (sale de las tiendas que los tienen en `stock`).
   `travel:request { cityId }` → el server saca un boleto de la mochila (sin boleto, aviso), guarda el
   progreso y emite un pase (`travelTickets`, vence en `TRAVEL_TICKET_MS`) → `travel:ok` → `App.travel`
   sale de la sala y `travelTo(cityId)` entra a la del destino con el mismo nombre, aspecto y clave.
   Mientras tanto se ve `TravelOverlay` (ómnibus de STM animado en SVG/CSS); el viaje dura como
   mínimo `TRAVEL_MS` (5 s) aunque el server responda antes.
   `CityRoom.onJoin` rechaza entrar a un barrio que no sea el de spawn sin boleto vigente para ese
   barrio (y lo consume): no se puede viajar gratis pidiendo otra sala desde el cliente. Sin clave
   (navegador sin almacenamiento) no se puede viajar.
   **Paradas de ómnibus** (`CityDefinition.busStops`: un tile no caminable con `name` y `facing`,
   como los bancos): clic en una → la escena camina al avatar a un tile pegado (`approachTile`) y al
   llegar emite `bus-stop:open` → React abre la misma lista de barrios que la tecla M (si ya estás
   al lado, se abre directo). Es sólo del cliente: el viaje lo sigue validando el server (y gasta el boleto).
4. Si tiene un cartel "MW" (`logoSign`), darle `roof` (punto del techo) al dibujo de ese edificio.
