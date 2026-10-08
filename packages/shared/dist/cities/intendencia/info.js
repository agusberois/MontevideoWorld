"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTENDENCIA_INFO = exports.DESKS = exports.DESK_Y = exports.HEIGHT = exports.WIDTH = void 0;
/**
 * La Intendencia por dentro: el hall de Atención al público, al que se entra por la puerta del
 * edificio del Centro (cualquiera, sin boleto). Contra la pared norte, una fila de escritorios
 * (`DESKS`), cada uno con su empleado detrás (`npcs` en `map.ts`); en el primero atiende la
 * funcionaria de la bienvenida, que recibe el sobre. En el medio, bancos para esperar el turno.
 */
exports.WIDTH = 22;
exports.HEIGHT = 14;
/**
 * Los escritorios (2 × 2): la fila de atrás es la del empleado (no se camina) y la de adelante, la
 * mesa. Se le habla desde el tile de adelante de la mesa (`Npc.counter`).
 */
exports.DESK_Y = 2;
exports.DESKS = [3, 7, 11, 15];
exports.INTENDENCIA_INFO = {
    id: "intendencia",
    name: "Intendencia",
    access: "door",
    indoor: true,
    description: "El hall de Atención al público de la Intendencia de Montevideo: escritorios, funcionarios y trámites.",
    landmarks: [
        ...exports.DESKS.map((x, i) => ({
            id: `escritorio-${i + 1}`,
            name: `Escritorio ${i + 1}`,
            description: "Escritorio de atención al público, con la computadora y una pila de expedientes.",
            kind: "officeDesk",
            area: { x, y: exports.DESK_Y, width: 2, height: 2 },
        })),
        ...[
            [20, 1],
            [1, 12],
            [20, 12],
            [1, 1],
        ].map(([x, y], i) => ({ id: `planta-${i + 1}`, name: "Planta", description: "Una palmera en maceta.", kind: "pottedPalm", area: { x, y, width: 1, height: 1 } })),
    ],
    shops: [],
};
//# sourceMappingURL=info.js.map