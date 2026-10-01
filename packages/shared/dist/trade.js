"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_TRADE_OFFER = exports.TRADE_MAX_ITEMS = exports.TRADE_INVITE_MS = void 0;
exports.normalizeTradeOffer = normalizeTradeOffer;
exports.isTradeMoney = isTradeMoney;
exports.offeredQuantity = offeredQuantity;
exports.changeOfferQuantity = changeOfferQuantity;
const items_1 = require("./items");
const money_1 = require("./money");
/**
 * Intercambio entre jugadores: cada uno arma una oferta (ítems de su mochila + plata) y el
 * intercambio se hace recién cuando los dos aceptan. Cambiar una oferta anula ambas aceptaciones.
 */
/** Cuánto dura una invitación a intercambiar sin respuesta. */
exports.TRADE_INVITE_MS = 30_000;
/** Máximo de ítems distintos por oferta. */
exports.TRADE_MAX_ITEMS = 9;
exports.EMPTY_TRADE_OFFER = { items: [], money: 0 };
/**
 * Valida y normaliza una oferta que llega por red: ítems existentes, cantidades enteras positivas,
 * sin `itemId` repetidos (se suman) y plata entera dentro del tope. Devuelve null si no es válida.
 * No mira la mochila: eso lo chequea el server con el inventario real.
 */
function normalizeTradeOffer(value) {
    if (typeof value !== "object" || value === null)
        return null;
    const { items, money } = value;
    if (!Array.isArray(items) || !isTradeMoney(money))
        return null;
    const totals = new Map();
    for (const entry of items) {
        if (typeof entry !== "object" || entry === null)
            return null;
        const { itemId, quantity } = entry;
        if (typeof itemId !== "string" || !(0, items_1.getItem)(itemId))
            return null;
        if (!Number.isSafeInteger(quantity) || quantity <= 0)
            return null;
        totals.set(itemId, (totals.get(itemId) ?? 0) + quantity);
    }
    if (totals.size > exports.TRADE_MAX_ITEMS)
        return null;
    return { items: [...totals].map(([itemId, quantity]) => ({ itemId, quantity })), money };
}
/** Plata de una oferta: entero entre 0 y el tope. */
function isTradeMoney(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= money_1.MAX_MONEY;
}
/** Cantidad ofrecida de `itemId` (0 si no está en la oferta). */
function offeredQuantity(offer, itemId) {
    return offer.items.find((stack) => stack.itemId === itemId)?.quantity ?? 0;
}
/** Copia de la oferta con `delta` unidades más (o menos) de `itemId`; las que quedan en 0 se van. */
function changeOfferQuantity(offer, itemId, delta) {
    const quantity = offeredQuantity(offer, itemId) + delta;
    const others = offer.items.filter((stack) => stack.itemId !== itemId);
    if (quantity <= 0)
        return { ...offer, items: others };
    const index = offer.items.findIndex((stack) => stack.itemId === itemId);
    const items = [...others];
    items.splice(index === -1 ? items.length : index, 0, { itemId, quantity });
    return { ...offer, items };
}
//# sourceMappingURL=trade.js.map