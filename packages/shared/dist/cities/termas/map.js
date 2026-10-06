"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * El spa del Hotel del Donador por dentro: un salón grande de baldosas con las paredes al norte y al
 * oeste (las de adelante no se dibujan, para ver la sala), la puerta de salida en la pared oeste, el
 * dos jacuzzis grandes en el medio (7 × 7, con lugar para veinte cada uno), reposeras alrededor, plantas de varios
 * tipos y faroles dorados que se prenden de noche. Se entra y se sale por `doors` (sin boleto); el
 * server deja entrar sólo a donadores y al admin (`access`).
 */
const builder = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, info_1.HEIGHT, types_1.TileChar.Floor)
    .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.InnerWall)
    .column(0, 0, info_1.HEIGHT - 1, types_1.TileChar.InnerWall);
/** La puerta doble de salida (dos tiles de la pared oeste): lleva a la vereda frente al hotel en Ciudad Vieja. */
const exit = {
    id: "salida",
    name: "Salir a Ciudad Vieja",
    area: { x: 0, y: 9, width: 1, height: 2 },
    to: { cityId: "ciudad-vieja", at: { x: 126, y: 47 } },
};
/** Los dos jacuzzis (7 × 7), uno al lado del otro: en cada uno se meten veinte (`JACUZZI_CAPACITY`), cinco por lado (en el borde de adentro, sin las esquinas). */
const JACUZZI_SIZE = 7;
function jacuzziAt(id, x, y) {
    const seats = [];
    for (let i = 1; i < JACUZZI_SIZE - 1; i++) {
        seats.push({ x: x + i, y }, { x: x + i, y: y + JACUZZI_SIZE - 1 }, { x, y: y + i }, { x: x + JACUZZI_SIZE - 1, y: y + i });
    }
    return { id, area: { x, y, width: JACUZZI_SIZE, height: JACUZZI_SIZE }, seats };
}
const jacuzzis = [jacuzziAt("jacuzzi-1", 4, 5), jacuzziAt("jacuzzi-2", 13, 5)];
const benches = [
    // Contra la pared norte, para mirar el salón.
    ...(0, types_1.doubleBench)(3, 2, "south"),
    { x: 7, y: 2, facing: "south" },
    { x: 15, y: 2, facing: "south" },
    ...(0, types_1.doubleBench)(18, 2, "south"),
    // Reposeras frente a los jacuzzis, del lado sur.
    ...(0, types_1.doubleBench)(5, 14, "south"),
    ...(0, types_1.doubleBench)(8, 14, "south"),
    ...(0, types_1.doubleBench)(14, 14, "south"),
    ...(0, types_1.doubleBench)(17, 14, "south"),
];
exports.TERMAS = {
    ...info_1.TERMAS_INFO,
    layout: builder.build(),
    // Se aparece al entrar frente a la puerta.
    spawnArea: { x: 1, y: 8, width: 3, height: 3 },
    benches,
    busStops: [],
    doors: [exit],
    jacuzzis,
    placeLabels: jacuzzis.map(({ area }) => ({ name: "Jacuzzi termal", x: area.x + 3, y: area.y + 7.5 })),
};
//# sourceMappingURL=map.js.map