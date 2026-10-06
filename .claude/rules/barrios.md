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
- Diseño de Ciudad Vieja (150×96): **sobre el plano real** (OpenStreetMap, 12 m por tile, grilla girada
  como las calles; `ciudadVieja/grid.ts` tiene las calles en metros reales y el paso a tiles, y el
  relevamiento está en `docs/finished/ciudad-vieja-mapa-real.md`). **Cada calle es una franja de 4
  tiles** (`streetBand`: vereda `TileChar.Sidewalk`, calzada de 2 y vereda; la peatonal Sarandí, toda
  `Pedestrian`), en su orden real: filas `ROW_STREETS` (Rambla 25 de Agosto … Reconquista), columnas
  `COLUMN_STREETS` (Juan Lindolfo Cuestas … Florida). **En los cruces no hay vereda**: un tile de
  vereda con calzada a los dos lados pasa a calzada (las esquinas quedan), y las calles que cruzan la
  peatonal Pérez Castellano siguen derecho. Entre franjas quedan manzanas de ~4 tiles con
  **edificios de relleno de 2 × 2** (`CityDefinition.fillers`, `Filler` sobre tiles `Building`:
  `bigHouseSpec` en el casco, `bigTowerSpec` al este de Florida) y algún lote de patio con árboles:
  ~450 objetos. Puerto al norte con barcos pesqueros en la bahía (`CityDefinition.boats`: sólo decorado,
  `boatSpec` escalado a 3 × 3, se mecen con un tween), faroles en las ramblas (`streetLamps`: decorado
  que no ocupa el tile, se prenden de noche; los bancos ya no tienen luz), bancos simples y dobles
  (`Bench.pair`, `doubleBench`: dos lugares que se dibujan como un banco largo), casas coloniales del
  1800 (`bigHouseSpec`: cal de color, rejas, balconcitos, azotea con balaustrada, tejas o mirador) y
  edificios del 900 al este de Florida (`bigTowerSpec`); el Palacio Salvo ocupa 6 × 6 con la torre en
  la esquina noroeste y sus "cohetes"; costa sur en diagonal (`southCoast`) con rambla de 2 tiles y dos
  escolleras iguales sobre la rambla oeste: la Sarandí, al final de la peatonal (`ESCOLLERA_PLATFORM`),
  y la norte, en las filas 14–16 (`ESCOLLERA_NORTE_PLATFORM`, farola en 1,10). Plaza Independencia
  (spawn) con la Puerta de la Ciudadela al oeste (dos arcos sobre Sarandí), el Monumento a Artigas, el
  Palacio Salvo en la esquina este (18 de Julio sale de ahí) y la Torre Ejecutiva y el Palacio Estévez
  al sur; Teatro Solís al suroeste; Plaza Matriz con la Catedral (oeste) y el Cabildo (este); Plaza
  Zabala con el Palacio Taranco; Mercado del Puerto frente a la bahía; Templo Inglés y Plaza España
  sobre la rambla sur. La guía de bienvenida toma sus áreas de `CIUDAD_VIEJA_INFO` (por id).
- Centro (127×68, `centro/grid.ts`, spawn en las dos mitades de la Plaza Cagancha): **el mismo patrón que Ciudad Vieja**
  (franjas de 4 tiles, sin vereda en los cruces, manzanas de 6 × 8 llenas de `fillers` de 2 × 2,
  `bigTowerSpec`: ~580). **Delante de cada emblemático y cada local** (al sur y al este, las fachadas
  que ve la cámara) quedan dos tiles de patio de baldosa, y los lotes cercanos a ese frente son casonas
  bajas (`kind: "house"`, `inFrontOfLandmark`): con edificios altos ahí, los tapaban casi enteros, con las calles en su orden real y las distancias comprimidas: filas Mercedes,
  Colonia, **18 de Julio** (avenida de 6: vereda doble a cada lado), San José y Soriano; columnas
  Andes … Ejido. Las calles se arman por tile (calzada si está en la calzada de alguna, vereda si
  está en alguna vereda), así los cruces salen solos también con la vereda doble. Emblemáticos, cada uno
  dibujado como el real (`landmarks/centro/`, con `common.ts` para la esquina redondeada:
  `roundedBox`, `roundedBand`, `cylinder`): Palacio Rinaldi (`artDeco`: ocho pisos arena, zigzag en
  los antepechos, bow windows y remates escalonados), Palacio Lapido (`modernTower`: doce pisos
  blancos que doblan la esquina en curva con balcones corridos, retranqueos y la torre), Palacio Díaz
  (`decoTower`: 17 pisos con pilastras corridas y el remate escalonado), London París
  (`departmentStore`: torre octogonal de la esquina con el letrero, el reloj triple, el templete, la
  cúpula de zinc y el Atlas; además es la tienda `building: "none"` con ropa exclusiva,
  `LONDON_PARIS_FASHION`), Plaza Fabini con El Entrevero (`entrevero`, en la fuente) y canteros, la Fuente de los Candados (`lockFountain`, 2×2 pegada al este del Café Facal, `centro/fuenteCandados.ts`), el
  Edificio Rex / Sala Zitarrosa (`cinema`: esquina curva y la cúpula mirador iluminada), Plaza
  Cagancha a los dos lados de 18 de Julio (`CAGANCHA` al sur y `CAGANCHA_NORTE`, sin edificios de
  relleno), con la Columna de la Paz (`peaceColumn`) en el medio de la calzada, sobre una isla de
  baldosa, y el Mercado de los Artesanos en la mitad sur,
  Palacio Piria (`frenchPalace`: mansarda, frontón y el pabellón de la esquina con cúpula), Palacio
  Santos (`italianPalace`: renacimiento italiano, pórtico y balaustrada con jarrones) y, pasando
  Ejido, la explanada con el David (`statue`), la Niké de Samotracia (`victoryStatue`) y la
  Intendencia (`cityHall`, 8 × 8: torre de 22 pisos de hormigón con el ascensor exterior y el mirador,
  pórtico y escalinata; con el cartel "MW").
  Es **el barrio con más tiendas** (11): London París, ropería, sombrerería, Calzados 18 de Julio
  (también los championes rápidos), farmacia, kiosco, confitería, Café Facal (`cafe`), Mercado de
  los Artesanos (`crafts`), Mercado de la Abundancia (rotisería) y la Casa de Música (`music`,
  instrumentos). Faroles sobre 18 de Julio y en la explanada. La Plaza Cagancha tiene **guirnaldas de lucecitas** (`CityDefinition.stringLights`: postes en las esquinas de cada mitad, guirnaldas por el borde y en cruz, y dos que cruzan la avenida; las dibuja `game/city/stringLights.ts`: cada tramo con la profundidad de su tile, horneados juntos en una textura por profundidad; de noche cada lamparita suma un halo). Su actividad es **tocar en la calle** (`busking`: toda
  18 de Julio, Fabini, Cagancha y la explanada; ver `pesca-y-venta.md`).
  **Se llega caminando desde Ciudad Vieja** (ver "Barrios conectados a pie", abajo).
- Tres Cruces (84×64, spawn en la explanada del shopping): manzanas con **edificios en altura** (`TileChar.Tower` → `towerSpec`) y casas
  sobre el borde (`LayoutBuilder.edges`), Bulevar Artigas y Av. Italia, el Shopping (con la
  terminal y la tienda `building: "none"` "Moda Tres Cruces"), el Sanatorio Americano, el Obelisco y
  el Parque Batlle con el Velódromo y el Estadio Centenario (óvalos con gradas: `drawBowl`), la
  Explanada del Centenario (zona de venta) y el Kiosco del Parque (carritos).
- Barrio de los Judíos (Villa Muñoz, 84×64, spawn en la Plazoleta Villa Muñoz frente a San
  Pancracio): grilla de manzanas de casas bajas (`edges` al 40 % del borde, pocos árboles: ~730
  objetos, como Tres Cruces; con el borde lleno pasaba los 1.500), Arenal Grande doble mano con
  veredas anchas y la peatonal Emilio Reus (3 tiles, con bancos) entre las **Casas de Reus al Norte**
  (`reusHouses`: una pieza 1×1 pastel por tile, color por `tileHash`). Emblemáticos: Mercado Agrícola
  (el MAM, `agriMarket`: bóveda de hierro y vidrio), Iglesia de San Pancracio (`church`) y el Espacio de Arte Contemporáneo en la ex
  Cárcel de Miguelete (`artCenter`, con el cartel "MW"). Tiene 9 tiendas (sólo el Centro tiene más):
  mayoristas de ropa (`wholesale`, `shoes`, con `priceFactor` 0,75), Moda Coreana (ropa exclusiva,
  `KOREAN_FASHION`), panadería (`bakery`), rotisería (`rotisserie`), farmacia y un puesto de tortas
  fritas. Sin zona de venta: la venta con carrito es de los hinchas del Centenario.
- **Barrios ocultos** (`CityInfo.hidden`, hoy **Tres Cruces** y el **Barrio de los Judíos**: por
  ahora sólo se juega en Ciudad Vieja, el Centro y el COMCAR): no salen en la lista (`isPublicCity`) ni
  en la landing (tampoco sus tarjetas de `FEATURES`, con `cityId`), `travel:request` los rechaza,
  quien había quedado ahí vuelve a Ciudad Vieja (`canResumeTo`), sus tiendas no salen en
  `whereToBuy` y, sin el Sanatorio, el desmayo te despierta en la plaza (`hospitalDoor`). Con eso
  tampoco hay venta en el Centenario, partidos ni guardia, y no se movieron a otro barrio: lo que los
  nombra se esconde con `isVendingOpen()` (alguna tienda abierta vende carritos: el atajo del carrito,
  los partidos del panel del admin) e `isHospitalOpen()` (el tooltip de salud y el aviso de "estás
  débil" mandan a la farmacia). Para volver a abrirlos, sacar `hidden: true` de su `info.ts`: todo
  vuelve solo.
- **Barrios conectados a pie** (Ciudad Vieja ↔ Centro, por 18 de Julio): el último tile de la
  avenida en el borde de cada mapa es una `Door` con `edge: true`, marcada con un **arco de calle**
  (`CityRenderer.drawPortals`, piezas 1 × 1 de `portalSpec`: pilares de piedra clara con farol de
  hierro en las puntas, sobre las veredas, y el arco de hierro forjado con volutas sobre la calzada,
  con la chapa azul del nomenclátor; cartel "18 de Julio · hacia <destino>", faroles que se prenden de
  noche; no tapa al avatar). Mismos colores que la Puerta de la Ciudadela y los edificios del 900. El
  hover la marca y el cartel de F dice "Caminar al Centro". Clic, F o **WASD contra el borde**
  (`LocalMover.edgeDoorAhead` → `MoverHost.enterDoor`, una vez hasta soltar) → `door:enter` → el
  server camina hasta ahí y cruza sin boleto (`crossDoor`, `travel:ok` con `walk`: el fundido dice
  "🚶 Caminando a…"). Se aparece en la otra punta de 18 de Julio (Centro 1,30; Ciudad Vieja 148,53).
  `CityInfo.onFoot`: al volver a entrar al juego se vuelve a ese barrio sin boleto (`canResumeTo`).
  El Centro igual sale en la lista de barrios y se puede ir en ómnibus.
- **NPCs** (`CityDefinition.npcs`, hoy el barman del casino): personajes que no son jugadores, sólo del cliente (`objects/Npcs.ts`: un `Avatar` con nombre que pasea por su `roam`, sin clic). Su `roam` tiene que ser no caminable (p. ej. dentro de un landmark) para que nadie se le pare encima.
- Salas con acceso (`CityInfo.access`, hoy las Termas del Donador): no salen en la lista ni en la
  landing, no se llega en ómnibus y se entra por una `Door` (ver `termas.md`). `indoor`: sin noche
  ni lluvia. Tiles de interior: `Floor` e `InnerWall`.
- Antes de `scatter` de árboles, poner `Plaza` bajo el área de cada emblemático: si no, le crecen
  árboles adentro.
- Logo: `CityDefinition.logoSign = { landmarkId }` pone el cartel "MW" sobre el techo de ese edificio
  emblemático (en Ciudad Vieja, el **Cabildo**). El punto del techo de cada tipo es el `roof` de su
  dibujo (`landmarks/<barrio>/<edificio>.ts`, coordenadas del dibujo base; se escala con el edificio) y el nombre del edificio se
  sube por encima del cartel. La escena carga `/mw-logo.svg` en `preload` (`LOGO_TEXTURE`).
- Render (`game/city/`): cada volumen se dibuja con `IsoPainter` y se **hornea una vez**, en el
  atlas del barrio (`PieceAtlas`: páginas de 2048 px, `atlas-<barrio>-N`, que se suben a la GPU al
  terminar de armarlo); piezas iguales comparten cuadro. Al irse del barrio se liberan el atlas, el
  piso y las guirnaldas (`CityRenderer.destroy`); el `Phaser.Game` sigue vivo entre viajes. Las áreas de un solo volumen deben ser
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
   barrio (y lo consume; al volver a entrar al juego, el pase lo da `onAuth`, ver `ingreso.md`): no se puede viajar gratis pidiendo otra sala desde el cliente. Sin clave
   (navegador sin almacenamiento) no se puede viajar.
   **Paradas de ómnibus** (`CityDefinition.busStops`: un tile no caminable con `name` y `facing`,
   como los bancos): clic en una → la escena camina al avatar a un tile pegado (`approachTile`) y al
   llegar emite `bus-stop:open` → React abre la misma lista de barrios que la tecla M (si ya estás
   al lado, se abre directo). Es sólo del cliente: el viaje lo sigue validando el server (y gasta el boleto).
4. Si tiene un cartel "MW" (`logoSign`), darle `roof` (punto del techo) al dibujo de ese edificio.
