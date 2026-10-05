"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CASINO = void 0;
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * El casino por dentro: un salón de baldosas con las paredes al norte y al oeste (las de adelante no
 * se dibujan, para ver la sala), la puerta de salida en la pared oeste, las tragamonedas contra la
 * pared norte y las mesas de ruleta y de blackjack en el medio.
 */
const builder = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, info_1.HEIGHT, types_1.TileChar.Floor)
    .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.InnerWall)
    .column(0, 0, info_1.HEIGHT - 1, types_1.TileChar.InnerWall);
/** La salida: lleva a la vereda de Cerrito, frente al casino en Ciudad Vieja. */
const exit = {
    id: "salida",
    name: "Salir a Ciudad Vieja",
    area: { x: 0, y: 8, width: 1, height: 1 },
    to: { cityId: "ciudad-vieja", at: { x: 110, y: 23 } },
};
exports.CASINO = {
    ...info_1.CASINO_INFO,
    layout: builder.build(),
    spawnArea: { x: 1, y: 7, width: 3, height: 3 },
    benches: [],
    busStops: [],
    doors: [exit],
    placeLabels: [],
};
//# sourceMappingURL=map.js.map