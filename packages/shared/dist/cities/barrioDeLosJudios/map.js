"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BARRIO_DE_LOS_JUDIOS = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * Barrio de los Judíos (Villa Muñoz), versión libre: una grilla de manzanas apretadas de casas y
 * locales. De oeste a este, las calles Justicia y **Arenal Grande** (la comercial, doble mano y con
 * mayoristas en las dos veredas), la peatonal **Emilio Reus** entre las casas de colores de Reus al
 * Norte (con bancos), y Libres. De norte a sur, Nicaragua, Inca, la Avenida General Flores y
 * Miguelete, con el Espacio de Arte Contemporáneo (ex Cárcel de Miguelete) en la esquina con Arenal
 * Grande. Se aparece en la plazoleta del medio, frente a San Pancracio.
 * Las distancias y algunas esquinas no son reales; el aire del barrio sí: tiendas por todos lados.
 */
const WIDTH = 84;
const HEIGHT = 64;
const JUSTICIA_X = 6;
/** Arenal Grande: columnas x y x + 1. */
const ARENAL_X = 20;
/** Peatonal Emilio Reus: tres tiles de ancho entre las casas de colores (columnas 31 y 35). */
const REUS_X = 32;
const LIBRES_X = 46;
const NICARAGUA_Y = 6;
const INCA_Y = 18;
/** Avenida General Flores: filas y e y + 1. */
const FLORES_Y = 30;
const MIGUELETE_Y = 56;
const builder = new layoutBuilder_1.LayoutBuilder(WIDTH, HEIGHT, types_1.TileChar.Grass);
// Calles norte–sur.
builder
    .column(JUSTICIA_X, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(ARENAL_X, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(ARENAL_X + 1, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(LIBRES_X, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(60, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(74, 0, HEIGHT - 1, types_1.TileChar.Street);
// Emilio Reus: calle al norte y al sur, peatonal entre las casas de Reus al Norte.
builder.column(REUS_X + 1, 0, HEIGHT - 1, types_1.TileChar.Street);
builder.rect({ x: REUS_X, y: NICARAGUA_Y + 1, width: 3, height: FLORES_Y - NICARAGUA_Y - 1 }, types_1.TileChar.Pedestrian);
// Calles este–oeste.
builder
    .row(NICARAGUA_Y, 0, WIDTH - 1, types_1.TileChar.Street)
    .row(INCA_Y, 0, WIDTH - 1, types_1.TileChar.Street)
    .row(FLORES_Y, 0, WIDTH - 1, types_1.TileChar.Street)
    .row(FLORES_Y + 1, 0, WIDTH - 1, types_1.TileChar.Street)
    .row(43, 0, WIDTH - 1, types_1.TileChar.Street)
    .row(MIGUELETE_Y, 0, WIDTH - 1, types_1.TileChar.Street);
// Plazoleta del medio (donde se aparece), frente a San Pancracio.
const plazoleta = { x: 36, y: 32, width: 10, height: 11 };
builder.rect(plazoleta, types_1.TileChar.Plaza);
// Veredas anchas de Arenal Grande: la gente camina entre los puestos y las vidrieras.
builder.column(ARENAL_X - 1, 0, HEIGHT - 1, types_1.TileChar.Plaza).column(ARENAL_X + 2, 0, HEIGHT - 1, types_1.TileChar.Plaza);
// Suelo bajo los edificios emblemáticos y las tiendas (así no les crecen árboles ni casas adentro).
for (const { area } of [...info_1.BARRIO_DE_LOS_JUDIOS_INFO.landmarks, ...info_1.BARRIO_DE_LOS_JUDIOS_INFO.shops]) {
    builder.rect(area, types_1.TileChar.Plaza);
}
// Manzanas: casas sobre el borde (barrio viejo de casas bajas) y patios con árboles adentro. Casas en
// el 40 % del borde y pocos árboles: ~730 objetos, como Tres Cruces. Con el borde lleno pasaba los
// 1.500 (el doble), demasiado para celulares.
const columns = [
    [0, 5],
    [7, 18],
    [23, 30],
    [36, 45],
    [47, 59],
    [61, 73],
    [75, 83],
];
const rows = [
    [0, 5],
    [7, 17],
    [19, 29],
    [32, 42],
    [44, 55],
    [57, 63],
];
let seed = 0;
for (const [x0, x1] of columns) {
    for (const [y0, y1] of rows) {
        seed += 1;
        const block = { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
        if (x0 === plazoleta.x && y0 === plazoleta.y)
            continue;
        builder.edges(block, types_1.TileChar.Block, types_1.TileChar.Grass, 0.4, 300 + seed);
    }
}
// Al este, más lejos del centro comercial, algún edificio en altura.
for (const [x0, x1] of columns.slice(5)) {
    for (const [y0, y1] of rows)
        builder.edges({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, types_1.TileChar.Tower, types_1.TileChar.Block, 0.2, 400 + x0 + y0);
}
// Palmeras en las esquinas de la plazoleta y árboles en los patios (sólo donde no cortan el paso).
for (const [x, y] of [
    [plazoleta.x, plazoleta.y],
    [plazoleta.x + plazoleta.width - 1, plazoleta.y],
    [plazoleta.x, plazoleta.y + plazoleta.height - 1],
    [plazoleta.x + plazoleta.width - 1, plazoleta.y + plazoleta.height - 1],
]) {
    builder.set(x, y, types_1.TileChar.Palm);
}
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.1, 21);
const benches = [
    // Peatonal Emilio Reus: bancos contra las casas, mirando a la peatonal.
    { x: REUS_X, y: 9, facing: "east" },
    { x: REUS_X, y: 13, facing: "east" },
    { x: REUS_X, y: 21, facing: "east" },
    { x: REUS_X, y: 25, facing: "east" },
    // Plazoleta.
    { x: 38, y: 34, facing: "south" },
    { x: 41, y: 34, facing: "south" },
    { x: 43, y: 34, facing: "south" },
    { x: 38, y: 40, facing: "south" },
    { x: 41, y: 40, facing: "south" },
    { x: 43, y: 40, facing: "south" },
    { x: 37, y: 37, facing: "east" },
    // Veredas de Arenal Grande, entre local y local (para descansar de tanto comprar).
    { x: ARENAL_X - 1, y: 14, facing: "east" },
    { x: ARENAL_X - 1, y: 27, facing: "east" },
    { x: ARENAL_X - 1, y: 39, facing: "east" },
    { x: ARENAL_X - 1, y: 50, facing: "east" },
];
const busStops = [
    { name: "Arenal Grande", x: ARENAL_X - 1, y: 24, facing: "east" },
    { name: "General Flores", x: 50, y: 29, facing: "south" },
    { name: "Miguelete", x: 28, y: MIGUELETE_Y - 1, facing: "south" },
];
// Bancos y paradas van sobre vereda: si una manzana puso una casa en ese tile, se la saca.
for (const { x, y } of [...benches, ...busStops])
    builder.set(x, y, types_1.TileChar.Plaza);
exports.BARRIO_DE_LOS_JUDIOS = {
    ...info_1.BARRIO_DE_LOS_JUDIOS_INFO,
    layout: builder.build(),
    // La plazoleta y la avenida de enfrente: con 50 jugadores llegando en ómnibus hay lugar.
    spawnArea: { x: plazoleta.x, y: FLORES_Y, width: plazoleta.width, height: plazoleta.height + 2 },
    benches,
    busStops,
    // Cartel "MW" sobre el techo del Espacio de Arte Contemporáneo.
    logoSign: { landmarkId: "eac" },
    placeLabels: [
        { name: "Justicia", x: JUSTICIA_X, y: 38 },
        { name: "Arenal Grande", x: ARENAL_X + 0.5, y: 3 },
        { name: "Peatonal Emilio Reus", x: REUS_X + 1, y: 12 },
        { name: "Libres", x: LIBRES_X, y: 50 },
        { name: "Nicaragua", x: 66, y: NICARAGUA_Y },
        { name: "Inca", x: 66, y: INCA_Y },
        { name: "Avenida General Flores", x: 66, y: FLORES_Y + 0.5 },
        { name: "Miguelete", x: 40, y: MIGUELETE_Y },
        { name: "Plazoleta Villa Muñoz", x: 40.5, y: 42 },
    ],
};
//# sourceMappingURL=map.js.map