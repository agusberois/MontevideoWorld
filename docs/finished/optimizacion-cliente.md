# Plan de optimización del cliente (render y mapas)

Objetivo: que el juego vaya fluido (60 fps en escritorio, 30+ estable en un celular de gama media)
en el barrio más pesado, **el Centro**, también de noche, con lluvia y con 20+ jugadores a la vista.

## Diagnóstico (lo que se ve en el código)

En WebGL, Phaser **vuelve a triangular cada `Graphics` en cada frame** (no se cachea), y cada vez
que el orden de dibujo pasa de una `Image` a un `Graphics`, o de una textura a otra que no entra en
el lote, **vacía el lote** (un *draw call* más). Lo que más pesa:

| # | Qué | Dónde | Por qué pesa |
| - | --- | --- | --- |
| 1 | **Guirnaldas de la Plaza Cagancha**: un `Graphics` por tramo de cable (166 en el Centro) más uno por poste | `city/stringLights.ts` | 170 `Graphics` que se re-triangulan cada frame, cada uno con su propia profundidad, mezclados con los edificios: cortan el lote cientos de veces. **Es lo único que tiene el Centro y no Ciudad Vieja.** |
| 2 | **Halos de noche**: un solo `Graphics` con 6 círculos por luz (36 faroles + 166 lamparitas en el Centro ≈ 1.200 círculos) | `city/DayNight.ts`, `stringLightGlows` | De día no se dibuja (alpha 0), pero **de noche** son ~1.200 círculos re-triangulados por frame y con mezcla ADD (mucho *fill rate*). |
| 3 | **Avatares**: ~22 `Graphics` por avatar (piernas, brazos, torso, pelo, cara, ojos, gorro, caña, carrito, agua…) y 3–4 `Text` | `objects/Avatar.ts` | Con 20 jugadores son ~440 `Graphics` por frame. Las formas casi nunca cambian: sólo se mueven, rotan o escalan. |
| 4 | **Sin *culling***: se procesan todas las piezas del barrio aunque estén fuera de cámara (~730 en el Centro: 546 edificios de relleno, 99 árboles, bancos, faroles, 24 edificios y tiendas, carteles) | `city/CityRenderer.ts` | CPU por objeto en cada frame (transformación, lote) sin que se vea. |
| 5 | **Oclusión** recorre todas las piezas en cada frame (polígono y AABB) | `CityRenderer.updateOcclusion` | ~730 chequeos por frame aunque el avatar esté quieto. |
| 6 | **Muchas texturas distintas**: cada variante de edificio (`eclectic-…`, `tower-…`, `house-…`, `colonial-…`) es una textura suelta | `city/buildings.ts` + `placePiece` | Más cambios de textura (más lotes) y más memoria de GPU (las de 2×2 altas son grandes). |
| 7 | **Carteles y nombres como `Text`**: cada uno es su propio canvas y su propia textura | `addSign`, `Avatar` | Cada uno corta el lote. Son ~30 carteles más 3–4 por avatar. |
| 8 | **Lista de jugadores**: `JSON.stringify` del resumen de un jugador en **cada** `onChange` (cada paso de cada jugador) | `CityScene.updateRoster` | CPU por tick y re-render de React de lo que lea `players`. |
| 9 | **Lluvia**: `Graphics` de partículas redibujado por frame | `city/WeatherFx.ts` | Lo mismo que el 1, en pantalla completa. |
| 10 | **Resolución y antialias**: `antialias: true`, sin tope de `devicePixelRatio` | `createGame.ts` | En pantallas retina o celulares con DPR 3 se dibujan 4–9 veces más píxeles. |

## Estado (2026-10-06)

Hecho y probado en el navegador (Ciudad Vieja y el Centro, de día y de noche, con zoom 2×):

- **Medidor** `?perf=1` (`game/PerfOverlay.ts`): fps, ms, objetos dibujados / totales, `Graphics` y
  `Text`, texturas.
- **Guirnaldas horneadas** por profundidad (`stringLights.ts`): de ~180 `Graphics` a imágenes. En el
  Centro de noche el medidor marca 8 `Graphics` dibujándose (de 28 en total).
- **Halos de noche**: una textura de halo y una `Image` teñida por luz (`DayNight.ts`).
- **Avatar horneado** (`objects/ShapeSprite.ts`): piernas, brazos, torso, cabeza, pelo, cara, ojos,
  lentes y gorros son `Image` con textura compartida por forma (a 2× para el zoom máximo). Quedan
  como `Graphics` sólo los accesorios y efectos, y sólo mientras se ven.
- ***Culling*** de piezas y carteles por cámara (`CityRenderer.updateCulling`): en el Centro dibuja
  ~480 de 1.132 objetos.
- **Oclusión** que no recorre nada si el avatar está quieto y no hay fundidos.
- **Lista de jugadores** con una firma barata y a lo sumo un envío por frame.
- **`findPath`** con arrays tipados reusados: los mismos caminos (9.000 casos comparados) y ~3 veces
  más rápido. Sirve al cliente y al server.
- Sin MSAA en celular (`antialiasGL`), `powerPreference: "high-performance"` y la mitad de gotas de
  lluvia en celular. (El tope de `devicePixelRatio` no hacía falta: Phaser 3.90 en modo `RESIZE` ya
  dibuja a resolución CSS.)

Segunda tanda (también probada en el navegador, ida y vuelta Ciudad Vieja ↔ Centro):

- **Atlas por barrio** (`city/PieceAtlas.ts`): las piezas en páginas de 2048 px. Ciudad Vieja pasó
  de 317 texturas a 102.
- **Juego persistente** (`PhaserGame` + `startCity`): al viajar sólo se cambia la escena; las texturas
  del barrio (atlas, piso, guirnaldas) se liberan al irse (`CityRenderer.destroy`) y las compartidas
  (avatares, halos, clima) quedan. Ida y vuelta: 102 → 118 → 102, no se acumulan.
- **Mascotas horneadas** (`bakingGraphics` / `bakeGraphics` en `ShapeSprite.ts`).
- **Distintivos "♥ DONADOR" y "🔒 PRESO"** con una textura compartida (`objects/labels.ts`).
- **Lluvia y viento con imágenes** de una textura de cuadros, en un contenedor (`WeatherFx.ts`). Al
  principio fue un `Blitter`, pero Phaser no le aplica la escala y con zoom las gotas quedaban
  corridas o fuera de pantalla.
- **Opciones (tecla O) → calidad gráfica** automática / alta / baja (`lib/quality.ts`,
  `QualityWatch.ts`): en baja no hay halos de noche ni lluvia ni viento; en automática baja sola si
  dos tandas seguidas de 5 s no llegan a 24 fps (con la pestaña oculta no mide), y avisa. Primero era
  40 fps y apagaba luces y lluvia en compus normales: el ahorro de energía de Chrome y el bajo
  consumo de Safari limitan a 30 fps.

Se decidió no hacer:

- **Nombres con `BitmapText`**: cada nombre es distinto y una fuente bitmap perdería tildes, ★ y
  emojis; con el atlas y los distintivos compartidos, el resto de los `Text` pesa poco.
- **Menos variantes de edificios**: con el atlas ya no cuestan cambios de textura, sólo un poco de
  memoria.

Falta medirlo en un celular real.

## Fase 0 — Medir primero (½ día)

- Overlay de rendimiento con `?perf=1` (sólo cliente): fps, ms por frame, cantidad de objetos de la
  escena, cuántos `Graphics` y cuántos `Text`, y *draw calls* (contando los `flush` del renderer de
  Phaser).
- Escenarios fijos para comparar antes y después: Centro de día en 18 de Julio y Yí, Centro de noche
  en la Plaza Cagancha, Ciudad Vieja en la Plaza Independencia, cada uno con 0 y con 20 bots
  caminando. Medir en escritorio y en un celular de gama media (Chrome remote debugging +
  Performance).
- Anotar la línea base en este documento.

## Fase 1 — Lo que más rinde (1–2 días)

1. **Guirnaldas horneadas.** Cada guirnalda (cable, lamparitas y postes) se hornea a una textura una
   sola vez (`generateTexture`, como `placePiece`). Para que la profundidad siga bien, se parte en
   piezas por tile (como la Puerta de la Ciudadela). De ~170 `Graphics` a ~30 `Image` que entran en
   el lote.
2. **Halos de noche como imágenes.** Una textura de halo (degradé radial, hecha una vez) y una
   `Image` por luz con `tint` y `scale`. Mejor todavía, como las luces no se mueven, hornearlas en
   trozos de `RenderTexture` como el piso (`drawGround`) y sólo cambiarles el alpha. De ~1.200
   círculos por frame a un puñado de *quads*.
3. **Tope de resolución y de antialias.** Limitar el `devicePixelRatio` efectivo (por ejemplo 1,5 en
   celular y 2 en escritorio) y probar `antialias: false` + `roundPixels: true` en celular. Pedir
   `powerPreference: "high-performance"`.
4. **`updateRoster` sin `JSON.stringify`**: comparar campo por campo sólo lo que muestra la lista
   (nombre, barra, preso, actividad) y no reaccionar a `x/y`.

Con esto el Centro de noche debería quedar parejo con Ciudad Vieja.

## Fase 2 — Avatares y cantidad de objetos (2–3 días)

5. **Avatar horneado.** Cada parte (torso con la ropa, brazo, pierna, cabeza con el pelo, gorro de
   frente y de espaldas) se hornea a una textura por combinación de aspecto y ropa
   (`avatar-<parte>-<clave>`, con caché por clave y contando referencias para liberarla). El
   `Container` pasa a tener `Image` que sólo se mueven, rotan y escalan, como ahora. Los accesorios
   (caña, carrito, instrumento, termo) también se hornean una vez por color. Se quedan como
   `Graphics` sólo lo que de verdad cambia cada frame (la línea de pesca, las burbujas y los
   efectos), y sólo mientras están visibles. Las formas siguen saliendo de `lib/avatar/` (la vista
   previa en SVG no cambia).
6. **Nombres con `BitmapText`.** Generar una fuente bitmap (o una textura por nombre en un atlas)
   para nombres, "♥ DONADOR" y "🔒 PRESO". Los carteles fijos del mapa (`addSign`,
   `drawPlaceLabels`) se hornean en el atlas del barrio.
7. ***Culling* por cámara.** Una grilla espacial (por ejemplo de 8×8 tiles) con las piezas del mapa.
   Cuando la cámara se mueve o cambia el zoom, sólo quedan visibles las celdas que tocan
   `camera.worldView` más un margen (`setVisible(false)` hace que Phaser se las saltee). Lo mismo
   para avatares, mascotas, picudos y NPC lejanos (siguen actualizando su posición, pero no se
   dibujan).
8. **Oclusión barata.** Sólo recalcular cuando el avatar propio cambia de tile o termina el fundido,
   y sólo con las piezas de las celdas de la grilla cercanas (las que pueden tapar: al sur y al este
   del avatar).

## Fase 3 — Texturas y carga (2 días)

9. **Atlas por barrio.** Hornear todas las variantes de edificios, árboles, bancos y faroles de un
   barrio en 1–3 `DynamicTexture` grandes (2048 o 4096 según `maxTextureSize`) y usar *frames*. Así
   todo el mapa entra en pocos lotes (Phaser junta hasta 16 texturas por lote, pero con decenas de
   texturas igual corta).
10. **Menos variantes.** Revisar cuántas claves distintas salen de `houseSpec`, `bigTowerSpec`,
    `eclecticSpec` y `colonialSpec` (pisos × color × detalle) y recortar a las que se distinguen a la
    vista. Se puede tintar en lugar de hornear un color por variante.
11. **Hornear sin trabar la entrada.** Hoy todo se hornea de un saque en `create()`. Repartirlo en
    varios frames (primero lo cercano al spawn) detrás del fundido de entrada, y conservar las
    texturas entre viajes si el `Phaser.Game` se recrea (revisar `PhaserGame.tsx`: si se destruye al
    viajar, se re-hornea todo cada vez).
12. **Lluvia con `ParticleEmitter`** y una textura de gota, en lugar del `Graphics` por frame, con
    menos gotas en celular.

## Fase 4 — Pulido y modo "calidad baja" (1 día)

13. **Opción de calidad** en el menú (automática según los fps de los primeros segundos):
    "baja" = sin halos de noche, sin lluvia, sin oclusión con fundido (corte directo), DPR 1 y sin
    animación de respirar o parpadear en avatares lejanos.
14. **Ticks por frame.** Pasar a eventos lo que hoy se recalcula en cada `update` sin necesidad
    (`JacuzziCounters.update`, que puede escuchar `bathing/x/y`, `updateLocator`, la flecha fuera de
    pantalla), o hacerlo cada 100–250 ms.
15. **Camino del cliente.** `CityMap.findPath` usa `Map` y objetos por nodo. Pasarlo a `Int32Array`
    (vecinos por índice) acelera la predicción de WASD y clics en mapas de 127×68 o 150×96, y de
    paso el server.

## Cómo validar cada fase

- Mismos escenarios de la Fase 0, antes y después, anotados en este archivo.
- `npm run sim:movement -w @montevideo-world/client` sigue dando 0 (si se toca el avatar o el mover).
- Revisión visual: que la profundidad de las guirnaldas, los halos y los avatares hundidos (jacuzzi,
  bancos) se vea igual que ahora, de día y de noche.
- Probar al viajar entre barrios que no haya fugas de texturas (contar `textures.list` antes y
  después de ir y volver).

## Orden sugerido

Fase 0 → 1 (el Centro debería mejorar mucho ya acá) → 2 → 3 → 4. Cada punto se puede mergear
solo.
