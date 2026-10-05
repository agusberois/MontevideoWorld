"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS_INFO = exports.HEIGHT = exports.WIDTH = void 0;
/**
 * Termas del Donador: el interior al que sólo entran los donadores del proyecto (y el admin), por la
 * puerta del edificio de Ciudad Vieja. Lo liviano de la sala (el mapa, `map.ts`, se descarga al
 * entrar). Inspirado en las termas del Daymán y el Arapey: baldosas, plantas, reposeras y un jacuzzi
 * termal en el medio que recupera energía y salud mucho más rápido que un banco.
 */
exports.WIDTH = 22;
exports.HEIGHT = 18;
exports.TERMAS_INFO = {
    id: "termas",
    name: "Hotel del Donador",
    access: "donor",
    indoor: true,
    description: "El spa del hotel de los que bancan el proyecto: un jacuzzi termal para recuperar energía como en el Daymán.",
    landmarks: [
        // Plantas de distintos tipos contra las paredes y alrededor del jacuzzi.
        ...[
            [1, 1, "plant"],
            [5, 1, "pottedPalm"],
            [9, 1, "flowers"],
            [13, 1, "pottedPalm"],
            [17, 1, "flowers"],
            [21, 1, "plant"],
            [1, 5, "flowers"],
            [1, 13, "pottedPalm"],
            [1, 17, "plant"],
            [21, 6, "pottedPalm"],
            [21, 11, "flowers"],
            [21, 17, "pottedPalm"],
            [6, 17, "flowers"],
            [11, 17, "plant"],
            [16, 17, "flowers"],
            [6, 4, "flowers"],
            [16, 4, "flowers"],
            [6, 12, "pottedPalm"],
            [16, 12, "pottedPalm"],
        ].map(([x, y, kind], i) => ({
            id: `planta-${i + 1}`,
            name: "Planta",
            description: "Una planta en maceta.",
            kind,
            area: { x, y, width: 1, height: 1 },
        })),
        // Faroles dorados: de noche se prenden.
        ...[
            [3, 3],
            [19, 3],
            [3, 15],
            [19, 15],
            [7, 4],
            [15, 4],
            [7, 12],
            [15, 12],
            [11, 15],
        ].map(([x, y], i) => ({
            id: `farol-${i + 1}`,
            name: "Farol",
            description: "Farol dorado del spa.",
            kind: "lamp",
            area: { x, y, width: 1, height: 1 },
        })),
    ],
    shops: [],
};
//# sourceMappingURL=info.js.map