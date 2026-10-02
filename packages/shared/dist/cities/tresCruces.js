"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRES_CRUCES = void 0;
const items_1 = require("../items");
const layoutBuilder_1 = require("./layoutBuilder");
const types_1 = require("./types");
/**
 * Tres Cruces, versión libre y compacta: oeste → este, las manzanas de Cordón/Tres Cruces con
 * edificios en altura, el Bulevar Artigas (norte–sur) y, cruzándolo, la Avenida Italia hacia el
 * este. Al norte de Av. Italia, el Shopping Tres Cruces (con la terminal) y su explanada; al oeste
 * del bulevar, el Sanatorio Americano y el Obelisco a los Constituyentes al final de 18 de Julio.
 * Al sur de Av. Italia, el Parque Batlle con el Velódromo y el Estadio Centenario.
 * Las distancias no son reales, pero el orden de los lugares sí.
 */
const WIDTH = 60;
const HEIGHT = 46;
const builder = new layoutBuilder_1.LayoutBuilder(WIDTH, HEIGHT, types_1.TileChar.Grass);
// Bulevar Artigas (doble vía, de punta a punta) y Avenida Italia (doble vía, hacia el este).
builder
    .column(14, 0, HEIGHT - 1, types_1.TileChar.Street)
    .column(15, 0, HEIGHT - 1, types_1.TileChar.Street)
    .row(14, 16, WIDTH - 1, types_1.TileChar.Street)
    .row(15, 16, WIDTH - 1, types_1.TileChar.Street);
// Oeste del bulevar: grilla de calles y Av. 18 de Julio, que termina en la plaza del Obelisco.
builder.column(4, 0, HEIGHT - 1, types_1.TileChar.Street).column(9, 0, HEIGHT - 1, types_1.TileChar.Street);
for (const y of [5, 17, 32, 39])
    builder.row(y, 0, 13, types_1.TileChar.Street);
builder.row(24, 0, 9, types_1.TileChar.Street).row(25, 0, 9, types_1.TileChar.Street);
builder.rect({ x: 10, y: 21, width: 4, height: 8 }, types_1.TileChar.Plaza);
// Norte de Av. Italia: calles entre manzanas y la explanada del shopping (donde se aparece).
for (const x of [26, 37, 48])
    builder.column(x, 0, 13, types_1.TileChar.Street);
builder
    .rect({ x: 16, y: 2, width: 8, height: 7 }, types_1.TileChar.Plaza)
    .rect({ x: 16, y: 9, width: 10, height: 5 }, types_1.TileChar.Plaza);
// Parque Batlle: senderos y explanadas alrededor del velódromo y del estadio.
builder
    .row(18, 16, WIDTH - 1, types_1.TileChar.Pedestrian)
    .row(35, 16, WIDTH - 1, types_1.TileChar.Pedestrian)
    .column(33, 16, HEIGHT - 1, types_1.TileChar.Pedestrian)
    .column(55, 16, HEIGHT - 1, types_1.TileChar.Pedestrian)
    .rect({ x: 19, y: 21, width: 10, height: 10 }, types_1.TileChar.Plaza)
    .rect({ x: 38, y: 20, width: 14, height: 14 }, types_1.TileChar.Plaza);
// Suelo bajo los edificios emblemáticos (así no les crecen árboles adentro).
builder.rect({ x: 5, y: 8, width: 4, height: 4 }, types_1.TileChar.Plaza);
// Manzanas: edificios en altura y casas sueltas sobre la vereda, el centro queda de parque.
const blocks = [];
for (const [x0, x1] of [
    [0, 3],
    [5, 8],
    [10, 13],
]) {
    for (const [y0, y1] of [
        [0, 4],
        [6, 16],
        [18, 23],
        [26, 31],
        [33, 38],
        [40, 45],
    ]) {
        blocks.push({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
    }
}
for (const [x0, x1] of [
    [27, 36],
    [38, 47],
    [49, 59],
]) {
    blocks.push({ x: x0, y: 0, width: x1 - x0 + 1, height: 14 });
}
blocks.forEach((block, i) => {
    builder.edges(block, types_1.TileChar.Tower, types_1.TileChar.Grass, 0.4, 50 + i).edges(block, types_1.TileChar.Block, types_1.TileChar.Grass, 0.3, 150 + i);
});
// Palmeras: sobre Av. Italia del lado del parque, en la explanada y en la plaza del Obelisco.
for (let x = 17; x < WIDTH; x += 3) {
    if (x !== 33 && x !== 55)
        builder.set(x, 16, types_1.TileChar.Palm);
}
for (const [x, y] of [
    [16, 10],
    [25, 10],
    [16, 12],
    [25, 12],
    [10, 21],
    [13, 21],
    [10, 28],
    [13, 28],
]) {
    builder.set(x, y, types_1.TileChar.Palm);
}
// Árboles y más palmeras sueltas en los parques (sólo donde no cortan el paso).
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.15, 7).scatter(types_1.TileChar.Palm, types_1.TileChar.Grass, 0.05, 13);
exports.TRES_CRUCES = {
    id: "tres-cruces",
    name: "Tres Cruces",
    description: "El shopping y la terminal, el Bulevar Artigas y el Parque Batlle con el Estadio Centenario.",
    layout: builder.build(),
    spawnArea: { x: 17, y: 10, width: 8, height: 3 },
    landmarks: [
        {
            id: "shopping-tres-cruces",
            name: "Shopping Tres Cruces",
            description: "Shopping y terminal de ómnibus sobre el Bulevar Artigas: de acá salen los buses a todo el país.",
            kind: "shopping",
            area: { x: 17, y: 3, width: 6, height: 6 },
        },
        {
            id: "sanatorio-americano",
            name: "Sanatorio Americano",
            description: "Sanatorio en altura con helipuerto en la azotea.",
            kind: "hospital",
            area: { x: 5, y: 8, width: 4, height: 4 },
        },
        {
            id: "obelisco",
            name: "Obelisco a los Constituyentes",
            description: "Obelisco de granito de 1938 al final de la Avenida 18 de Julio.",
            kind: "obelisk",
            area: { x: 11, y: 24, width: 2, height: 2 },
        },
        {
            id: "velodromo",
            name: "Velódromo Municipal",
            description: "Pista de ciclismo peraltada del Parque Batlle, también escenario de recitales.",
            kind: "velodrome",
            area: { x: 20, y: 22, width: 8, height: 8 },
        },
        {
            id: "estadio-centenario",
            name: "Estadio Centenario",
            description: "Sede de la final del primer Mundial (1930), con su Torre de los Homenajes.",
            kind: "stadium",
            area: { x: 40, y: 22, width: 10, height: 10 },
        },
    ],
    benches: [
        // Explanada del shopping, mirando a Av. Italia.
        { x: 18, y: 13, facing: "south" },
        { x: 21, y: 13, facing: "south" },
        { x: 24, y: 13, facing: "south" },
        // Plaza del Obelisco.
        { x: 10, y: 23, facing: "east" },
        { x: 10, y: 26, facing: "east" },
        // Parque Batlle, junto al sendero.
        { x: 22, y: 17, facing: "south" },
        { x: 30, y: 17, facing: "south" },
        { x: 44, y: 17, facing: "south" },
        { x: 52, y: 17, facing: "south" },
        { x: 24, y: 34, facing: "south" },
        { x: 45, y: 34, facing: "south" },
    ],
    busStops: [
        { name: "Terminal Tres Cruces", x: 25, y: 8, facing: "east" },
        { name: "Avenida Italia", x: 27, y: 13, facing: "south" },
        { name: "Bulevar Artigas", x: 13, y: 19, facing: "east" },
    ],
    // Cartel "MW" sobre el techo del shopping, frente a la explanada.
    logoSign: { landmarkId: "shopping-tres-cruces" },
    shops: [
        {
            id: "moda-tres-cruces",
            name: "Moda Tres Cruces",
            description: "Locales de ropa del shopping: compran y venden prendas.",
            area: { x: 17, y: 3, width: 6, height: 6 },
            building: "none",
            buys: ["clothing"],
            stock: items_1.CLOTHING.map((item) => item.id),
        },
        {
            id: "kiosco-parque",
            name: "Kiosco del Parque",
            description: "Frente al Estadio Centenario: vende carritos para vender en la explanada y compra los usados.",
            area: { x: 52, y: 21, width: 2, height: 2 },
            building: "kiosk",
            stock: items_1.CARTS.map((item) => item.id),
            buys: ["cart"],
        },
    ],
    // El anillo de plaza alrededor del Estadio Centenario: con un carrito se le vende a los hinchas.
    vending: { name: "Explanada del Centenario", areas: [{ x: 38, y: 20, width: 14, height: 14 }] },
    placeLabels: [
        { name: "Bulevar Artigas", x: 14.5, y: 38 },
        { name: "Avenida Italia", x: 41, y: 14.5 },
        { name: "Av. 18 de Julio", x: 4, y: 24.5 },
        { name: "Explanada Tres Cruces", x: 20.5, y: 11.6 },
        { name: "Parque Batlle", x: 38, y: 40 },
        { name: "Explanada del Centenario", x: 45, y: 33 },
    ],
};
//# sourceMappingURL=tresCruces.js.map