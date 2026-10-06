"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS = exports.STAIRS_ARRIVAL = exports.STAIRS_AREA = void 0;
exports.spaFloor = spaFloor;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * El spa del Hotel del Donador por dentro, en dos pisos iguales (este y `termasPiso2`): un salón grande
 * de baldosas con las paredes al norte y al oeste (las de adelante no se dibujan, para ver la sala),
 * dos jacuzzis grandes en el medio (7 × 7, con lugar para veinte cada uno: cuarenta por piso),
 * reposeras alrededor, plantas de varios tipos y faroles dorados que se prenden de noche. En la pared
 * oeste, la salida a Ciudad Vieja (sólo en este piso) y la escalera entre los pisos. Se entra y se sale
 * por `doors` (sin boleto); el server deja entrar sólo a donadores y al admin (`access`).
 */
/**
 * La escalera entre los pisos: 2 × 2 en la esquina noroeste, contra la pared norte, en el mismo lugar
 * en los dos (abajo sube, arriba es el hueco que baja; `Door.stairs`). Se sube o se baja desde el sur.
 */
exports.STAIRS_AREA = { x: 1, y: 1, width: 2, height: 2 };
/** Al subir o bajar se aparece al pie de la escalera. */
exports.STAIRS_ARRIVAL = { x: 2, y: 3 };
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
/** Lo de un piso del spa (layout, jacuzzis, reposeras): `doors` y `spawnArea` cambian de piso a piso. */
function spaFloor(info, doors, spawnArea) {
    const jacuzzis = [jacuzziAt("jacuzzi-1", 4, 5), jacuzziAt("jacuzzi-2", 13, 5)];
    const layout = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, info_1.HEIGHT, types_1.TileChar.Floor)
        .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.InnerWall)
        .column(0, 0, info_1.HEIGHT - 1, types_1.TileChar.InnerWall)
        .build();
    return {
        ...info,
        layout,
        spawnArea,
        benches: BENCHES,
        busStops: [],
        doors,
        jacuzzis,
        placeLabels: jacuzzis.map(({ area }) => ({ name: "Jacuzzi termal", x: area.x + 3, y: area.y + 7.5 })),
    };
}
const BENCHES = [
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
/** Planta baja: la salida a Ciudad Vieja y la escalera para subir al piso 2. */
exports.TERMAS = spaFloor(info_1.TERMAS_INFO, [
    exit,
    { id: "escalera", name: "Subir al piso 2", area: exports.STAIRS_AREA, to: { cityId: "termas-2", at: exports.STAIRS_ARRIVAL }, access: "donor", stairs: "up" },
], 
// Se aparece al entrar frente a la puerta.
{ x: 1, y: 8, width: 3, height: 3 });
//# sourceMappingURL=map.js.map