"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENDING_GIFTS = exports.MATCH_MODES = exports.MATCH_GIFT_MULTIPLIER = exports.MATCH_WAIT_FACTOR = exports.MATCH_SALE_MULTIPLIER = exports.CUSTOMER_LEAD_MS = exports.CustomerState = exports.MATCHES = void 0;
exports.matchAt = matchAt;
exports.getMatch = getMatch;
exports.giftChance = giftChance;
exports.saleRange = saleRange;
exports.saleValue = saleValue;
exports.cartPerks = cartPerks;
const fishing_1 = require("./fishing");
const money_1 = require("./money");
/** Los partidos de cada día del juego (con `DAY_LENGTH_MINUTES` = 24, cada uno dura 2 minutos reales). */
exports.MATCHES = [
    { name: "Nacional – Peñarol", start: 15 * 60, end: 17 * 60 },
    { name: "Uruguay – Argentina", start: 21 * 60, end: 23 * 60 },
];
/**
 * El hincha que se acerca al carrito mientras se espera la venta (`Player.customer`, lo ven todos):
 * sale a caminar `CUSTOMER_LEAD_MS` antes del resultado y, al saberse, compra o sigue de largo.
 * Cancelar la venta (moverse, etc.) lo vuelve a `None` y se va sin decir nada.
 */
exports.CustomerState = { None: 0, Arriving: 1, Bought: 2, Passed: 3 };
exports.CUSTOMER_LEAD_MS = 2200;
/** Con partido, cada venta paga esto más… */
exports.MATCH_SALE_MULTIPLIER = 2;
/** …los hinchas llegan antes (multiplica la espera)… */
exports.MATCH_WAIT_FACTOR = 0.6;
/** …y regalan ropa más seguido. */
exports.MATCH_GIFT_MULTIPLIER = 2;
/** El partido que se está jugando a esta hora del juego, si hay. */
function matchAt(minuteOfDay) {
    return exports.MATCHES.find((match) => minuteOfDay >= match.start && minuteOfDay < match.end);
}
/**
 * Partido forzado por el admin (`GameState.matchMode`): "auto" sigue el horario de `MATCHES`, "on"
 * juega el partido elegido hasta que se vuelva a "auto" y "off" no deja que haya ninguno.
 */
exports.MATCH_MODES = ["auto", "on", "off"];
function getMatch(name) {
    return exports.MATCHES.find((match) => match.name === name);
}
/**
 * Lo que puede regalar un hincha contento (además de comprar): ropa de cancha. Es la única forma
 * de conseguir prendas sin comprarlas.
 */
exports.VENDING_GIFTS = [
    { itemId: "camiseta-celeste", weight: 40 },
    { itemId: "gorra-azul", weight: 20 },
    { itemId: "short-azul", weight: 15 },
    { itemId: "buzo-gris", weight: 10 },
    { itemId: "championes-blancos", weight: 10 },
    { itemId: "botas-marrones", weight: 5 },
];
/** Probabilidad (0–1) de que un hincha regale una prenda en un intento, con o sin partido. */
function giftChance(cart, match) {
    return Math.min(1, cart.giftChance * (match ? exports.MATCH_GIFT_MULTIPLIER : 1));
}
/** Lo que paga un hincha por unidad con este carrito: [mínimo, máximo]. */
function saleRange(cart, match) {
    const multiplier = match ? exports.MATCH_SALE_MULTIPLIER : 1;
    return [cart.saleMin * multiplier, cart.saleMax * multiplier];
}
/**
 * Plata que deja en promedio un intento de venta con este carrito (contando que nadie compre). Sin
 * partido y sin contar los regalos: es el piso.
 */
function saleValue(cart) {
    const [min, max] = saleRange(cart, false);
    return (1 - cart.noSaleChance) * ((min + max) / 2);
}
/** Las ventajas de un carrito en frases cortas, para la tienda, la mochila y el botón de vender. */
function cartPerks(cart) {
    const [min, max] = saleRange(cart, false);
    const [matchMin, matchMax] = saleRange(cart, true);
    const perks = [
        `Venta: ${(0, money_1.formatMoney)(min)}–${(0, money_1.formatMoney)(max)} (con partido ${(0, money_1.formatMoney)(matchMin)}–${(0, money_1.formatMoney)(matchMax)})`,
        `Que nadie compre: ${(0, fishing_1.formatPercent)(cart.noSaleChance)}`,
        `Regalo de un hincha: ${(0, fishing_1.formatPercent)(giftChance(cart, false))}`,
    ];
    if (cart.waitFactor < 1)
        perks.push(`Clientes ${Math.round((1 - cart.waitFactor) * 100)} % más rápido`);
    perks.push(`Dura ${cart.maxUses} intentos y rinde ~${(0, money_1.formatMoney)(Math.floor(saleValue(cart) * cart.maxUses))} en total (sin partidos)`);
    return perks;
}
//# sourceMappingURL=vending.js.map