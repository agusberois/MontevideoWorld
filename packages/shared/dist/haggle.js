"use strict";
/**
 * Regatear al vender en una tienda: pedís más que el precio normal (`sellPrice`) y es todo o nada.
 * Si la tienda acepta cobrás tu precio; si no, el ítem se pierde igual y no cobrás nada. Cliente y
 * server usan la misma fórmula: la probabilidad que se muestra es la que se sortea.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAGGLE_MAX_RATIO = void 0;
exports.maxHagglePrice = maxHagglePrice;
exports.isValidHagglePrice = isValidHagglePrice;
exports.haggleChance = haggleChance;
/** Lo más que se puede pedir: 5 veces el precio normal. */
exports.HAGGLE_MAX_RATIO = 5;
/**
 * Qué tan rápido cae la probabilidad al pedir más. Con 1 sería "justo" (en promedio da lo mismo que
 * vender normal); con más de 1 la tienda tiene una pequeña ventaja, así regatear es una apuesta
 * divertida y no una forma de farmear plata.
 */
const HAGGLE_STEEPNESS = 1.2;
/** El precio más alto que se puede pedir por algo que normalmente pagan `base`. */
function maxHagglePrice(base) {
    return Math.floor(base * exports.HAGGLE_MAX_RATIO);
}
/** ¿Se puede regatear este precio? (entero, más que el normal y no más que el tope) */
function isValidHagglePrice(base, price) {
    return Number.isSafeInteger(price) && price > base && price <= maxHagglePrice(base);
}
/** Probabilidad (0–1) de que la tienda acepte `price` por algo que normalmente paga `base`. */
function haggleChance(base, price) {
    if (price <= base)
        return 1;
    return Math.pow(base / price, HAGGLE_STEEPNESS);
}
//# sourceMappingURL=haggle.js.map