"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valuePerUse = valuePerUse;
exports.lifetimeValue = lifetimeValue;
exports.unprofitableTools = unprofitableTools;
const fishing_1 = require("./fishing");
const items_1 = require("./items");
const vending_1 = require("./vending");
/**
 * Rentabilidad de las herramientas: lo que deja una caña o un carrito en promedio a lo largo de sus
 * `maxUses` tiene que superar lo que cuesta. Si no, comprarla sería perder plata.
 */
/** Plata que deja en promedio un uso (una tirada o un intento de venta). */
function valuePerUse(tool) {
    return tool.category === "rod" ? (0, fishing_1.catchValue)(tool) : (0, vending_1.saleValue)(tool);
}
/** Plata que deja en promedio en toda su vida (`maxUses` usos), sin partidos, regalos ni reventa. */
function lifetimeValue(tool) {
    return valuePerUse(tool) * tool.maxUses;
}
/** Herramientas que no se pagan solas (lo que dejan no supera su precio). Tiene que estar vacía. */
function unprofitableTools() {
    return [...items_1.RODS, ...items_1.CARTS].filter((tool) => lifetimeValue(tool) <= tool.price);
}
//# sourceMappingURL=tools.js.map