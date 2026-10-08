"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFESSION_KIT = void 0;
const items_1 = require("./items");
/** Lo más barato de una lista (la herramienta de nivel 1). */
function cheapest(items) {
    return items.reduce((best, item) => (item.price < best.price ? item : best));
}
/**
 * Lo que te da cada profesión al elegirla en la carta de bienvenida (o al tocarte cuidacoches): la
 * herramienta más barata de su trabajo, o el chaleco flúo. Va a la mochila (`systems/welcome.ts`).
 * Aparte de `welcome.ts` porque mira el catálogo (`items.ts` ya importa de `welcome.ts`).
 */
exports.PROFESSION_KIT = {
    pescador: cheapest(items_1.RODS).id,
    vendedor: cheapest(items_1.CARTS).id,
    musico: cheapest(items_1.INSTRUMENTS).id,
    cuidacoches: items_1.SAFETY_VEST_ID,
};
//# sourceMappingURL=professionKit.js.map