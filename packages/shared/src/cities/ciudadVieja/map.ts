import { LayoutBuilder } from "../layoutBuilder";
import { CityDefinition, TileChar } from "../types";
import { CIUDAD_VIEJA_INFO } from "./info";

/**
 * Ciudad Vieja, versión libre: oeste → este va de la punta de la península a la Plaza
 * Independencia; al norte la bahía/puerto y al sur el Río de la Plata. Las distancias no son
 * reales, pero el orden de los lugares sí: Mercado del Puerto junto al puerto, Plaza Zabala,
 * Plaza Matriz con Catedral y Cabildo al centro, Peatonal Sarandí hasta la Puerta de la Ciudadela,
 * Plaza España sobre la rambla y Plaza Independencia (donde se aparece) con Palacio Salvo y
 * Teatro Solís al este.
 *
 * Las manzanas son parques (pasto caminable) con pocas casas sueltas: el mapa está pensado para
 * moverse libremente y que los edificios emblemáticos sean los protagonistas. El tamaño da para
 * 25–50 jugadores a la vez sin amontonarse (plaza de spawn grande, escollera larga, muchos bancos).
 */
const WIDTH = 74;
/** Las filas 44 en adelante son río: dan lugar a la Escollera Sarandí. */
const HEIGHT = 58;
const RIVER_Y = 44;

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Grass);

// Calles este-oeste.
builder
  .row(9, 3, 66, TileChar.Street)
  .row(16, 3, 52, TileChar.Street)
  .row(24, 3, 26, TileChar.Street)
  .row(31, 3, 52, TileChar.Street)
  .row(38, 3, WIDTH - 1, TileChar.Street)
  .row(13, 53, WIDTH - 1, TileChar.Street);

// Calles norte-sur.
for (const x of [6, 15, 26, 36, 44]) builder.column(x, 3, 38, TileChar.Street);
builder.column(53, 9, 38, TileChar.Street).column(WIDTH - 1, 9, RIVER_Y - 1, TileChar.Street);

// Rambla Gran Bretaña ancha (dos tiles: la segunda fila se genera sola junto al agua).
builder.row(RIVER_Y - 2, 6, WIDTH - 1, TileChar.Rambla);

// Pocas casas coloniales sueltas, en esquinas de manzana.
for (const [x, y, width, height] of [
  [18, 4, 2, 2],
  [37, 3, 3, 2],
  [42, 5, 2, 2],
  [47, 3, 3, 2],
  [7, 11, 2, 2],
  [12, 14, 3, 1],
  [37, 10, 2, 2],
  [42, 14, 2, 1],
  [46, 10, 3, 2],
  [51, 14, 2, 1],
  [7, 18, 2, 2],
  [12, 21, 2, 2],
  [46, 18, 2, 2],
  [50, 21, 2, 2],
  [7, 26, 3, 1],
  [12, 28, 2, 2],
  [17, 26, 2, 2],
  [23, 29, 2, 1],
  [28, 26, 3, 1],
  [33, 28, 2, 2],
  [37, 26, 2, 2],
  [41, 29, 2, 1],
  [46, 26, 2, 2],
  [50, 29, 2, 1],
  [8, 33, 2, 2],
  [12, 36, 2, 1],
  [17, 33, 2, 2],
  [22, 36, 3, 1],
  [38, 33, 2, 2],
  [41, 36, 2, 1],
  [46, 40, 3, 1],
  [62, 40, 3, 1],
]) {
  builder.rect({ x, y, width, height }, TileChar.Block);
}

// Vereda bajo la Ropería Sarandí (tienda de ropa, junto a la peatonal).
builder.rect({ x: 39, y: 21, width: 2, height: 2 }, TileChar.Plaza);

// Vereda bajo la Veterinaria (mascotas) y la Farmacia, junto a la peatonal, al este de la Ropería.
builder.rect({ x: 45, y: 21, width: 5, height: 3 }, TileChar.Plaza);

// Vereda bajo Pesca Sarandí (tienda de pesca), sobre la rambla frente a la Escollera Sarandí.
builder.rect({ x: 9, y: 40, width: 2, height: 2 }, TileChar.Plaza);

// Plaza Matriz (Constitución) con árboles en las esquinas y, al oeste, el atrio de la Catedral.
builder
  .rect({ x: 27, y: 17, width: 9, height: 7 }, TileChar.Plaza)
  .set(27, 17, TileChar.Tree)
  .set(35, 17, TileChar.Tree)
  .set(27, 23, TileChar.Tree)
  .set(35, 23, TileChar.Tree)
  .rect({ x: 16, y: 17, width: 10, height: 7 }, TileChar.Plaza);

// Plaza Zabala: plaza con palmeras entre el puerto y el Cabildo.
builder.rect({ x: 16, y: 10, width: 10, height: 6 }, TileChar.Plaza);
for (const [x, y] of [
  [17, 11],
  [24, 11],
  [17, 14],
  [24, 14],
]) {
  builder.set(x, y, TileChar.Palm);
}

// Plaza España: sobre la rambla, con palmeras en las esquinas.
builder.rect({ x: 27, y: 32, width: 9, height: 6 }, TileChar.Plaza);
for (const [x, y] of [
  [28, 33],
  [34, 33],
  [28, 36],
  [34, 36],
]) {
  builder.set(x, y, TileChar.Palm);
}

// Suelo bajo los edificios emblemáticos (y alrededor del Cabildo y del Teatro Solís).
builder
  .rect({ x: 27, y: 10, width: 9, height: 6 }, TileChar.Plaza)
  .rect({ x: 8, y: 3, width: 5, height: 5 }, TileChar.Plaza)
  .rect({ x: 67, y: 7, width: 5, height: 5 }, TileChar.Plaza)
  .rect({ x: 45, y: 32, width: 8, height: 6 }, TileChar.Plaza);

// Plaza Independencia: canteros con palmeras alrededor del Monumento a Artigas.
builder.rect({ x: 54, y: 14, width: 19, height: 24 }, TileChar.Plaza);
for (const [x, y] of [
  [55, 15],
  [69, 15],
  [62, 15],
  [55, 20],
  [69, 20],
  [55, 29],
  [69, 29],
  [55, 34],
  [62, 34],
  [69, 34],
]) {
  builder.rect({ x, y, width: 3, height: 3 }, TileChar.Grass).set(x + 1, y + 1, TileChar.Palm);
}

// Peatonal Sarandí: de la Plaza Matriz a la Puerta de la Ciudadela (incluye el arco).
builder.row(24, 27, 53, TileChar.Pedestrian);

// Árboles sueltos en los parques (sólo donde no cortan el paso).
builder.scatter(TileChar.Tree, TileChar.Grass, 0.18, 11);

// Palmeras a lo largo de la rambla, del lado de la ciudad.
for (let x = 17; x < WIDTH - 2; x += 6) {
  builder.set(x, RIVER_Y - 3, TileChar.Palm);
}

// Agua alrededor de la península, con la punta oeste redondeada. La rambla se genera sola.
builder
  .rect({ x: 0, y: 0, width: WIDTH, height: 2 }, TileChar.Water)
  .rect({ x: 0, y: RIVER_Y, width: WIDTH, height: HEIGHT - RIVER_Y }, TileChar.Water)
  .rect({ x: 0, y: 0, width: 2, height: HEIGHT }, TileChar.Water)
  .rect({ x: 2, y: 2, width: 3, height: 5 }, TileChar.Water)
  .rect({ x: 5, y: 2, width: 1, height: 3 }, TileChar.Water)
  .rect({ x: 2, y: 37, width: 3, height: 7 }, TileChar.Water)
  .rect({ x: 5, y: 40, width: 1, height: 4 }, TileChar.Water)
  .coastline();

// Escollera Sarandí: espigón de piedra de tres tiles de ancho que sale de la Rambla Gran Bretaña
// hacia el río, con una plataforma ancha en la punta donde está la farola. Hay lugar para pescar
// muchos a la vez. Va después de la rambla para no convertirse en rambla.
builder
  .rect({ x: 12, y: RIVER_Y, width: 3, height: 9 }, TileChar.Jetty)
  .rect({ x: 10, y: RIVER_Y + 9, width: 7, height: 4 }, TileChar.Jetty);

// Segunda escollera, igual a la primera, saliendo de la rambla en (60, 43) frente a la Plaza
// Independencia: así los que pescan se reparten entre las dos.
builder
  .rect({ x: 59, y: RIVER_Y, width: 3, height: 9 }, TileChar.Jetty)
  .rect({ x: 57, y: RIVER_Y + 9, width: 7, height: 4 }, TileChar.Jetty);

export const CIUDAD_VIEJA: CityDefinition = {
  ...CIUDAD_VIEJA_INFO,
  layout: builder.build(),
  // Casi toda la Plaza Independencia: con 50 jugadores entrando hay lugar para todos.
  spawnArea: { x: 54, y: 14, width: 19, height: 24 },
  benches: [
    // Plaza Independencia: alrededor del Monumento a Artigas…
    { x: 62, y: 28, facing: "south" },
    { x: 64, y: 28, facing: "south" },
    { x: 66, y: 24, facing: "east" },
    { x: 66, y: 26, facing: "east" },
    // …y entre los canteros.
    { x: 59, y: 17, facing: "south" },
    { x: 66, y: 17, facing: "south" },
    { x: 59, y: 32, facing: "south" },
    { x: 66, y: 32, facing: "south" },
    { x: 58, y: 22, facing: "east" },
    { x: 58, y: 30, facing: "east" },
    { x: 68, y: 22, facing: "east" },
    { x: 68, y: 30, facing: "east" },
    // Plaza Matriz, delante de la fuente.
    { x: 32, y: 19, facing: "east" },
    { x: 32, y: 20, facing: "east" },
    { x: 30, y: 21, facing: "south" },
    { x: 31, y: 21, facing: "south" },
    { x: 28, y: 19, facing: "east" },
    { x: 34, y: 22, facing: "south" },
    // Plaza Zabala.
    { x: 20, y: 12, facing: "south" },
    { x: 21, y: 12, facing: "south" },
    { x: 19, y: 14, facing: "east" },
    // Plaza España.
    { x: 30, y: 34, facing: "south" },
    { x: 32, y: 34, facing: "south" },
    // Frente al Teatro Solís.
    { x: 45, y: 34, facing: "south" },
    { x: 51, y: 32, facing: "east" },
    // Rambla Gran Bretaña, mirando al Río de la Plata.
    { x: 20, y: 42, facing: "south" },
    { x: 26, y: 42, facing: "south" },
    { x: 32, y: 42, facing: "south" },
    { x: 38, y: 42, facing: "south" },
    { x: 44, y: 42, facing: "south" },
    { x: 50, y: 42, facing: "south" },
    { x: 56, y: 42, facing: "south" },
    { x: 62, y: 42, facing: "south" },
    { x: 68, y: 42, facing: "south" },
  ],
  busStops: [
    { name: "Rambla 25 de Agosto", x: 34, y: 8, facing: "south" },
    { name: "Mercado del Puerto", x: 14, y: 8, facing: "south" },
    { name: "Escollera Sarandí", x: 17, y: 37, facing: "south" },
    { name: "Plaza Independencia", x: 52, y: 37, facing: "east" },
  ],
  // Cartel "MW" sobre el techo del Cabildo, frente a la Plaza Matriz.
  logoSign: { landmarkId: "cabildo" },
  placeLabels: [
    { name: "Plaza Independencia", x: 62.5, y: 37 },
    { name: "Plaza Matriz", x: 31, y: 23.4 },
    { name: "Plaza Zabala", x: 20.5, y: 15.4 },
    { name: "Plaza España", x: 31, y: 37.4 },
    { name: "Peatonal Sarandí", x: 44, y: 24 },
    { name: "Rambla 25 de Agosto", x: 34, y: 2 },
    { name: "Rambla Gran Bretaña", x: 36, y: 43 },
    { name: "Bahía de Montevideo", x: 34, y: 0.6 },
    { name: "Río de la Plata", x: 40, y: 50 },
    { name: "Escollera Sarandí", x: 13, y: 48 },
    { name: "Escollera Sarandí (este)", x: 60, y: 48 },
  ],
};
