"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * El spa del Hotel del Donador por dentro: un salón grande de baldosas con las paredes al norte y al
 * oeste (las de adelante no se dibujan, para ver la sala), la puerta de salida en la pared oeste, el
 * jacuzzi grande en el medio (5 × 5, con lugar para doce), reposeras alrededor, plantas de varios
 * tipos y faroles dorados que se prenden de noche. Se entra y se sale por `doors` (sin boleto); el
 * server deja entrar sólo a donadores y al admin (`access`).
 */
const builder = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, info_1.HEIGHT, types_1.TileChar.Floor)
    .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.InnerWall)
    .column(0, 0, info_1.HEIGHT - 1, types_1.TileChar.InnerWall);
/** La puerta de salida, en la pared oeste: lleva a la vereda frente al hotel en Ciudad Vieja. */
const exit = {
    id: "salida",
    name: "Salir a Ciudad Vieja",
    area: { x: 0, y: 9, width: 1, height: 1 },
    to: { cityId: "ciudad-vieja", at: { x: 126, y: 47 } },
};
/** El jacuzzi (5 × 5): se meten doce, tres por lado (en el borde de adentro, sin las esquinas). */
const JACUZZI = { x: 9, y: 6, size: 5 };
const seats = [];
for (let i = 1; i < JACUZZI.size - 1; i++) {
    seats.push({ x: JACUZZI.x + i, y: JACUZZI.y }, { x: JACUZZI.x + i, y: JACUZZI.y + JACUZZI.size - 1 }, { x: JACUZZI.x, y: JACUZZI.y + i }, { x: JACUZZI.x + JACUZZI.size - 1, y: JACUZZI.y + i });
}
const jacuzzi = {
    id: "jacuzzi",
    area: { x: JACUZZI.x, y: JACUZZI.y, width: JACUZZI.size, height: JACUZZI.size },
    seats,
};
/** Reposeras a los cuatro costados del jacuzzi, a un tile del borde. */
const benches = [
    ...(0, types_1.doubleBench)(10, 4, "south"),
    ...(0, types_1.doubleBench)(10, 12, "south"),
    ...[7, 9].map((y) => ({ x: 7, y: y + 1, facing: "east" })),
    ...[7, 9].map((y) => ({ x: 15, y: y + 1, facing: "east" })),
    // Contra la pared norte, para mirar el salón.
    ...(0, types_1.doubleBench)(3, 2, "south"),
    { x: 7, y: 2, facing: "south" },
    { x: 15, y: 2, facing: "south" },
    ...(0, types_1.doubleBench)(18, 2, "south"),
];
exports.TERMAS = {
    ...info_1.TERMAS_INFO,
    layout: builder.build(),
    // Se aparece al entrar frente a la puerta.
    spawnArea: { x: 1, y: 8, width: 3, height: 3 },
    benches,
    busStops: [],
    doors: [exit],
    jacuzzis: [jacuzzi],
    placeLabels: [{ name: "Jacuzzi termal", x: 11, y: 11.5 }],
};
//# sourceMappingURL=map.js.map