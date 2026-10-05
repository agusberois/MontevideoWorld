"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIUDAD_VIEJA = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const grid_1 = require("./grid");
const info_1 = require("./info");
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
function southCoast(x) {
    if (x <= 80)
        return 69;
    if (x >= 102)
        return 86;
    return Math.round(69 + ((x - 80) / (102 - 80)) * 17);
}
const plazaIndependencia = (0, grid_1.rect)(125, 47, 14);
const plazaMatriz = (0, grid_1.rect)(100, 43, 5);
const plazaZabala = (0, grid_1.rect)(64, 35, 9, 8);
const plazaEspana = (0, grid_1.rect)(99, 72, 9, 6);
/** 18 de Julio: sale de la Plaza Independencia hacia el este (avenida, franja de 4). */
const dieciochoDeJulio = (0, grid_1.streetBand)(54);
const builder = new layoutBuilder_1.LayoutBuilder(grid_1.WIDTH, grid_1.HEIGHT, types_1.TileChar.Grass);
/** Franja de calle: vereda a los costados y calzada en el medio. */
function rowStreet(band, x0, x1, pedestrian = false) {
    const [y0, y1] = band;
    for (let y = y0; y <= y1; y++) {
        const edge = y === y0 || y === y1;
        builder.row(y, x0, x1, pedestrian ? types_1.TileChar.Pedestrian : edge ? types_1.TileChar.Sidewalk : types_1.TileChar.Street);
    }
}
function columnStreet(band, y0, y1) {
    const [x0, x1] = band;
    for (let x = x0; x <= x1; x++)
        builder.column(x, y0, y1, x === x0 || x === x1 ? types_1.TileChar.Sidewalk : types_1.TileChar.Street);
}
// Calles. Las de norte a sur no cruzan la Plaza Independencia; Buenos Aires y Reconquista terminan
// en Juncal, y la peatonal Sarandí, en la Puerta de la Ciudadela.
const juncalEnd = (0, grid_1.streetBand)((0, grid_1.tileX)(grid_1.COLUMN_STREETS.juncal))[1];
const floridaBand = (0, grid_1.streetBand)((0, grid_1.tileX)(grid_1.COLUMN_STREETS.florida));
for (const band of grid_1.COLUMN_BANDS) {
    if (band[0] === floridaBand[0]) {
        columnStreet(band, 0, plazaIndependencia.y - 1);
        columnStreet(band, plazaIndependencia.y + plazaIndependencia.height + 4, grid_1.HEIGHT - 1);
    }
    else
        columnStreet(band, 0, grid_1.HEIGHT - 1);
}
const rows = grid_1.ROW_STREETS;
for (const [name, v] of Object.entries(rows)) {
    const band = (0, grid_1.streetBand)((0, grid_1.tileY)(v));
    if (name === "sarandi")
        rowStreet(band, PUNTA_X, juncalEnd, true);
    else if (name === "buenosAires" || name === "reconquista")
        rowStreet(band, PUNTA_X, juncalEnd);
    else
        rowStreet(band, PUNTA_X, grid_1.WIDTH - 1);
}
rowStreet(dieciochoDeJulio, plazaIndependencia.x + plazaIndependencia.width, grid_1.WIDTH - 1);
// Cruces: la vereda de una calle no corta la calzada de la otra. Un tile de vereda con calzada a los
// dos lados (arriba y abajo, o a izquierda y derecha) es parte del cruce: va calzada. Las esquinas
// (vereda con vereda) quedan.
{
    const isStreet = (x, y) => builder.get(x, y) === types_1.TileChar.Street;
    const crossings = [];
    for (let y = 0; y < grid_1.HEIGHT; y++) {
        for (let x = 0; x < grid_1.WIDTH; x++) {
            if (builder.get(x, y) !== types_1.TileChar.Sidewalk)
                continue;
            if ((isStreet(x, y - 1) && isStreet(x, y + 1)) || (isStreet(x - 1, y) && isStreet(x + 1, y)))
                crossings.push([x, y]);
        }
    }
    for (const [x, y] of crossings)
        builder.set(x, y, types_1.TileChar.Street);
}
// Peatonal Pérez Castellano, frente al Mercado del Puerto (la calzada), hasta Sarandí.
// Las calles que la cruzan siguen derecho (su calzada no se corta).
const perezCastellano = (0, grid_1.streetBand)((0, grid_1.tileX)(grid_1.COLUMN_STREETS.perezCastellano));
const crossingRoads = grid_1.ROW_BANDS.flatMap(([y0, y1]) => Array.from({ length: y1 - y0 - 1 }, (_, i) => y0 + 1 + i));
for (let y = grid_1.ROW_BANDS[0][1] + 1; y < (0, grid_1.streetBand)((0, grid_1.tileY)(rows.sarandi))[0]; y++) {
    if (crossingRoads.includes(y))
        continue;
    builder.row(y, perezCastellano[0] + 1, perezCastellano[1] - 1, types_1.TileChar.Pedestrian);
}
// Plazas (un poco más grandes que las reales, para que entren los jugadores).
for (const plaza of [plazaIndependencia, plazaMatriz, plazaZabala, plazaEspana])
    builder.rect(plaza, types_1.TileChar.Plaza);
// Plaza Independencia: palmeras; Plaza Matriz: árboles en las esquinas; Plaza Zabala: cantero al medio.
for (const [x, y] of [
    [127, 49],
    [136, 50],
    [127, 58],
    [136, 58],
    [132, 49],
]) {
    builder.set(x, y, types_1.TileChar.Palm);
}
for (const [x, y] of [
    [100, 43],
    [104, 43],
    [100, 47],
    [104, 47],
]) {
    builder.set(x, y, types_1.TileChar.Tree);
}
builder.rect((0, grid_1.rect)(67, 37, 3), types_1.TileChar.Grass).set(68, 38, types_1.TileChar.Palm);
// Suelo bajo los edificios emblemáticos y las tiendas (así no les crecen casas ni árboles adentro).
for (const { area } of [...info_1.CIUDAD_VIEJA_INFO.landmarks, ...info_1.CIUDAD_VIEJA_INFO.shops])
    builder.rect(area, types_1.TileChar.Plaza);
// Agua: la bahía al norte, el río al oeste de la punta y al sur (la costa en diagonal), con la rambla
// de dos tiles sobre la orilla.
builder.rect((0, grid_1.rect)(0, 0, grid_1.WIDTH, NORTH_WATER_Y + 1), types_1.TileChar.Water);
builder.rect((0, grid_1.rect)(0, 0, PUNTA_X, grid_1.HEIGHT), types_1.TileChar.Water);
builder.column(PUNTA_X, NORTH_WATER_Y + 1, grid_1.HEIGHT - 1, types_1.TileChar.Rambla).column(PUNTA_X + 1, NORTH_WATER_Y + 1, grid_1.HEIGHT - 1, types_1.TileChar.Rambla);
for (let x = PUNTA_X; x < grid_1.WIDTH; x++) {
    const coast = southCoast(x);
    builder.set(x, coast - 1, types_1.TileChar.Rambla).set(x, coast, types_1.TileChar.Rambla);
    builder.rect((0, grid_1.rect)(x, coast + 1, 1, grid_1.HEIGHT), types_1.TileChar.Water);
}
builder.coastline();
// Bancos (antes de los edificios de relleno, para que no les caiga uno encima).
const sarandiBand = (0, grid_1.streetBand)((0, grid_1.tileY)(rows.sarandi));
const benches = [
    // Plaza Independencia: alrededor del Monumento a Artigas y entre las palmeras.
    ...(0, types_1.doubleBench)(128, 56, "south"),
    ...(0, types_1.doubleBench)(133, 56, "south"),
    { x: 128, y: 52, facing: "east" },
    { x: 133, y: 52, facing: "east" },
    ...(0, types_1.doubleBench)(130, 59, "south"),
    { x: 137, y: 54, facing: "east" },
    { x: 126, y: 54, facing: "east" },
    // Peatonal Sarandí (sobre la vereda norte, mirando a la gente que pasa).
    // (Dobles y simples, alternados.)
    ...[34, 46, 62, 78, 90, 112].flatMap((x, i) => (i % 2 === 0 ? (0, types_1.doubleBench)(x, sarandiBand[0], "south") : [{ x, y: sarandiBand[0], facing: "south" }])),
    // Plaza Matriz, alrededor de la fuente.
    { x: 101, y: 46, facing: "south" },
    { x: 103, y: 46, facing: "south" },
    { x: 103, y: 44, facing: "east" },
    // Plaza Zabala.
    { x: 65, y: 41, facing: "south" },
    { x: 71, y: 41, facing: "south" },
    { x: 65, y: 36, facing: "east" },
    // Plaza España, mirando al río.
    ...(0, types_1.doubleBench)(100, 76, "south"),
    { x: 103, y: 76, facing: "south" },
    ...(0, types_1.doubleBench)(105, 76, "south"),
];
// Rambla sur: bancos mirando al río, cada pocos tiles.
// Uno doble y uno simple, alternados (los dobles sólo donde la costa sigue derecha).
for (let x = 22, i = 0; x < grid_1.WIDTH - 2; x += 7, i++) {
    const y = southCoast(x);
    if (i % 2 === 0 && southCoast(x + 1) === y)
        benches.push(...(0, types_1.doubleBench)(x, y, "south"));
    else
        benches.push({ x, y, facing: "south" });
}
const busStops = [info_1.PLAZA_BUS_STOP, info_1.MERCADO_BUS_STOP];
for (const { x, y } of [...benches, ...busStops]) {
    const onRambla = builder.get(x, y) === types_1.TileChar.Rambla;
    builder.set(x, y, onRambla ? types_1.TileChar.Rambla : types_1.TileChar.Plaza);
}
// Edificios de relleno: lotes de 2 × 2 en las manzanas (lo que queda entre las franjas de las
// calles), sólo sobre pasto. Algunos lotes quedan de patio (con árboles). Al este de Florida, el
// Centro: edificios en altura.
const fillers = [];
const columnLimits = [[PUNTA_X + 2, grid_1.COLUMN_BANDS[0][0] - 1], ...grid_1.COLUMN_BANDS.slice(0, -1).map((band, i) => [band[1] + 1, grid_1.COLUMN_BANDS[i + 1][0] - 1]), [floridaBand[1] + 1, grid_1.WIDTH - 1]];
const rowLimits = [[NORTH_WATER_Y + 1, grid_1.ROW_BANDS[0][0] - 1], ...grid_1.ROW_BANDS.slice(0, -1).map((band, i) => [band[1] + 1, grid_1.ROW_BANDS[i + 1][0] - 1]), [grid_1.ROW_BANDS[grid_1.ROW_BANDS.length - 1][1] + 1, grid_1.HEIGHT - 1]];
const isGrass = (x, y) => builder.get(x, y) === types_1.TileChar.Grass;
for (const [x0, x1] of columnLimits) {
    for (const [y0, y1] of rowLimits) {
        for (let y = y0; y + 1 <= y1; y += 2) {
            for (let x = x0; x + 1 <= x1; x += 2) {
                if (!isGrass(x, y) || !isGrass(x + 1, y) || !isGrass(x, y + 1) || !isGrass(x + 1, y + 1))
                    continue;
                if (lotHash(x, y) < 0.22)
                    continue;
                builder.rect((0, grid_1.rect)(x, y, 2), types_1.TileChar.Building);
                fillers.push({ x, y, kind: x > floridaBand[1] ? "tower" : "house" });
            }
        }
    }
}
// Árboles en los patios y los pedazos de manzana que quedaron libres.
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.35, 11);
// Escollera Sarandí: sale de la punta (al final de la peatonal Sarandí) hacia el oeste, con la
// plataforma al final. Va después de la costa: si no, `coastline` la volvería rambla.
const jettyX = info_1.ESCOLLERA_PLATFORM.x + info_1.ESCOLLERA_PLATFORM.width;
builder.rect((0, grid_1.rect)(jettyX, sarandiBand[0] + 1, PUNTA_X - jettyX, 3), types_1.TileChar.Jetty);
builder.rect(info_1.ESCOLLERA_PLATFORM, types_1.TileChar.Jetty);
// La segunda, igual, más al norte: el brazo (filas 14 a 16) sale de la rambla oeste hacia su plataforma.
const northArmY = info_1.ESCOLLERA_NORTE_PLATFORM.y + Math.floor(info_1.ESCOLLERA_NORTE_PLATFORM.height / 2) - 1;
builder.rect((0, grid_1.rect)(jettyX, northArmY, PUNTA_X - jettyX, 3), types_1.TileChar.Jetty);
builder.rect(info_1.ESCOLLERA_NORTE_PLATFORM, types_1.TileChar.Jetty);
/**
 * Faroles de la rambla, del lado del agua: la sur (Francia y Gran Bretaña), la oeste (de la punta) y
 * la 25 de Agosto, frente al puerto. Corridos de los bancos para no caerles encima.
 */
const streetLamps = [];
for (let x = 25; x < grid_1.WIDTH - 1; x += 7)
    streetLamps.push({ x, y: southCoast(x) });
for (let y = 12; y < 66; y += 7)
    streetLamps.push({ x: PUNTA_X, y });
for (let x = 24; x < grid_1.WIDTH - 1; x += 8)
    streetLamps.push({ x, y: NORTH_WATER_Y + 1 });
/**
 * Barcos pesqueros en la bahía, frente al puerto: unos amarrados cerca del Mercado del Puerto y
 * otros más afuera, fondeados (sólo decorado).
 */
const boats = [
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
const termasDoor = {
    id: "termas",
    name: "Entrar al Hotel",
    area: (0, grid_1.rect)(125, 43, 4),
    to: { cityId: "termas", at: { x: 1, y: 9 } },
    access: "donor",
};
/** La puerta del casino: el edificio entero (entra cualquiera); adentro se aparece frente a la salida. */
const casinoDoor = {
    id: "casino",
    name: "Entrar al Victoria Plaza",
    area: (0, grid_1.rect)(109, 20, 3),
    to: { cityId: "casino", at: { x: 1, y: 8 } },
};
/**
 * 18 de Julio sigue hacia el Centro: el borde este de la avenida es una salida (se cruza caminando,
 * sin boleto) que deja en la punta oeste de 18 de Julio del Centro.
 */
const centroEdge = {
    id: "centro",
    name: "Caminar al Centro",
    area: (0, grid_1.rect)(grid_1.WIDTH - 1, dieciochoDeJulio[0], 1, dieciochoDeJulio[1] - dieciochoDeJulio[0] + 1),
    to: { cityId: "centro", at: { x: 1, y: 30 } },
    edge: true,
};
exports.CIUDAD_VIEJA = {
    ...info_1.CIUDAD_VIEJA_INFO,
    layout: builder.build(),
    // Se aparece en la Plaza Independencia (la plaza entera).
    spawnArea: plazaIndependencia,
    doors: [termasDoor, casinoDoor, centroEdge],
    fillers,
    boats,
    streetLamps,
    benches,
    busStops,
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
        ...Object.entries({ Piedras: rows.piedras, Cerrito: rows.cerrito, "25 de Mayo": rows.veinticincoDeMayo, Rincón: rows.rincon, "Buenos Aires": rows.buenosAires, Reconquista: rows.reconquista }).map(([name, v]) => ({ name, x: 86, y: (0, grid_1.tileY)(v) - 0.5 })),
        ...Object.entries({ "Pérez Castellano": grid_1.COLUMN_STREETS.perezCastellano, Zabala: grid_1.COLUMN_STREETS.zabala, Ituzaingó: grid_1.COLUMN_STREETS.ituzaingo, "Juan Carlos Gómez": grid_1.COLUMN_STREETS.juanCarlosGomez, Juncal: grid_1.COLUMN_STREETS.juncal }).map(([name, u]) => ({ name, x: (0, grid_1.tileX)(u) - 0.5, y: 29 })),
    ],
};
/** Pseudo-aleatorio en [0, 1) por lote (igual en cliente y servidor). */
function lotHash(x, y) {
    let h = Math.imul(x, 2654435761) ^ Math.imul(y, 1597334677);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
//# sourceMappingURL=map.js.map