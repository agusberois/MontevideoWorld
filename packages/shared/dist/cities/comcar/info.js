"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMCAR_INFO = exports.SOUTH_WALL_Y = exports.WIDTH = void 0;
/**
 * COMCAR: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */
exports.WIDTH = 44;
/** Fila del muro sur del penal (con la reja en el medio). */
exports.SOUTH_WALL_Y = 34;
exports.COMCAR_INFO = {
    id: "comcar",
    name: "COMCAR",
    prison: true,
    description: "El penal de Santiago Vázquez: vení de visita en bondi a ver a los que se portaron mal.",
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
            [exports.WIDTH - 3, 1],
            [1, exports.SOUTH_WALL_Y - 2],
            [exports.WIDTH - 3, exports.SOUTH_WALL_Y - 2],
        ].map(([x, y], i) => ({
            id: `garita-${i + 1}`,
            name: "Garita",
            description: "Garita de vigilancia.",
            kind: "watchtower",
            area: { x, y, width: 2, height: 2 },
        })),
    ],
    shops: [],
};
//# sourceMappingURL=info.js.map