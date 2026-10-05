"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valuePerUse = valuePerUse;
exports.lifetimeValue = lifetimeValue;
exports.unprofitableTools = unprofitableTools;
const busking_1 = require("./busking");
const fishing_1 = require("./fishing");
const items_1 = require("./items");
const vending_1 = require("./vending");
/**
 * Rentabilidad de las herramientas: lo que deja una caña, un carrito o un instrumento en promedio a lo largo de sus
 * `maxUses` tiene que superar lo que cuesta. Si no, comprarla sería perder plata.
 */
/** Plata que deja en promedio un uso (una tirada, un intento de venta o un tema). */
function valuePerUse(tool) {
    if (tool.category === "rod")
        return (0, fishing_1.catchValue)(tool);
    return tool.category === "cart" ? (0, vending_1.saleValue)(tool) : (0, busking_1.tipValue)(tool);
}
/** Plata que deja en promedio en toda su vida (`maxUses` usos), sin partidos, regalos, público ni reventa. */
function lifetimeValue(tool) {
    return valuePerUse(tool) * tool.maxUses;
}
/** Herramientas que no se pagan solas (lo que dejan no supera su precio). Tiene que estar vacía. */
function unprofitableTools() {
    return [...items_1.RODS, ...items_1.CARTS, ...items_1.INSTRUMENTS].filter((tool) => lifetimeValue(tool) <= tool.price);
}
//# sourceMappingURL=tools.js.map