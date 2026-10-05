# Ciudad Vieja real: dónde está cada cosa (para rehacer el mapa)

**Fecha:** 2026-10-05

> ✅ Aplicado (2026-10-05): el mapa de Ciudad Vieja se rehízo con esta propuesta, al final a **12 m
> por tile** (calles de 2 tiles con vereda de 1 de cada lado y edificios de relleno de 2 × 2). Las
> fórmulas de paso a tiles del juego están en `packages/shared/src/cities/ciudadVieja/grid.ts`
> (`tileX`, `tileY`); ver `.claude/rules/barrios.md`.

**Resumen:** relevamiento de la Ciudad Vieja de Montevideo con datos de **OpenStreetMap**
(coordenadas de cada edificio con Nominatim y trazado de las calles con Overpass), pasado a tiles
del juego para que el mapa nuevo respete **el orden y las distancias reales**. Hay que corregir tres
cosas grandes del mapa de hoy:

1. **La Plaza Independencia está en la punta este**, con el Palacio Salvo en su **esquina este**, no al norte.
2. **El Teatro Solís queda al suroeste de la plaza y la Puerta de la Ciudadela, en su lado oeste.**
   La Puerta es la entrada a la peatonal Sarandí.
3. **La Escollera Sarandí sale de la punta oeste de la península hacia el oeste**, no hacia el sur
   frente a la plaza.

Abajo están las calles, los edificios con su tile propuesto, la forma de la costa, una comparación
con el mapa actual y un plan para rehacerlo.

## 1. Cómo se midió

- **Fuente:** OpenStreetMap, consultado el 2026-10-05. Hay 34 lugares con coordenadas (lat/lon)
  y el trazado de 70 calles de la zona.
- **La grilla está girada.** Las calles "largas" (Sarandí, 25 de Mayo, Cerrito…) no van de oeste a
  este exactos: suben hacia el norte a medida que van al este, **21,3°** (promedio pesado de
  Sarandí, 25 de Mayo, Cerrito, Rincón, Buenos Aires, Piedras y Reconquista). El juego no necesita
  ese giro: se mide en un sistema **girado como las calles**.
  - **u** = metros a lo largo de las calles (de la punta oeste hacia la Plaza Independencia).
  - **v** = metros de través (de la bahía, al norte, hacia el río, al sur).
  - Origen en (-34.9065, -56.2060), más o menos Rincón y Misiones.
- **Pasar a tiles** (x crece hacia el este, y hacia el sur, como el juego):
  - **x = round((u + 840) / M) + 2**
  - **y = round((v + 400) / M) + 2**
  - M = metros por tile. Las tablas traen dos escalas: **20 m** (fiel) y **15 m** (más espacio para jugar).
- Precisión: ±1 tile. Las coordenadas son del centro de cada edificio en OSM.

## 2. La forma de la península

| | Real | 20 m/tile | 15 m/tile |
| --- | --- | --- | --- |
| Largo (punta oeste → calle Florida) | ~1.400 m | x 3 → 72 | x 3 → 96 |
| Ancho al oeste (Rambla 25 de Agosto → Rambla Francia) | ~700 m | y 5 → 40 | y 6 → 53 |
| Ancho al este (Rambla 25 de Agosto → Rambla Gran Bretaña) | ~900 m | y 5 → 51 | y 6 → 67 |
| Manzana típica | 85–100 m | 4–5 tiles | 6–7 tiles |

- **Al norte**, la bahía y el **puerto**. La Rambla 25 de Agosto de 1825 corre pegada al agua; al
  norte de ella están los muelles, la Aduana y la terminal de Buquebus.
- **Al sur**, el Río de la Plata. La costa **no es recta**: va en diagonal. Al oeste la Rambla
  Francia queda más al norte (y ≈ 40 a 20 m); hacia el este baja y la Rambla Gran Bretaña llega a
  y ≈ 51, con la Plaza España y el Cubo del Sur sobre ella.
- **La punta oeste** está en x ≈ 3. De ahí sale la **Escollera Sarandí**, que entra en el río
  hacia el oeste. En OSM su centro queda ~500 m al oeste de la punta (x ≈ -22 a 20 m), así que mide
  más o menos 1 km. En el juego conviene acortarla (ver 6).
- **Al este**, pasando la calle Florida (x ≈ 72), empieza el Centro: Avenida 18 de Julio, el Palacio
  Salvo y la Plaza Fabini.

## 3. Las calles

Las calles **de oeste a este** (paralelas a Sarandí) quedan como filas (y). Las **de norte a sur**
quedan como columnas (x).

| Calle (de norte a sur) | v (m) | y a 20 m | y a 15 m | de x a x (20 m) |
| --- | --- | --- | --- | --- |
| Rambla 25 de Agosto de 1825 | -342 | 5 | 6 | 5–56 |
| Piedras | -236 | 10 | 13 | 5–72 |
| Cerrito | -145 | 15 | 19 | 4–72 |
| 25 de Mayo | -54 | 19 | 25 | 8–72 |
| Rincón | 41 | 24 | 31 | 35–72 |
| Sarandí | 147 | 29 | 38 | 4–66 |
| Buenos Aires | 243 | 34 | 45 | 11–65 |
| Reconquista | 342 | 39 | 51 | 13–65 |
| Rambla Francia | 366 | 40 | 53 | 4–42 |
| Rambla Gran Bretaña | 573 | 51 | 67 | 42–71 |

| Calle (de oeste a este) | u (m) | x a 20 m | x a 15 m |
| --- | --- | --- | --- |
| Juan Lindolfo Cuestas | -685 | 10 | 12 |
| Guaraní | -620 | 13 | 17 |
| Maciel | -526 | 18 | 23 |
| Pérez Castellano | -432 | 22 | 29 |
| Colón | -333 | 27 | 36 |
| Solís | -236 | 32 | 42 |
| Zabala | -138 | 37 | 49 |
| Misiones | -43 | 42 | 55 |
| Treinta y Tres | 49 | 46 | 61 |
| Ituzaingó | 148 | 51 | 68 |
| Juan Carlos Gómez | 255 | 57 | 75 |
| Bartolomé Mitre | 333 | 61 | 80 |
| Juncal | 445 | 66 | 88 |
| Ciudadela | 433 | 66 | 87 |
| Florida | 568 | 72 | 96 |

**Peatonales reales** (OSM, `highway=pedestrian`), en tiles a 20 m:
- **Sarandí**, entera, desde Pérez Castellano (x 22) hasta la Puerta de la Ciudadela (x 66).
- **Rincón**, de x 35 a x 66.
- **Pérez Castellano**, de la Rambla 25 de Agosto a Sarandí (y 5 → 29), pasando por el Mercado del Puerto.
- **Colón**, de y 6 a y 39.
- **Piedras**, entre x 18 y x 28.
- **25 de Agosto**, junto al puerto.
- Las cortitas **Bacacay** y **Policía Vieja**, junto a la Plaza Independencia.

## 4. Edificios y lugares (con el tile propuesto)

| Lugar | Tipo | Dónde está | Juego 20 m (x, y) | Juego 15 m (x, y) |
| --- | --- | --- | --- | --- |
| Plaza Independencia | Plaza | Centro de la plaza; hacia el este empieza 18 de Julio | 71, 32 | 93, 42 |
| Monumento y Mausoleo de Artigas | Monumento | Centro de la Plaza Independencia | 70, 32 | 93, 42 |
| Palacio Salvo | Edificio | Esquina este de la plaza (Plaza Independencia 846, arranque de 18 de Julio) | 76, 36 | 101, 47 |
| Palacio Estévez | Edificio | Lado sur de la plaza (hoy museo, Edificio José Artigas) | 71, 37 | 93, 48 |
| Torre Ejecutiva | Edificio | Lado sur de la plaza, al oeste del Palacio Estévez (Presidencia) | 67, 36 | 89, 47 |
| Hotel Radisson Victoria Plaza | Edificio | Lado norte de la plaza (Plaza Independencia 759) | 73, 29 | 96, 38 |
| Puerta de la Ciudadela | Monumento | Lado oeste de la plaza: entrada a la peatonal Sarandí | 66, 31 | 87, 40 |
| Edificio Ciudadela | Edificio | Al sur de la Puerta, sobre Juncal | 64, 32 | 85, 43 |
| Teatro Solís | Teatro | Al suroeste de la plaza (Buenos Aires y Bartolomé Mitre) | 62, 37 | 83, 49 |
| Museo Torres García | Museo | Peatonal Sarandí 683 | 64, 29 | 84, 39 |
| Museo Andes 1972 | Museo | Rincón 619 | 58, 24 | 77, 31 |
| Cabildo | Edificio | Lado este de la Plaza Matriz (Juan Carlos Gómez y Sarandí) | 58, 28 | 76, 36 |
| Plaza Matriz (de la Constitución) | Plaza | Entre Ituzaingó y Juan Carlos Gómez, Sarandí y Rincón | 54, 26 | 72, 35 |
| Club Uruguay | Edificio | Lado sur de la Plaza Matriz (Sarandí 584) | 55, 29 | 72, 39 |
| Catedral Metropolitana (Iglesia Matriz) | Iglesia | Lado oeste de la Plaza Matriz (Ituzaingó 1373) | 50, 28 | 66, 36 |
| Museo Gurvich | Museo | Sarandí 524, frente a la Catedral | 49, 30 | 65, 39 |
| Bolsa de Comercio | Edificio | Rincón y Misiones | 42, 25 | 56, 33 |
| Casa de Rivera (Museo Histórico) | Museo | Rincón 437 | 40, 24 | 53, 31 |
| Museo Romántico (Casa Montero) | Museo | 25 de Mayo 428 | 40, 20 | 53, 26 |
| Casa de Lavalleja | Museo | Zabala y 25 de Mayo | 37, 17 | 48, 23 |
| Palacio Taranco | Museo | Lado norte de la Plaza Zabala (25 de Mayo 376) | 33, 20 | 44, 26 |
| Plaza Zabala | Plaza | Entre Solís / Circunvalación Durango y Zabala | 33, 24 | 43, 32 |
| Iglesia de San Francisco de Asís | Iglesia | Cerrito y Solís | 31, 16 | 41, 21 |
| Casa Garibaldi | Museo | 25 de Mayo 314 | 29, 20 | 38, 26 |
| Museo Precolombino e Indígena | Museo | 25 de Mayo 279 | 25, 19 | 33, 24 |
| Mercado del Puerto | Mercado | Piedras y Pérez Castellano, frente al puerto | 21, 8 | 28, 11 |
| Museo del Carnaval | Museo | Rambla 25 de Agosto, pegado al Mercado del Puerto | 19, 8 | 25, 10 |
| Edificio de Aduanas | Edificio | Rambla 25 de Agosto y Colón, frente a la bahía | 22, 2 | 29, 2 |
| Templo Inglés | Iglesia | Reconquista 522, sobre la rambla sur | 48, 41 | 64, 54 |
| Cubo del Sur | Fortificación | Rambla Gran Bretaña (resto de la muralla) | 46, 47 | 61, 62 |
| Plaza España | Plaza | Sobre la rambla sur, al sur de la Plaza Matriz | 54, 45 | 71, 59 |
| Terminal Plaza España | Ómnibus | Al lado de la Plaza España (terminal de ómnibus urbanos) | 57, 46 | 75, 60 |

**Plazas (contorno en OSM, a 20 m/tile):**

| Plaza | x | y | Tamaño real |
| --- | --- | --- | --- |
| Plaza Independencia | 66–75 | 29–36 | ~190 × 130 m |
| Plaza Matriz | 52–56 | 25–29 | ~80 × 80 m |
| Plaza Zabala | 30–35 | 22–27 | ~90 × 95 m (es redonda) |
| Plaza España | ~52–56 | ~44–46 | sobre la Rambla Gran Bretaña |

Lugares que **no** son de Ciudad Vieja y no van en este mapa:
- **Teatro Victoria:** está en el Centro.
- **Plaza Fabini:** también en el Centro, sobre 18 de Julio.
- **Casa Central del BROU:** queda en Cerrito y Zabala (x ≈ 37, y ≈ 15), pero OSM no la tiene
  marcada con nombre. Verificarla antes de dibujarla.

## 5. Comparación con el mapa de hoy

| Lugar | Hoy (x, y) | Real a 20 m (x, y) | Qué cambia |
| --- | --- | --- | --- |
| Plaza Independencia (spawn) | 54–72, 14–37 (19 × 24) | 66–75, 29–36 (≈ 9 × 7) | Hoy es casi 7 veces más grande que la real; está bien ubicada al este, pero muy al norte |
| Palacio Salvo | 67, 7 (norte de la plaza) | 76, 36 (esquina este) | Va al **este** de la plaza, mirando a 18 de Julio |
| Monumento a Artigas | 62, 24 | 70, 32 | Centro de la plaza |
| Puerta de la Ciudadela | 53, 22 | 66, 31 | **Lado oeste** de la plaza, en la boca de Sarandí |
| Teatro Solís | 46, 33 | 62, 37 | **Al suroeste** de la plaza, pegado a ella |
| Torre Ejecutiva / Palacio Estévez | no están | 67–71, 36–37 | Sumarlos (lado sur de la plaza) |
| Cabildo | 29, 11 | 58, 28 | **Lado este de la Plaza Matriz** |
| Catedral | 21, 18 | 50, 28 | **Lado oeste de la Plaza Matriz**, enfrente del Cabildo |
| Plaza Matriz / fuente | 27–35, 17–23 (fuente 30,19) | 52–56, 25–29 | Mucho más al este; la fuente en el centro |
| Mercado del Puerto | 8, 3 | 21, 8 | Junto al puerto, en Piedras y Pérez Castellano, pero más al este que hoy |
| Plaza Zabala | 16–25, 10–15 | 30–35, 22–27 | Con el Palacio Taranco al norte |
| Plaza España | 27–35, 32–37 | ~52–56, 44–46 | Sobre la rambla sur, al sur de la Plaza Matriz |
| Escolleras (dos, hacia el sur) | x 12–14 y x 59–61, desde y 44 | una, desde la punta oeste hacia el oeste | Ver 6 |
| Peatonal Sarandí | y 24, x 27–53 | y 29, x 22–66 | Termina en la Puerta de la Ciudadela |
| Termas del Donador (inventado) | 58–61, 4–7 | — | No existe en la realidad: ponerlo en una manzana libre (ver 6) |

## 6. Propuesta para el mapa nuevo

1. **Escala: 15 m por tile.** El mapa queda de **~100 × 72** tiles con el río y los márgenes
   (`uint8` aguanta hasta 255). A 20 m las plazas quedan chicas para 25–50 jugadores; a 15 m la Plaza
   Independencia queda de ~12 × 9 tiles y las manzanas de 6–7 tiles, que deja lugar para casas y
   tiendas.
2. **Spawn**: la Plaza Independencia real no alcanza para los ~400 tiles de spawn de hoy. Se puede:
   - agrandarla un 50 % hacia el sur y el oeste, que es lo habitual en juegos y se sigue leyendo bien;
   - o sumar al `spawnArea` la peatonal Sarandí, desde la Puerta hasta la Plaza Matriz.
3. **Respetar el orden de oeste a este a lo largo de Sarandí**: Escollera, Mercado del Puerto, Plaza
   Zabala, Plaza Matriz con la Catedral y el Cabildo, Puerta de la Ciudadela, Plaza Independencia
   con el Palacio Salvo. Al sur de la Plaza Matriz, el Templo Inglés y la Plaza España sobre la rambla.
4. **La costa en diagonal** (`builder.coastline` con una línea que baje de y ≈ 53 al oeste a
   y ≈ 67 al este, a 15 m). Al norte, el puerto: agua más allá de la Rambla 25 de Agosto, con un muelle.
5. **Escollera Sarandí**: una sola, saliendo de la punta oeste hacia el oeste. Acortada a ~15–20
   tiles para que no sea un pasillo eterno, y con la plataforma y el faro en la punta, como hoy. Si
   se quiere un segundo lugar de pesca para repartir gente, la escollera junto al **Cubo del Sur /
   Plaza España** sobre la Rambla Gran Bretaña es lo más parecido a la realidad.
6. **Las Termas del Donador** son inventadas: una manzana libre cerca de la Plaza Independencia, por
   ejemplo al norte, entre Rincón y 25 de Mayo, cerca de Juncal. Hay que actualizar su `Door.to.at`
   y la puerta de salida.
7. **Sumar** la Torre Ejecutiva, el Palacio Estévez, la Casa de Lavalleja, el Palacio Taranco, el
   Museo Torres García, el Club Uruguay, el Templo Inglés y la Bolsa de Comercio. Todos son
   edificios conocidos que dan identidad.
8. **Lo que hay que mover junto con el mapa:**
   - las tiendas (`info.ts`), las paradas y los bancos;
   - el `spawnArea`, el `logoSign` (el Cabildo) y los `placeLabels`;
   - las ubicaciones guardadas de los jugadores (`PlayerRecord.location`): con el mapa nuevo un tile
     viejo puede caer en un edificio. Ya se valida con `isWalkable` al volver; si no, va al spawn.
   - Las regiones de la guía de bienvenida van por id de landmark y tienda, así que siguen andando
     si los ids no cambian.
9. Las coordenadas exactas para cualquier escala salen de las fórmulas del punto 1 con u y v. Si
   hacen falta más lugares, se repite la consulta a Nominatim con la misma conversión.

## 7. Fuentes

- © Colaboradores de OpenStreetMap (ODbL), consultado el 2026-10-05:
  - Nominatim para los edificios: <https://nominatim.openstreetmap.org/>.
  - Overpass API para las calles, las plazas y las peatonales: <https://overpass-api.de/>.
- Las direcciones de cada lugar (Sarandí 683, Ituzaingó 1373, etc.) son las que figuran en OSM.
