"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRES_CRUCES = void 0;
const items_1 = require("../items");
const layoutBuilder_1 = require("./layoutBuilder");
const types_1 = require("./types");
/**
 * Tres Cruces, versión libre: oeste → este, las manzanas de Cordón/Tres Cruces con edificios en
 * altura, el Bulevar Artigas (norte–sur) y, cruzándolo, la Avenida Italia hacia el este. Al norte
 * de Av. Italia, el Shopping Tres Cruces (con la terminal) y su explanada (donde se aparece); al
 * oeste del bulevar, el Sanatorio Americano y el Obelisco a los Constituyentes al final de
 * 18 de Julio. Al sur de Av. Italia, el Parque Batlle con el Velódromo y el Estadio Centenario
 * rodeado por su explanada (zona de venta).
 * Las distancias no son reales, pero el orden de los lugares sí. El tamaño da para 25–50
 * jugadores a la vez sin amontonarse.
 */
const WIDTH = 84;
const HEIGHT = 64;
/** Bulevar Artigas: columnas x y x + 1. */
const BULEVAR_X = 20;
/** Avenida Italia: filas y e y + 1, del bulevar al este. */
const ITALIA_Y = 20;
const PARK_X = BULEVAR_X + 2;
const builder = new layoutBuilder_1.LayoutBuilder(WIDTH, HEIGHT, types_1.TileChar.Grass);
// Bulevar Artigas (doble vía, de punta a punta) y Avenida Italia (doble vía, hacia el este).
builder
    .column(BULEVAR_X, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(BULEVAR_X + 1, 0, HEIGHT - 1, types_1.TileChar.Street)
    .row(ITALIA_Y, PARK_X, WIDTH - 1, types_1.TileChar.Street)
    .row(ITALIA_Y + 1, PARK_X, WIDTH - 1, types_1.TileChar.Street);
// Oeste del bulevar: grilla de calles y Av. 18 de Julio, que termina en la plaza del Obelisco.
builder.column(6, 0, HEIGHT - 1, types_1.TileChar.Street).column(13, 0, HEIGHT - 1, types_1.TileChar.Street);
for (const y of [7, 17, 26, 42, 51, 58])
    builder.row(y, 0, BULEVAR_X - 1, types_1.TileChar.Street);
builder.row(33, 0, 13, types_1.TileChar.Street).row(34, 0, 13, types_1.TileChar.Street);
const obeliscoPlaza = { x: 14, y: 28, width: 6, height: 12 };
builder.rect(obeliscoPlaza, types_1.TileChar.Plaza);
// Norte de Av. Italia: calles entre manzanas, el shopping y su explanada (donde se aparece).
for (const x of [40, 52, 64, 76])
    builder.column(x, 0, ITALIA_Y - 1, types_1.TileChar.Street);
builder.rect({ x: PARK_X, y: 1, width: 18, height: ITALIA_Y - 1 }, types_1.TileChar.Plaza);
// Vereda ancha sobre Av. Italia, del lado de las manzanas.
builder.row(ITALIA_Y - 1, 41, WIDTH - 1, types_1.TileChar.Plaza);
// Parque Batlle: senderos, la plaza del velódromo y la Explanada del Centenario.
const explanada = { x: 47, y: 27, width: 26, height: 20 };
builder
    .row(24, PARK_X, WIDTH - 1, types_1.TileChar.Pedestrian)
    .row(50, PARK_X, WIDTH - 1, types_1.TileChar.Pedestrian)
    .column(42, 22, HEIGHT - 1, types_1.TileChar.Pedestrian)
    .column(80, 22, HEIGHT - 1, types_1.TileChar.Pedestrian)
    .column(61, 50, HEIGHT - 1, types_1.TileChar.Pedestrian)
    .rect({ x: 26, y: 29, width: 12, height: 12 }, types_1.TileChar.Plaza)
    .rect(explanada, types_1.TileChar.Plaza)
    // Senderos que unen la explanada con los de alrededor.
    .row(36, 43, explanada.x - 1, types_1.TileChar.Pedestrian)
    .row(36, explanada.x + explanada.width, 79, types_1.TileChar.Pedestrian)
    .column(59, 25, explanada.y - 1, types_1.TileChar.Pedestrian)
    .column(59, explanada.y + explanada.height, 49, types_1.TileChar.Pedestrian);
// Suelo bajo los edificios emblemáticos y las tiendas (así no les crecen árboles adentro).
builder.rect({ x: 8, y: 10, width: 4, height: 4 }, types_1.TileChar.Plaza).rect({ x: 74, y: 28, width: 2, height: 2 }, types_1.TileChar.Plaza);
// Manzanas: edificios en altura y casas sueltas sobre la vereda, el centro queda de parque.
const blocks = [];
for (const [x0, x1] of [
    [0, 5],
    [7, 12],
    [14, 19],
]) {
    for (const [y0, y1] of [
        [0, 6],
        [8, 16],
        [18, 25],
        [27, 32],
        [35, 41],
        [43, 50],
        [52, 57],
        [59, 63],
    ]) {
        const block = { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
        // La plaza del Obelisco no lleva edificios.
        if (x0 === obeliscoPlaza.x && y1 >= obeliscoPlaza.y && y0 < obeliscoPlaza.y + obeliscoPlaza.height)
            continue;
        blocks.push(block);
    }
}
for (const [x0, x1] of [
    [41, 51],
    [53, 63],
    [65, 75],
    [77, 83],
]) {
    blocks.push({ x: x0, y: 0, width: x1 - x0 + 1, height: ITALIA_Y - 1 });
}
blocks.forEach((block, i) => {
    builder.edges(block, types_1.TileChar.Tower, types_1.TileChar.Grass, 0.4, 50 + i).edges(block, types_1.TileChar.Block, types_1.TileChar.Grass, 0.3, 150 + i);
});
// Palmeras: sobre Av. Italia del lado del parque, en las explanadas y en la plaza del Obelisco.
for (let x = PARK_X + 1; x < WIDTH; x += 3) {
    if (x !== 42 && x !== 80)
        builder.set(x, 22, types_1.TileChar.Palm);
}
for (const [x, y] of [
    [22, 12],
    [39, 12],
    [22, 17],
    [39, 17],
    [14, 28],
    [19, 28],
    [14, 39],
    [19, 39],
    [26, 29],
    [37, 29],
    [26, 40],
    [37, 40],
    [explanada.x, explanada.y],
    [explanada.x + explanada.width - 1, explanada.y],
    [explanada.x, explanada.y + explanada.height - 1],
    [explanada.x + explanada.width - 1, explanada.y + explanada.height - 1],
]) {
    builder.set(x, y, types_1.TileChar.Palm);
}
// Árboles y más palmeras sueltas en los parques (sólo donde no cortan el paso).
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.15, 7).scatter(types_1.TileChar.Palm, types_1.TileChar.Grass, 0.05, 13);
const benches = [
    // Explanada del shopping, mirando a Av. Italia.
    { x: 25, y: 14, facing: "south" },
    { x: 29, y: 14, facing: "south" },
    { x: 33, y: 14, facing: "south" },
    { x: 37, y: 14, facing: "south" },
    { x: 23, y: 6, facing: "east" },
    { x: 36, y: 6, facing: "east" },
    // Plaza del Obelisco.
    { x: 14, y: 30, facing: "east" },
    { x: 14, y: 37, facing: "east" },
    { x: 16, y: 37, facing: "south" },
    { x: 17, y: 37, facing: "south" },
    // Parque Batlle, junto a los senderos.
    { x: 26, y: 23, facing: "south" },
    { x: 34, y: 23, facing: "south" },
    { x: 50, y: 23, facing: "south" },
    { x: 58, y: 23, facing: "south" },
    { x: 66, y: 23, facing: "south" },
    { x: 74, y: 23, facing: "south" },
    { x: 28, y: 49, facing: "south" },
    { x: 36, y: 49, facing: "south" },
    { x: 52, y: 49, facing: "south" },
    { x: 68, y: 49, facing: "south" },
    { x: 76, y: 49, facing: "south" },
    { x: 41, y: 56, facing: "east" },
    { x: 60, y: 57, facing: "east" },
    // Plaza del velódromo.
    { x: 30, y: 39, facing: "south" },
    { x: 34, y: 39, facing: "south" },
    { x: 37, y: 33, facing: "east" },
    { x: 37, y: 36, facing: "east" },
    // Explanada del Centenario.
    { x: 52, y: 44, facing: "south" },
    { x: 58, y: 44, facing: "south" },
    { x: 64, y: 44, facing: "south" },
    { x: 49, y: 32, facing: "east" },
    { x: 49, y: 39, facing: "east" },
    { x: 69, y: 32, facing: "east" },
    { x: 69, y: 39, facing: "east" },
];
const busStops = [
    { name: "Terminal Tres Cruces", x: 34, y: 8, facing: "east" },
    { name: "Avenida Italia", x: 45, y: 19, facing: "south" },
    { name: "Bulevar Artigas", x: 19, y: 27, facing: "east" },
    { name: "Estadio Centenario", x: 62, y: 23, facing: "south" },
    { name: "Avenida Italia y Propios", x: 78, y: 19, facing: "south" },
];
// Bancos y paradas van sobre vereda: si una manzana puso un edificio en ese tile, se lo saca.
for (const { x, y } of [...benches, ...busStops])
    builder.set(x, y, types_1.TileChar.Plaza);
exports.TRES_CRUCES = {
    id: "tres-cruces",
    name: "Tres Cruces",
    description: "El shopping y la terminal, el Bulevar Artigas y el Parque Batlle con el Estadio Centenario.",
    layout: builder.build(),
    // Toda la explanada del shopping: con 50 jugadores llegando en ómnibus hay lugar para todos.
    spawnArea: { x: PARK_X, y: 10, width: 18, height: 10 },
    landmarks: [
        {
            id: "shopping-tres-cruces",
            name: "Shopping Tres Cruces",
            description: "Shopping y terminal de ómnibus sobre el Bulevar Artigas: de acá salen los buses a todo el país.",
            kind: "shopping",
            area: { x: 25, y: 2, width: 8, height: 8 },
        },
        {
            id: "sanatorio-americano",
            name: "Sanatorio Americano",
            description: "Sanatorio en altura con helipuerto en la azotea.",
            kind: "hospital",
            area: { x: 8, y: 10, width: 4, height: 4 },
        },
        {
            id: "obelisco",
            name: "Obelisco a los Constituyentes",
            description: "Obelisco de granito de 1938 al final de la Avenida 18 de Julio.",
            kind: "obelisk",
            area: { x: 16, y: 33, width: 2, height: 2 },
        },
        {
            id: "velodromo",
            name: "Velódromo Municipal",
            description: "Pista de ciclismo peraltada del Parque Batlle, también escenario de recitales.",
            kind: "velodrome",
            area: { x: 28, y: 31, width: 8, height: 8 },
        },
        {
            id: "estadio-centenario",
            name: "Estadio Centenario",
            description: "Sede de la final del primer Mundial (1930), con su Torre de los Homenajes.",
            kind: "stadium",
            area: { x: 53, y: 30, width: 14, height: 14 },
        },
    ],
    benches,
    busStops,
    // Cartel "MW" sobre el techo del shopping, frente a la explanada.
    logoSign: { landmarkId: "shopping-tres-cruces" },
    shops: [
        {
            // La guardia funciona dentro del Sanatorio Americano (ya dibujado): curarse pagando, y acá te
            // trae la ambulancia si te desmayás (`HOSPITAL_SHOP_ID`).
            id: "guardia-sanatorio",
            name: "Guardia del Sanatorio",
            description: "La guardia del Sanatorio Americano: te curan del todo pagando la consulta.",
            area: { x: 8, y: 10, width: 4, height: 4 },
            building: "none",
            stock: [],
            buys: [],
            hospital: true,
        },
        {
            id: "moda-tres-cruces",
            name: "Moda Tres Cruces",
            description: "Locales de ropa del shopping: compran y venden prendas.",
            area: { x: 25, y: 2, width: 8, height: 8 },
            building: "none",
            buys: ["clothing"],
            stock: items_1.CLOTHING.map((item) => item.id),
        },
        {
            id: "kiosco-parque",
            name: "Kiosco del Parque",
            description: "Frente al Estadio Centenario: vende carritos para vender en la explanada (y compra los usados), panchos y mate.",
            area: { x: 74, y: 28, width: 2, height: 2 },
            building: "kiosk",
            stock: [...items_1.CARTS.map((item) => item.id), "pancho", "mate"],
            buys: ["cart"],
        },
    ],
    // La explanada alrededor del Estadio Centenario: con un carrito se le vende a los hinchas.
    vending: { name: "Explanada del Centenario", areas: [explanada] },
    placeLabels: [
        { name: "Bulevar Artigas", x: BULEVAR_X + 0.5, y: 54 },
        { name: "Avenida Italia", x: 58, y: ITALIA_Y + 0.5 },
        { name: "Av. 18 de Julio", x: 6, y: 33.5 },
        { name: "Explanada Tres Cruces", x: 30.5, y: 17.6 },
        { name: "Parque Batlle", x: 50, y: 57 },
        { name: "Explanada del Centenario", x: 60, y: 45.5 },
    ],
};
//# sourceMappingURL=tresCruces.js.map