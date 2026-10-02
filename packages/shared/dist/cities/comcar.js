"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMCAR = void 0;
const layoutBuilder_1 = require("./layoutBuilder");
const types_1 = require("./types");
/**
 * COMCAR (cárcel de Santiago Vázquez), versión libre. Adentro del muro (con garitas en las
 * esquinas): tres pabellones al norte, la cancha y el patio al sur, donde aparecen los presos
 * (`/ban`). El muro sur es una reja larga: del otro lado, la explanada de visitas con la parada del
 * ómnibus. Los que llegan en bondi son visitas (aparecen afuera y se van cuando quieren) y ven a los
 * presos a través de la reja; los de adentro no salen hasta cumplir.
 */
const WIDTH = 44;
const HEIGHT = 48;
/** Fila del muro sur del penal (con la reja en el medio). */
const SOUTH_WALL_Y = 34;
const builder = new layoutBuilder_1.LayoutBuilder(WIDTH, HEIGHT, types_1.TileChar.Grass);
// Campo con árboles alrededor (antes de todo lo demás, que pisa los que caen adentro).
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.2, 21);
// Penal: piso de hormigón y muro perimetral.
builder
    .rect({ x: 0, y: 0, width: WIDTH, height: SOUTH_WALL_Y + 1 }, types_1.TileChar.Plaza)
    .row(0, 0, WIDTH - 1, types_1.TileChar.Wall)
    .row(SOUTH_WALL_Y, 0, WIDTH - 1, types_1.TileChar.Wall)
    .column(0, 0, SOUTH_WALL_Y, types_1.TileChar.Wall)
    .column(WIDTH - 1, 0, SOUTH_WALL_Y, types_1.TileChar.Wall)
    // La reja: de acá se ve el patio desde la explanada de visitas.
    .row(SOUTH_WALL_Y, 5, WIDTH - 6, types_1.TileChar.Fence);
// Adentro: camino frente a los pabellones, la cancha y el patio (pegado a la reja).
const yard = { x: 4, y: 25, width: 36, height: 8 };
builder.row(10, 1, WIDTH - 2, types_1.TileChar.Street).rect({ x: 7, y: 12, width: 30, height: 11 }, types_1.TileChar.Grass);
// Afuera: explanada de visitas frente a la reja y la ruta con la parada.
const visitors = { x: 3, y: SOUTH_WALL_Y + 1, width: WIDTH - 6, height: 8 };
builder.rect(visitors, types_1.TileChar.Plaza).row(HEIGHT - 4, 0, WIDTH - 1, types_1.TileChar.Street).row(HEIGHT - 3, 0, WIDTH - 1, types_1.TileChar.Street);
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
    id: "comcar",
    name: "COMCAR",
    description: "El penal de Santiago Vázquez: vení de visita en bondi a ver a los que se portaron mal.",
    layout: builder.build(),
    // Las visitas (llegan en ómnibus) aparecen afuera, frente a la reja.
    spawnArea: { x: 8, y: SOUTH_WALL_Y + 2, width: 28, height: 4 },
    prison: { yard },
    landmarks: [
        ...[5, 19, 33].map((x, i) => ({
            id: `pabellon-${i + 1}`,
            name: `Pabellón ${i + 1}`,
            description: "Pabellón de celdas.",
            kind: "cellBlock",
            area: { x, y: 3, width: 6, height: 6 },
        })),
        ...[
            [1, 1],
            [WIDTH - 3, 1],
            [1, SOUTH_WALL_Y - 2],
            [WIDTH - 3, SOUTH_WALL_Y - 2],
        ].map(([x, y], i) => ({
            id: `garita-${i + 1}`,
            name: "Garita",
            description: "Garita de vigilancia.",
            kind: "watchtower",
            area: { x, y, width: 2, height: 2 },
        })),
    ],
    benches,
    busStops,
    shops: [],
    placeLabels: [
        { name: "Patio", x: 22, y: 29 },
        { name: "Cancha", x: 22, y: 17.5 },
        { name: "Visitas", x: 22, y: 39.5 },
    ],
};
//# sourceMappingURL=comcar.js.map