"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollSale = rollSale;
const shared_1 = require("@montevideo-world/shared");
/**
 * Sortea una venta con este carrito: nadie compra (`cart.noSaleChance`) o un hincha paga entre
 * `saleRange` (el doble con partido) y, con `giftChance`, además regala una prenda de `VENDING_GIFTS`.
 * Con partido los hinchas llegan antes (`MATCH_WAIT_FACTOR`); los mejores carritos, también.
 */
function rollSale(cart, match, random = Math.random) {
    const durationMs = Math.round((5000 + random() * 3000) * cart.waitFactor * (match ? shared_1.MATCH_WAIT_FACTOR : 1));
    if (random() < cart.noSaleChance)
        return { earned: 0, durationMs };
    const [min, max] = (0, shared_1.saleRange)(cart, match);
    const earned = min + Math.floor(random() * (max - min + 1));
    const giftId = random() < (0, shared_1.giftChance)(cart, match) ? pickGift(random) : undefined;
    return { earned, giftId, durationMs };
}
function pickGift(random) {
    const total = shared_1.VENDING_GIFTS.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = random() * total;
    for (const entry of shared_1.VENDING_GIFTS) {
        roll -= entry.weight;
        if (roll < 0)
            return entry.itemId;
    }
    return shared_1.VENDING_GIFTS[shared_1.VENDING_GIFTS.length - 1].itemId;
}
//# sourceMappingURL=vending.js.map