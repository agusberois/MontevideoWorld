"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMCAR = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * COMCAR (cárcel de Santiago Vázquez), versión libre. Adentro del muro (con garitas en las
 * esquinas): tres pabellones al norte, la cancha y el patio al sur, donde aparecen los presos
 * (`/ban`). El muro sur es una reja larga: del otro lado, la explanada de visitas con la parada del
 * ómnibus. Los que llegan en bondi son visitas (aparecen afuera y se van cuando quieren) y ven a los
 * presos a través de la reja; los de adentro no salen hasta cumplir.
 */
const HEIGHT = 48;
const builder = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, HEIGHT, types_1.TileChar.Grass);
// Campo con árboles alrededor (antes de todo lo demás, que pisa los que caen adentro).
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.2, 21);
// Penal: piso de hormigón y muro perimetral.
builder
    .rect({ x: 0, y: 0, width: info_1.WIDTH, height: info_1.SOUTH_WALL_Y + 1 }, types_1.TileChar.Plaza)
    .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.Wall)
    .row(info_1.SOUTH_WALL_Y, 0, info_1.WIDTH - 1, types_1.TileChar.Wall)
    .column(0, 0, info_1.SOUTH_WALL_Y, types_1.TileChar.Wall)
    .column(info_1.WIDTH - 1, 0, info_1.SOUTH_WALL_Y, types_1.TileChar.Wall)
    // La reja: de acá se ve el patio desde la explanada de visitas.
    .row(info_1.SOUTH_WALL_Y, 5, info_1.WIDTH - 6, types_1.TileChar.Fence);
// Adentro: camino frente a los pabellones, la cancha y el patio (pegado a la reja).
const yard = { x: 4, y: 25, width: 36, height: 8 };
builder.row(10, 1, info_1.WIDTH - 2, types_1.TileChar.Street).rect({ x: 7, y: 12, width: 30, height: 11 }, types_1.TileChar.Grass);
// Afuera: explanada de visitas frente a la reja y la ruta con la parada.
const visitors = { x: 3, y: info_1.SOUTH_WALL_Y + 1, width: info_1.WIDTH - 6, height: 8 };
builder.rect(visitors, types_1.TileChar.Plaza).row(HEIGHT - 4, 0, info_1.WIDTH - 1, types_1.TileChar.Street).row(HEIGHT - 3, 0, info_1.WIDTH - 1, types_1.TileChar.Street);
const benches = [
    // Patio, a los costados.
    { x: 2, y: 27, facing: "east" },
    { x: 2, y: 30, facing: "east" },
    { x: 41, y: 27, facing: "east" },
    { x: 41, y: 30, facing: "east" },
    // Mirando la cancha.
    ...[9, 15, 21, 27, 33].map((x) => ({ x, y: 24, facing: "south" })),
    // Explanada de visitas, mirando a la ruta.
    ...[6, 12, 30, 36].map((x) => ({ x, y: 42, facing: "south" })),
];
const busStops = [{ name: "COMCAR", x: 22, y: 43, facing: "south" }];
// Bancos y parada sobre piso (la siembra de árboles no los toca, pero por las dudas).
for (const { x, y } of [...benches, ...busStops])
    builder.set(x, y, types_1.TileChar.Plaza);
exports.COMCAR = {
    ...info_1.COMCAR_INFO,
    layout: builder.build(),
    // Las visitas (llegan en ómnibus) aparecen afuera, frente a la reja.
    spawnArea: { x: 8, y: info_1.SOUTH_WALL_Y + 2, width: 28, height: 4 },
    prison: { yard },
    benches,
    busStops,
    placeLabels: [
        { name: "Patio", x: 22, y: 29 },
        { name: "Cancha", x: 22, y: 17.5 },
        { name: "Visitas", x: 22, y: 39.5 },
    ],
};
//# sourceMappingURL=map.js.map