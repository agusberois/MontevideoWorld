"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CASINO_INFO = exports.BAR_COUNTER_Y = exports.BAR_BACK_Y = exports.BAR_SHELF_Y = exports.BAR = exports.HEIGHT = exports.WIDTH = void 0;
const items_1 = require("../../items");
/**
 * Casino Victoria Plaza por dentro: se entra por la puerta del edificio de Ciudad Vieja (cualquiera,
 * sin boleto). Tragamonedas contra la pared norte, dos mesas de ruleta y dos de blackjack, y la
 * barra de tragos y comida en la esquina noreste, con el barman atendiendo (`npcs` en `map.ts`).
 */
exports.WIDTH = 28;
exports.HEIGHT = 20;
/** Las tragamonedas, en fila contra la pared norte (x de cada una). */
const SLOTS = [2, 4, 6, 8, 10, 12, 14, 16];
const ROULETTES = [
    { x: 5, y: 7, width: 3, height: 3 },
    { x: 5, y: 13, width: 3, height: 3 },
];
const BLACKJACKS = [
    { x: 12, y: 7, width: 3, height: 3 },
    { x: 12, y: 13, width: 3, height: 3 },
];
/** La barra: el estante con las botellas contra la pared, el pasillo del barman y el mostrador. */
exports.BAR = { x: 18, width: 8 };
/** Fila del estante (pegado a la pared norte), del barman y del mostrador. */
exports.BAR_SHELF_Y = 1;
exports.BAR_BACK_Y = 2;
exports.BAR_COUNTER_Y = 3;
exports.CASINO_INFO = {
    id: "casino",
    name: "Casino Victoria Plaza",
    access: "door",
    indoor: true,
    description: "El casino Victoria Plaza: tragamonedas, ruleta, blackjack y la barra de tragos.",
    landmarks: [
        ...SLOTS.map((x, i) => ({ id: `tragamonedas-${i + 1}`, name: "Tragamonedas", description: "Máquina tragamonedas.", kind: "slotMachine", area: { x, y: 2, width: 1, height: 1 } })),
        ...ROULETTES.map((area, i) => ({ id: `ruleta-${i + 1}`, name: "Ruleta", description: "Mesa de ruleta europea.", kind: "rouletteTable", area })),
        ...BLACKJACKS.map((area, i) => ({ id: `blackjack-${i + 1}`, name: "Blackjack", description: "Mesa de blackjack.", kind: "blackjackTable", area })),
        {
            id: "barra-estante",
            name: "Barra",
            description: "El estante de la barra: botellas de whisky, grappamiel y medio y medio, con el espejo atrás.",
            kind: "barShelf",
            area: { x: exports.BAR.x, y: exports.BAR_SHELF_Y, width: exports.BAR.width, height: 1 },
        },
        {
            // El mostrador y, detrás, el pasillo del barman (no se camina).
            id: "barra",
            name: "Barra",
            description: "La barra del casino: tragos y algo para comer entre jugada y jugada.",
            kind: "barCounter",
            area: { x: exports.BAR.x, y: exports.BAR_BACK_Y, width: exports.BAR.width, height: exports.BAR_COUNTER_Y - exports.BAR_BACK_Y + 1 },
        },
        ...[
            [26, 5],
            [26, 18],
            [17, 18],
            [1, 18],
        ].map(([x, y], i) => ({ id: `planta-${i + 1}`, name: "Planta", description: "Una palmera en maceta.", kind: "pottedPalm", area: { x, y, width: 1, height: 1 } })),
    ],
    shops: [
        ...SLOTS.map((x, i) => ({
            id: `slots-${i + 1}`,
            name: "Tragamonedas",
            description: "Apostá y tirá la palanca: tres iguales pagan.",
            area: { x, y: 2, width: 1, height: 1 },
            building: "none",
            stock: [],
            buys: [],
            casino: "slots",
        })),
        ...ROULETTES.map((area, i) => ({
            id: i === 0 ? "mesa-ruleta" : `mesa-ruleta-${i + 1}`,
            name: "Ruleta",
            description: "Rojo, negro, par, impar o un número.",
            area,
            building: "none",
            stock: [],
            buys: [],
            casino: "roulette",
        })),
        ...BLACKJACKS.map((area, i) => ({
            id: i === 0 ? "mesa-blackjack" : `mesa-blackjack-${i + 1}`,
            name: "Blackjack",
            description: "Llegá a 21 sin pasarte y ganale al crupier.",
            area,
            building: "none",
            stock: [],
            buys: [],
            casino: "blackjack",
        })),
        {
            id: "barra-casino",
            name: "Barra del Victoria",
            description: "Café, cerveza, grappamiel, medio y medio y whisky; y algo para picar: alfajores, panchos y chivitos.",
            area: { x: exports.BAR.x, y: exports.BAR_COUNTER_Y, width: exports.BAR.width, height: 1 },
            building: "none",
            stock: [...items_1.DRINKS.map((drink) => drink.id), "alfajor", "pancho", "chivito"],
            buys: [],
        },
    ],
};
//# sourceMappingURL=info.js.map