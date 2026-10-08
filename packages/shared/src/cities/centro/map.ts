import { LayoutBuilder } from "../layoutBuilder";
import { Bench, BusStop, CityDefinition, Door, Filler, StringLight, TileChar, TilePoint, doubleBench } from "../types";
import { AVENUE, AVENUE_WIDTH, COLUMN_STREETS, HEIGHT, INTENDENCIA_X, ROW_STREETS, STREET_WIDTH, WIDTH, rect } from "./grid";
import { CAGANCHA, CAGANCHA_NORTE, CENTRO_INFO, FABINI } from "./info";

/**
 * El Centro, con el patrón de Ciudad Vieja (`grid.ts`): franjas de calle de 4 tiles (vereda, calzada
 * de 2, vereda), sin vereda en los cruces, y manzanas llenas de edificios del 900 de 2 × 2
 * (`fillers`, `bigTowerSpec`). 18 de Julio cruza de oeste a este con vereda doble y las vidrieras
 * de las tiendas a los dos lados; la Plaza Fabini al norte, la Plaza Cagancha a los dos lados de la avenida,
 * con la Columna de la Paz en el medio de la calzada (donde se aparece al llegar en ómnibus) y, pasando Ejido, la explanada de la Intendencia.
 *
 * **Se llega caminando desde Ciudad Vieja**: el borde oeste de 18 de Julio es una puerta (`Door` con
 * `edge`) a la Plaza Independencia, y en Ciudad Vieja el borde este de 18 de Julio trae acá, sin boleto.
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Grass);

/**
 * Calles: cada tile es calzada si está en la calzada de alguna calle, vereda si está en alguna vereda
 * (y en ninguna calzada) y manzana si no. Así **en los cruces no hay vereda** (la calzada de una calle
 * sigue derecho por la vereda de la otra) y las esquinas, vereda con vereda, quedan. En 18 de Julio
 * la vereda es doble. San José no sigue pasando Ejido: ahí está la Intendencia.
 */
const columnBands = Object.values(COLUMN_STREETS).map((x0) => ({ x0, x1: x0 + STREET_WIDTH - 1, sidewalk: 1 }));
const rowBands = Object.entries(ROW_STREETS).map(([name, y0]) => {
  const avenue = name === "dieciochoDeJulio";
  const width = avenue ? AVENUE_WIDTH : STREET_WIDTH;
  return { y0, y1: y0 + width - 1, sidewalk: avenue ? 2 : 1, xEnd: name === "sanJose" ? INTENDENCIA_X - 1 : WIDTH - 1 };
});
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    let road = false;
    let sidewalk = false;
    for (const band of columnBands) {
      if (x < band.x0 || x > band.x1) continue;
      if (x < band.x0 + band.sidewalk || x > band.x1 - band.sidewalk) sidewalk = true;
      else road = true;
    }
    for (const band of rowBands) {
      if (y < band.y0 || y > band.y1 || x > band.xEnd) continue;
      if (y < band.y0 + band.sidewalk || y > band.y1 - band.sidewalk) sidewalk = true;
      else road = true;
    }
    if (road) builder.set(x, y, TileChar.Street);
    else if (sidewalk) builder.set(x, y, TileChar.Sidewalk);
  }
}

// Plazas y la explanada de la Intendencia (de 18 de Julio hasta el palacio).
const explanada = rect(INTENDENCIA_X, AVENUE.southFront, WIDTH - INTENDENCIA_X, 6);
for (const plaza of [FABINI, CAGANCHA, CAGANCHA_NORTE, explanada]) builder.rect(plaza, TileChar.Plaza);
// Canteros con árboles y palmeras en las esquinas de las plazas (sólo en el borde, no cortan el paso).
for (const [x, y] of [
  [FABINI.x, FABINI.y],
  [FABINI.x + FABINI.width - 1, FABINI.y],
  [CAGANCHA.x + CAGANCHA.width - 1, CAGANCHA.y + CAGANCHA.height - 1],
  [CAGANCHA_NORTE.x + CAGANCHA_NORTE.width - 1, CAGANCHA_NORTE.y],
]) {
  builder.set(x, y, TileChar.Tree);
}
for (const [x, y] of [
  [FABINI.x, FABINI.y + FABINI.height - 1],
  [CAGANCHA.x + CAGANCHA.width - 1, CAGANCHA.y],
  [CAGANCHA_NORTE.x, CAGANCHA_NORTE.y + CAGANCHA_NORTE.height - 1],
  [INTENDENCIA_X, explanada.y + explanada.height - 1],
  [WIDTH - 1, explanada.y + explanada.height - 1],
]) {
  builder.set(x, y, TileChar.Palm);
}
// Plaza Fabini (del Entrevero): canteros de pasto en las esquinas de arriba y sobre el borde este,
// con árboles; los caminos quedan de baldosa hacia la fuente.
for (const [x, y] of [
  [FABINI.x, FABINI.y + 1],
  [FABINI.x + 1, FABINI.y],
  [FABINI.x + 1, FABINI.y + 1],
  [FABINI.x + FABINI.width - 2, FABINI.y],
  [FABINI.x + FABINI.width - 2, FABINI.y + 1],
  [FABINI.x + FABINI.width - 1, FABINI.y + 1],
  [FABINI.x + FABINI.width - 1, FABINI.y + 2],
  [FABINI.x + FABINI.width - 1, FABINI.y + 3],
  [FABINI.x + FABINI.width - 1, FABINI.y + 5],
]) {
  builder.set(x, y, TileChar.Grass);
}
builder.set(FABINI.x + FABINI.width - 1, FABINI.y + 4, TileChar.Tree);
// Plaza Cagancha, a los dos lados de 18 de Julio: en cada mitad un cantero de pasto (lejos de la
// avenida, así el borde que da a la Columna de la Paz queda de baldosa) y plátanos en el borde.
for (let y = CAGANCHA.y + 2; y <= CAGANCHA.y + 5; y++) {
  for (let x = CAGANCHA.x + 1; x <= CAGANCHA.x + 4; x++) builder.set(x, y, TileChar.Grass);
}
for (let y = CAGANCHA_NORTE.y + 2; y <= CAGANCHA_NORTE.y + 5; y++) {
  for (let x = CAGANCHA_NORTE.x + 1; x <= CAGANCHA_NORTE.x + 4; x++) builder.set(x, y, TileChar.Grass);
}
for (const [x, y] of [
  [CAGANCHA.x, CAGANCHA.y],
  [CAGANCHA.x + CAGANCHA.width - 2, CAGANCHA.y + CAGANCHA.height - 1],
  [CAGANCHA_NORTE.x, CAGANCHA_NORTE.y],
]) {
  builder.set(x, y, TileChar.Tree);
}
// La Columna de la Paz, en el medio de la calzada de 18 de Julio: una isla de baldosa alrededor.
builder.rect(rect(CAGANCHA.x + 1, AVENUE.y0 + 2, 4, 2), TileChar.Plaza);
// Los jardines alrededor de la Intendencia: pasto con árboles (el `scatter` de abajo).
builder.rect(rect(INTENDENCIA_X, explanada.y + explanada.height, WIDTH - INTENDENCIA_X, ROW_STREETS.soriano - explanada.y - explanada.height), TileChar.Grass);

// Suelo bajo los edificios emblemáticos y las tiendas (así no les crecen edificios ni árboles adentro).
for (const { area } of [...CENTRO_INFO.landmarks, ...CENTRO_INFO.shops]) builder.rect(area, TileChar.Plaza);

// Bancos (antes de los edificios de relleno, para que no les caiga uno encima).
const benches: Bench[] = [
  // Plaza Fabini, alrededor de El Entrevero.
  ...doubleBench(FABINI.x + 1, FABINI.y + 6, "south"),
  ...doubleBench(FABINI.x + 4, FABINI.y + 6, "south"),
  { x: FABINI.x, y: FABINI.y + 2, facing: "east" },
  { x: FABINI.x, y: FABINI.y + 4, facing: "east" },
  // Plaza Cagancha: en la mitad sur, alrededor del cantero; en la norte, mirando a la Columna de la Paz.
  ...doubleBench(CAGANCHA.x + 2, CAGANCHA.y + 6, "south"),
  { x: CAGANCHA.x + 5, y: CAGANCHA.y + 6, facing: "south" },
  { x: CAGANCHA.x, y: CAGANCHA.y + 2, facing: "east" },
  { x: CAGANCHA.x, y: CAGANCHA.y + 4, facing: "east" },
  ...doubleBench(CAGANCHA_NORTE.x + 1, CAGANCHA_NORTE.y + 6, "south"),
  ...doubleBench(CAGANCHA_NORTE.x + 3, CAGANCHA_NORTE.y + 6, "south"),
  { x: CAGANCHA_NORTE.x, y: CAGANCHA_NORTE.y + 3, facing: "east" },
  // Explanada de la Intendencia, mirando al David.
  ...doubleBench(INTENDENCIA_X + 3, explanada.y + 4, "south"),
  ...doubleBench(INTENDENCIA_X + 12, explanada.y + 4, "south"),
  { x: INTENDENCIA_X + 2, y: explanada.y + 1, facing: "east" },
];
// 18 de Julio: bancos sobre la vereda de adentro, mirando a la calle, entre local y local.
for (const x of [11, 31, 41, 61, 91, 101]) benches.push({ x, y: AVENUE.y0 + 1, facing: "south" });

const busStops: BusStop[] = [
  { name: "18 de Julio y Río Negro", x: COLUMN_STREETS.rioNegro + STREET_WIDTH + 3, y: AVENUE.y0 + 1, facing: "south" },
  { name: "Plaza Cagancha", x: COLUMN_STREETS.zelmarMichelini + STREET_WIDTH + 3, y: AVENUE.y0 + 1, facing: "south" },
  { name: "Ejido", x: COLUMN_STREETS.ejido, y: ROW_STREETS.soriano - 3, facing: "east" },
];
for (const { x, y } of [...benches, ...busStops]) {
  if (builder.get(x, y) !== TileChar.Sidewalk) builder.set(x, y, TileChar.Plaza);
}

// Patios delante de los edificios emblemáticos y los locales: la cámara mira desde el sureste, así
// que sus fachadas visibles son la sur y la este. Dos tiles de baldosa de ese lado (en vez de un
// edificio de relleno) para que no los tape la manzana de al lado.
for (const { area } of [...CENTRO_INFO.landmarks, ...CENTRO_INFO.shops]) {
  for (let y = area.y; y <= area.y + area.height + 1; y++) {
    for (let x = area.x; x <= area.x + area.width + 1; x++) {
      const inFront = y >= area.y + area.height || x >= area.x + area.width;
      if (inFront && builder.get(x, y) === TileChar.Grass) builder.set(x, y, TileChar.Plaza);
    }
  }
}

/**
 * ¿El lote de 2 × 2 en (x, y) queda delante (al sur o al este, a 6 tiles o menos) de un edificio
 * emblemático? Ahí van casonas bajas del 1800 en lugar de edificios altos, así no tapan su fachada.
 */
function inFrontOfLandmark(x: number, y: number): boolean {
  return CENTRO_INFO.landmarks.some(({ area }) => {
    const right = area.x + area.width;
    const bottom = area.y + area.height;
    const south = y + 1 >= bottom && y < bottom + 6 && x + 1 >= area.x - 1 && x <= right + 4;
    const east = x + 1 >= right && x < right + 6 && y + 1 >= area.y - 1 && y <= bottom + 4;
    return south || east;
  });
}

// Edificios de relleno: lotes de 2 × 2 en las manzanas (lo que queda entre las franjas), sólo sobre
// pasto. Algún lote queda de patio con árboles. Todo el Centro son edificios del 900 (`bigTowerSpec`).
const fillers: Filler[] = [];
const columnStarts = Object.values(COLUMN_STREETS);
const columnLimits = [[0, columnStarts[0] - 1], ...columnStarts.map((x, i) => [x + STREET_WIDTH, (columnStarts[i + 1] ?? WIDTH) - 1])];
const rowStarts: Array<[number, number]> = [
  [ROW_STREETS.mercedes, STREET_WIDTH],
  [ROW_STREETS.colonia, STREET_WIDTH],
  [ROW_STREETS.dieciochoDeJulio, AVENUE_WIDTH],
  [ROW_STREETS.sanJose, STREET_WIDTH],
  [ROW_STREETS.soriano, STREET_WIDTH],
];
const rowLimits = [[0, rowStarts[0][0] - 1], ...rowStarts.map(([y, width], i) => [y + width, (rowStarts[i + 1]?.[0] ?? HEIGHT) - 1])];
const isGrass = (x: number, y: number) => builder.get(x, y) === TileChar.Grass;
for (const [x0, x1] of columnLimits) {
  for (const [y0, y1] of rowLimits) {
    // Al sur de la avenida, pasando Ejido, van la explanada y los jardines de la Intendencia.
    if (x0 === INTENDENCIA_X && y0 > AVENUE.y0) continue;
    // Las dos mitades de la Plaza Cagancha: sus canteros son de árboles, no de edificios.
    if (x0 === CAGANCHA.x) continue;
    // Los lotes se alinean contra la avenida: las manzanas del norte se llenan desde abajo (así los
    // edificios quedan pegados a la vereda de 18 de Julio) y las del sur, desde arriba.
    const fromBottom = y1 < AVENUE.y0;
    for (let i = 0; y0 + i + 1 <= y1; i += 2) {
      const y = fromBottom ? y1 - 1 - i : y0 + i;
      for (let x = x0; x + 1 <= x1; x += 2) {
        if (!isGrass(x, y) || !isGrass(x + 1, y) || !isGrass(x, y + 1) || !isGrass(x + 1, y + 1)) continue;
        if (lotHash(x, y) < 0.18) continue;
        builder.rect(rect(x, y, 2), TileChar.Building);
        fillers.push({ x, y, kind: inFrontOfLandmark(x, y) ? "house" : "tower" });
      }
    }
  }
}
// Árboles en los patios, los pedazos de manzana que quedaron libres y los jardines de la Intendencia.
builder.scatter(TileChar.Tree, TileChar.Grass, 0.35, 29);

/** Faroles sobre la vereda de afuera de 18 de Julio (de noche se prenden) y en la explanada. */
const streetLamps: TilePoint[] = [];
for (let x = 3; x < WIDTH - 1; x += 6) streetLamps.push({ x, y: AVENUE.y0 }, { x: x + 3, y: AVENUE.y1 });
for (const x of [INTENDENCIA_X + 1, WIDTH - 2]) streetLamps.push({ x, y: explanada.y + 2 });

/**
 * Guirnaldas de la Plaza Cagancha: en cada mitad, cuatro postes en las esquinas de baldosa alrededor
 * del cantero (sin pisar bancos ni el Mercado de los Artesanos), con guirnaldas por el borde y en
 * cruz por arriba; y dos que cruzan 18 de Julio, de una mitad a la otra, pasando junto a la Columna.
 */
const stringLights: StringLight[] = [];
for (const top of [CAGANCHA_NORTE.y + 1, CAGANCHA.y + 1]) {
  const bottom = top + (top === CAGANCHA.y + 1 ? 4 : 5);
  const [nw, ne, sw, se] = [
    { x: CAGANCHA.x, y: top },
    { x: CAGANCHA.x + 5, y: top },
    { x: CAGANCHA.x, y: bottom },
    { x: CAGANCHA.x + 5, y: bottom },
  ];
  stringLights.push({ from: nw, to: ne }, { from: ne, to: se }, { from: se, to: sw }, { from: sw, to: nw }, { from: nw, to: se }, { from: ne, to: sw });
}
for (const x of [CAGANCHA.x, CAGANCHA.x + 5]) stringLights.push({ from: { x, y: CAGANCHA_NORTE.y + 6 }, to: { x, y: CAGANCHA.y + 1 } });

/**
 * La puerta de la Intendencia: el edificio entero (entra cualquiera). Adentro, el hall de Atención al
 * público con los escritorios y la funcionaria de la bienvenida; se aparece frente a la salida.
 */
const intendenciaDoor: Door = {
  id: "intendencia",
  name: "Entrar a la Intendencia",
  area: rect(INTENDENCIA_X + 5, AVENUE.southFront + 6, 8),
  to: { cityId: "intendencia", at: { x: 1, y: 6 } },
};

/** 18 de Julio sigue hacia Ciudad Vieja: el borde oeste de la avenida lleva a la Plaza Independencia. */
const toCiudadVieja: Door = {
  id: "ciudad-vieja",
  name: "Caminar a Ciudad Vieja",
  area: rect(0, AVENUE.y0, 1, AVENUE_WIDTH),
  to: { cityId: "ciudad-vieja", at: { x: 148, y: 53 } },
  edge: true,
};

export const CENTRO: CityDefinition = {
  ...CENTRO_INFO,
  layout: builder.build(),
  // Las dos mitades de la Plaza Cagancha y la avenida del medio: con 50 jugadores llegando en ómnibus hay lugar.
  spawnArea: rect(CAGANCHA.x - 3, CAGANCHA_NORTE.y, CAGANCHA.width + 6, CAGANCHA.y + CAGANCHA.height - CAGANCHA_NORTE.y),
  doors: [toCiudadVieja, intendenciaDoor],
  fillers,
  // En los cruces, la calzada: ahí no va farol.
  streetLamps: streetLamps.filter(({ x, y }) => builder.get(x, y) !== TileChar.Street),
  stringLights,
  benches,
  busStops,
  logoSign: { landmarkId: "intendencia" },
  // Se toca en la calle sobre 18 de Julio (calzada y veredas), en las plazas y en la explanada.
  busking: { name: "18 de Julio", areas: [rect(0, AVENUE.y0, WIDTH, AVENUE_WIDTH), FABINI, CAGANCHA, CAGANCHA_NORTE, explanada] },
  placeLabels: [
    { name: "18 de Julio", x: 24, y: AVENUE.y0 + 2.5 },
    { name: "18 de Julio", x: 92, y: AVENUE.y0 + 2.5 },
    { name: "← Ciudad Vieja", x: 3, y: AVENUE.y0 + 2.5 },
    { name: "Plaza Fabini", x: FABINI.x + 3.5, y: FABINI.y + FABINI.height - 0.6 },
    { name: "Plaza Cagancha", x: CAGANCHA.x + 3.5, y: CAGANCHA.y + CAGANCHA.height - 0.6 },
    { name: "Plaza Cagancha", x: CAGANCHA_NORTE.x + 3.5, y: CAGANCHA_NORTE.y + 0.5 },
    { name: "Explanada de la Intendencia", x: INTENDENCIA_X + 7.5, y: explanada.y + 0.5 },
    ...Object.entries({ Mercedes: ROW_STREETS.mercedes, Colonia: ROW_STREETS.colonia, "San José": ROW_STREETS.sanJose, Soriano: ROW_STREETS.soriano }).map(([name, y]) => ({
      name,
      x: 60,
      y: y + 1.5,
    })),
    ...Object.entries({
      Andes: COLUMN_STREETS.andes,
      Convención: COLUMN_STREETS.convencion,
      "Río Branco": COLUMN_STREETS.rioBranco,
      "Julio Herrera y Obes": COLUMN_STREETS.julioHerreraYObes,
      "Río Negro": COLUMN_STREETS.rioNegro,
      Paraguay: COLUMN_STREETS.paraguay,
      Rondeau: COLUMN_STREETS.rondeau,
      "Zelmar Michelini": COLUMN_STREETS.zelmarMichelini,
      Yí: COLUMN_STREETS.yi,
      Yaguarón: COLUMN_STREETS.yaguaron,
      Ejido: COLUMN_STREETS.ejido,
    }).map(([name, x]) => ({ name, x: x + 1.5, y: 12 })),
  ],
};

/** Pseudo-aleatorio en [0, 1) por lote (igual en cliente y servidor). */
function lotHash(x: number, y: number): number {
  let h = Math.imul(x, 2654435761) ^ Math.imul(y, 1597334677);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
