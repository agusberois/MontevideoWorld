import { LayoutBuilder } from "../layoutBuilder";
import { Bench, Boat, CityDefinition, Door, Filler, TileChar, TilePoint, TileRect, doubleBench } from "../types";
import { COLUMN_BANDS, COLUMN_STREETS, HEIGHT, ROW_BANDS, ROW_STREETS, WIDTH, rect, streetBand, tileX, tileY } from "./grid";
import { CIUDAD_VIEJA_INFO, ESCOLLERA_NORTE_PLATFORM, ESCOLLERA_PLATFORM, MERCADO_BUS_STOP, PLAZA_BUS_STOP } from "./info";
import { WELCOME_COURIER_ID } from "../../welcome";

/**
 * Ciudad Vieja, sobre el plano real (OpenStreetMap) a 12 m por tile, con la grilla girada como las
 * calles (`grid.ts`; las "de oeste a este", como Sarandí, son filas). Cada calle es una franja de 4
 * tiles: vereda, calzada de 2 y vereda. En las manzanas, edificios de relleno de 2 × 2 (`fillers`):
 * casas de varios pisos en el casco viejo y edificios en altura en el Centro (al este de Florida).
 * Al norte la bahía y el puerto (Rambla 25 de Agosto), al sur el río con la costa en diagonal
 * (Rambla Francia al oeste, Gran Bretaña al este), la Escollera Sarandí saliendo de la punta oeste y,
 * al este, la Plaza Independencia con el arranque de 18 de Julio.
 */

/** La punta oeste: la rambla son las columnas PUNTA_X y PUNTA_X + 1. */
const PUNTA_X = 17;
const NORTH_WATER_Y = 6;

/** Fila de la orilla sur (la rambla son esa fila y la de arriba): baja en diagonal hacia el este. */
function southCoast(x: number): number {
  if (x <= 80) return 69;
  if (x >= 102) return 86;
  return Math.round(69 + ((x - 80) / (102 - 80)) * 17);
}

const plazaIndependencia = rect(125, 47, 14);
const plazaMatriz = rect(100, 43, 5);
const plazaZabala = rect(64, 35, 9, 8);
const plazaEspana = rect(99, 72, 9, 6);
/** 18 de Julio: sale de la Plaza Independencia hacia el este (avenida, franja de 4). */
const dieciochoDeJulio = streetBand(54);

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Grass);

/** Franja de calle: vereda a los costados y calzada en el medio. */
function rowStreet(band: [number, number], x0: number, x1: number, pedestrian = false) {
  const [y0, y1] = band;
  for (let y = y0; y <= y1; y++) {
    const edge = y === y0 || y === y1;
    builder.row(y, x0, x1, pedestrian ? TileChar.Pedestrian : edge ? TileChar.Sidewalk : TileChar.Street);
  }
}
function columnStreet(band: [number, number], y0: number, y1: number) {
  const [x0, x1] = band;
  for (let x = x0; x <= x1; x++) builder.column(x, y0, y1, x === x0 || x === x1 ? TileChar.Sidewalk : TileChar.Street);
}

// Calles. Las de norte a sur no cruzan la Plaza Independencia; Buenos Aires y Reconquista terminan
// en Juncal, y la peatonal Sarandí, en la Puerta de la Ciudadela.
const juncalEnd = streetBand(tileX(COLUMN_STREETS.juncal))[1];
const floridaBand = streetBand(tileX(COLUMN_STREETS.florida));
for (const band of COLUMN_BANDS) {
  if (band[0] === floridaBand[0]) {
    columnStreet(band, 0, plazaIndependencia.y - 1);
    columnStreet(band, plazaIndependencia.y + plazaIndependencia.height + 4, HEIGHT - 1);
  } else columnStreet(band, 0, HEIGHT - 1);
}
const rows = ROW_STREETS;
for (const [name, v] of Object.entries(rows)) {
  const band = streetBand(tileY(v));
  if (name === "sarandi") rowStreet(band, PUNTA_X, juncalEnd, true);
  else if (name === "buenosAires" || name === "reconquista") rowStreet(band, PUNTA_X, juncalEnd);
  else rowStreet(band, PUNTA_X, WIDTH - 1);
}
rowStreet(dieciochoDeJulio, plazaIndependencia.x + plazaIndependencia.width, WIDTH - 1);
// Cruces: la vereda de una calle no corta la calzada de la otra. Un tile de vereda con calzada a los
// dos lados (arriba y abajo, o a izquierda y derecha) es parte del cruce: va calzada. Las esquinas
// (vereda con vereda) quedan.
{
  const isStreet = (x: number, y: number) => builder.get(x, y) === TileChar.Street;
  const crossings: Array<[number, number]> = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (builder.get(x, y) !== TileChar.Sidewalk) continue;
      if ((isStreet(x, y - 1) && isStreet(x, y + 1)) || (isStreet(x - 1, y) && isStreet(x + 1, y))) crossings.push([x, y]);
    }
  }
  for (const [x, y] of crossings) builder.set(x, y, TileChar.Street);
}

// Peatonal Pérez Castellano, frente al Mercado del Puerto (la calzada), hasta Sarandí.
// Las calles que la cruzan siguen derecho (su calzada no se corta).
const perezCastellano = streetBand(tileX(COLUMN_STREETS.perezCastellano));
const crossingRoads = ROW_BANDS.flatMap(([y0, y1]) => Array.from({ length: y1 - y0 - 1 }, (_, i) => y0 + 1 + i));
for (let y = ROW_BANDS[0][1] + 1; y < streetBand(tileY(rows.sarandi))[0]; y++) {
  if (crossingRoads.includes(y)) continue;
  builder.row(y, perezCastellano[0] + 1, perezCastellano[1] - 1, TileChar.Pedestrian);
}

// Plazas (un poco más grandes que las reales, para que entren los jugadores).
for (const plaza of [plazaIndependencia, plazaMatriz, plazaZabala, plazaEspana]) builder.rect(plaza, TileChar.Plaza);
// Plaza Independencia: palmeras; Plaza Matriz: árboles en las esquinas; Plaza Zabala: cantero al medio.
for (const [x, y] of [
  [127, 49],
  [136, 50],
  [127, 58],
  [136, 58],
  [132, 49],
]) {
  builder.set(x, y, TileChar.Palm);
}
for (const [x, y] of [
  [100, 43],
  [104, 43],
  [100, 47],
  [104, 47],
]) {
  builder.set(x, y, TileChar.Tree);
}
builder.rect(rect(67, 37, 3), TileChar.Grass).set(68, 38, TileChar.Palm);

// Suelo bajo los edificios emblemáticos y las tiendas (así no les crecen casas ni árboles adentro).
for (const { area } of [...CIUDAD_VIEJA_INFO.landmarks, ...CIUDAD_VIEJA_INFO.shops]) builder.rect(area, TileChar.Plaza);

// Agua: la bahía al norte, el río al oeste de la punta y al sur (la costa en diagonal), con la rambla
// de dos tiles sobre la orilla.
builder.rect(rect(0, 0, WIDTH, NORTH_WATER_Y + 1), TileChar.Water);
builder.rect(rect(0, 0, PUNTA_X, HEIGHT), TileChar.Water);
builder.column(PUNTA_X, NORTH_WATER_Y + 1, HEIGHT - 1, TileChar.Rambla).column(PUNTA_X + 1, NORTH_WATER_Y + 1, HEIGHT - 1, TileChar.Rambla);
for (let x = PUNTA_X; x < WIDTH; x++) {
  const coast = southCoast(x);
  builder.set(x, coast - 1, TileChar.Rambla).set(x, coast, TileChar.Rambla);
  builder.rect(rect(x, coast + 1, 1, HEIGHT), TileChar.Water);
}
builder.coastline();

// Bancos (antes de los edificios de relleno, para que no les caiga uno encima).
const sarandiBand = streetBand(tileY(rows.sarandi));
const benches: Bench[] = [
  // Plaza Independencia: alrededor del Monumento a Artigas y entre las palmeras.
  ...doubleBench(128, 56, "south"),
  ...doubleBench(133, 56, "south"),
  { x: 128, y: 52, facing: "east" },
  { x: 133, y: 52, facing: "east" },
  ...doubleBench(130, 59, "south"),
  { x: 137, y: 54, facing: "east" },
  { x: 126, y: 54, facing: "east" },
  // Peatonal Sarandí (sobre la vereda norte, mirando a la gente que pasa).
  // (Dobles y simples, alternados.)
  ...[34, 46, 62, 78, 90, 112].flatMap((x, i) => (i % 2 === 0 ? doubleBench(x, sarandiBand[0], "south") : [{ x, y: sarandiBand[0], facing: "south" as const }])),
  // Plaza Matriz, alrededor de la fuente.
  { x: 101, y: 46, facing: "south" },
  { x: 103, y: 46, facing: "south" },
  { x: 103, y: 44, facing: "east" },
  // Plaza Zabala.
  { x: 65, y: 41, facing: "south" },
  { x: 71, y: 41, facing: "south" },
  { x: 65, y: 36, facing: "east" },
  // Plaza España, mirando al río.
  ...doubleBench(100, 76, "south"),
  { x: 103, y: 76, facing: "south" },
  ...doubleBench(105, 76, "south"),
];
// Rambla sur: bancos mirando al río, cada pocos tiles.
// Uno doble y uno simple, alternados (los dobles sólo donde la costa sigue derecha).
for (let x = 22, i = 0; x < WIDTH - 2; x += 7, i++) {
  const y = southCoast(x);
  if (i % 2 === 0 && southCoast(x + 1) === y) benches.push(...doubleBench(x, y, "south"));
  else benches.push({ x, y, facing: "south" });
}
const busStops = [PLAZA_BUS_STOP, MERCADO_BUS_STOP];
for (const { x, y } of [...benches, ...busStops]) {
  const onRambla = builder.get(x, y) === TileChar.Rambla;
  builder.set(x, y, onRambla ? TileChar.Rambla : TileChar.Plaza);
}

// Edificios de relleno: lotes de 2 × 2 en las manzanas (lo que queda entre las franjas de las
// calles), sólo sobre pasto. Algunos lotes quedan de patio (con árboles). Al este de Florida, el
// Centro: edificios en altura.
const fillers: Filler[] = [];
const columnLimits = [[PUNTA_X + 2, COLUMN_BANDS[0][0] - 1], ...COLUMN_BANDS.slice(0, -1).map((band, i) => [band[1] + 1, COLUMN_BANDS[i + 1][0] - 1]), [floridaBand[1] + 1, WIDTH - 1]];
const rowLimits = [[NORTH_WATER_Y + 1, ROW_BANDS[0][0] - 1], ...ROW_BANDS.slice(0, -1).map((band, i) => [band[1] + 1, ROW_BANDS[i + 1][0] - 1]), [ROW_BANDS[ROW_BANDS.length - 1][1] + 1, HEIGHT - 1]];
const isGrass = (x: number, y: number) => builder.get(x, y) === TileChar.Grass;
/**
 * Lotes sin relleno: la manzana del Mercado del Puerto (entre Juan Lindolfo Cuestas y Maciel) queda
 * para el Mercado y la Parrilla, y en la chica de al lado (entre Maciel y Pérez Castellano) sólo van
 * las casas que dan a la rambla; el resto, patio.
 */
const patios = [rect(31, 11, 9, 5), rect(44, 13, 4, 3)];
const inPatio = (x: number, y: number) => patios.some((p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height);
for (const [x0, x1] of columnLimits) {
  for (const [y0, y1] of rowLimits) {
    for (let y = y0; y + 1 <= y1; y += 2) {
      for (let x = x0; x + 1 <= x1; x += 2) {
        if (!isGrass(x, y) || !isGrass(x + 1, y) || !isGrass(x, y + 1) || !isGrass(x + 1, y + 1)) continue;
        if (inPatio(x, y) || lotHash(x, y) < 0.22) continue;
        builder.rect(rect(x, y, 2), TileChar.Building);
        fillers.push({ x, y, kind: x > floridaBand[1] ? "tower" : "house" });
      }
    }
  }
}
// Árboles en los patios y los pedazos de manzana que quedaron libres.
builder.scatter(TileChar.Tree, TileChar.Grass, 0.35, 11);

// Escollera Sarandí: sale de la punta (al final de la peatonal Sarandí) hacia el oeste, con la
// plataforma al final. Va después de la costa: si no, `coastline` la volvería rambla.
const jettyX = ESCOLLERA_PLATFORM.x + ESCOLLERA_PLATFORM.width;
builder.rect(rect(jettyX, sarandiBand[0] + 1, PUNTA_X - jettyX, 3), TileChar.Jetty);
builder.rect(ESCOLLERA_PLATFORM, TileChar.Jetty);
// La segunda, igual, más al norte: el brazo (filas 14 a 16) sale de la rambla oeste hacia su plataforma.
const northArmY = ESCOLLERA_NORTE_PLATFORM.y + Math.floor(ESCOLLERA_NORTE_PLATFORM.height / 2) - 1;
builder.rect(rect(jettyX, northArmY, PUNTA_X - jettyX, 3), TileChar.Jetty);
builder.rect(ESCOLLERA_NORTE_PLATFORM, TileChar.Jetty);

/**
 * Faroles de la rambla, del lado del agua: la sur (Francia y Gran Bretaña), la oeste (de la punta) y
 * la 25 de Agosto, frente al puerto. Corridos de los bancos para no caerles encima.
 */
const streetLamps: TilePoint[] = [];
for (let x = 25; x < WIDTH - 1; x += 7) streetLamps.push({ x, y: southCoast(x) });
for (let y = 12; y < 66; y += 7) streetLamps.push({ x: PUNTA_X, y });
for (let x = 24; x < WIDTH - 1; x += 8) streetLamps.push({ x, y: NORTH_WATER_Y + 1 });

/**
 * Barcos pesqueros en la bahía, frente al puerto: unos amarrados cerca del Mercado del Puerto y
 * otros más afuera, fondeados (sólo decorado).
 */
const boats: Boat[] = [
  { x: 26, y: 3, facing: "east", variant: 0 },
  { x: 31, y: 1, facing: "south", variant: 1 },
  { x: 36, y: 4, facing: "east", variant: 2 },
  { x: 42, y: 2, facing: "east", variant: 3 },
  { x: 49, y: 4, facing: "south", variant: 4 },
  { x: 55, y: 1, facing: "east", variant: 5 },
  { x: 63, y: 3, facing: "east", variant: 1 },
  { x: 74, y: 1, facing: "south", variant: 2 },
  { x: 86, y: 4, facing: "east", variant: 0 },
  { x: 99, y: 2, facing: "east", variant: 3 },
  { x: 114, y: 3, facing: "south", variant: 4 },
];

/** La puerta del Hotel del Donador: el edificio entero (sólo donadores); adentro se aparece frente a la salida. */
const termasDoor: Door = {
  id: "termas",
  name: "Entrar al Hotel",
  area: rect(125, 43, 4),
  to: { cityId: "termas", at: { x: 1, y: 9 } },
  access: "donor",
};

/** La puerta del casino: el edificio entero (entra cualquiera); adentro se aparece frente a la salida. */
const casinoDoor: Door = {
  id: "casino",
  name: "Entrar al Victoria Plaza",
  area: rect(109, 20, 3),
  to: { cityId: "casino", at: { x: 1, y: 9 } },
};

/**
 * 18 de Julio sigue hacia el Centro: el borde este de la avenida es una salida (se cruza caminando,
 * sin boleto) que deja en la punta oeste de 18 de Julio del Centro.
 */
const centroEdge: Door = {
  id: "centro",
  name: "Caminar al Centro",
  area: rect(WIDTH - 1, dieciochoDeJulio[0], 1, dieciochoDeJulio[1] - dieciochoDeJulio[0] + 1),
  to: { cityId: "centro", at: { x: 1, y: 30 } },
  edge: true,
};

export const CIUDAD_VIEJA: CityDefinition = {
  ...CIUDAD_VIEJA_INFO,
  layout: builder.build(),
  // Se aparece en la Plaza Independencia (la plaza entera).
  spawnArea: plazaIndependencia,
  doors: [termasDoor, casinoDoor, centroEdge],
  fillers,
  boats,
  streetLamps,
  benches,
  busStops,
  // El cartero de la bienvenida (`welcome.ts`), en la Plaza Independencia, donde aparecen los nuevos.
  npcs: [
    {
      id: WELCOME_COURIER_ID,
      name: "Cartero",
      role: "Correo · Plaza Independencia",
      appearance: { gender: "m", skin: 1, hairColor: 6, hairStyle: "short", eyeColor: 1, facialHair: "mustache", glasses: "round", color: "#f2c94c" },
      outfit: { hat: "gorra-azul", top: "remera-azul-marino", bottom: "pantalon-beige", shoes: "championes-negros" },
      roam: rect(128, 50, 1, 1),
      talks: true,
    },
  ],
  logoSign: { landmarkId: "cabildo" },
  placeLabels: [
    { name: "Plaza Independencia", x: 131.5, y: 60.4 },
    { name: "Plaza Matriz", x: 102, y: 47.6 },
    { name: "Plaza Zabala", x: 68, y: 42.4 },
    { name: "Plaza España", x: 103, y: 77.4 },
    { name: "Peatonal Sarandí", x: 75, y: 49.5 },
    { name: "Rambla 25 de Agosto", x: 70, y: 7 },
    { name: "Rambla Francia", x: 45, y: 69 },
    { name: "Rambla Gran Bretaña", x: 125, y: 86 },
    { name: "Bahía de Montevideo", x: 68, y: 5.4 },
    { name: "Río de la Plata", x: 80, y: 90 },
    { name: "Escollera Sarandí", x: 11, y: 47 },
    { name: "Escollera norte", x: 11, y: 13 },
    { name: "18 de Julio", x: 143, y: 53.5 },
    { name: "Centro →", x: 147, y: 53.5 },
    ...Object.entries({ Piedras: rows.piedras, Cerrito: rows.cerrito, "25 de Mayo": rows.veinticincoDeMayo, Rincón: rows.rincon, "Buenos Aires": rows.buenosAires, Reconquista: rows.reconquista }).map(
      ([name, v]) => ({ name, x: 86, y: tileY(v) - 0.5 }),
    ),
    ...Object.entries({ "Pérez Castellano": COLUMN_STREETS.perezCastellano, Zabala: COLUMN_STREETS.zabala, Ituzaingó: COLUMN_STREETS.ituzaingo, "Juan Carlos Gómez": COLUMN_STREETS.juanCarlosGomez, Juncal: COLUMN_STREETS.juncal }).map(
      ([name, u]) => ({ name, x: tileX(u) - 0.5, y: 29 }),
    ),
  ],
};

/** Pseudo-aleatorio en [0, 1) por lote (igual en cliente y servidor). */
function lotHash(x: number, y: number): number {
  let h = Math.imul(x, 2654435761) ^ Math.imul(y, 1597334677);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
