"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSK_MAX_PARTNER_BONUS = exports.BUSK_PARTNER_BONUS = exports.BUSK_MAX_LISTENER_BONUS = exports.BUSK_LISTENER_BONUS = exports.BUSK_LISTEN_RADIUS = exports.CROWD_ARRIVE_MS = exports.CrowdState = void 0;
exports.buskMultiplier = buskMultiplier;
exports.tipValue = tipValue;
exports.instrumentPerks = instrumentPerks;
const fishing_1 = require("./fishing");
const money_1 = require("./money");
/**
 * Tocar en la calle (el Centro: 18 de Julio y sus plazas): reglas que comparten el server (que
 * sortea y paga) y el cliente (que las muestra en la tienda, la mochila y el panel de tocar).
 *
 * Funciona como la venta en el Centenario: se toca un tema, se espera y alguien deja (o no) una
 * propina. Lo propio de la calle es el **público**: cada jugador que esté cerca escuchando (sin
 * tocar) suma propina, y los que tocan cerca a la vez arman una **comparsa** y ganan todos un poco más.
 */
/**
 * El público de mentira (NPCs que sólo ve el músico, `busk:crowd`): se arriman `CROWD_ARRIVE_MS`
 * después de empezar el tema y, al terminar, aplauden y dejan plata (`Tipped`) o se van sin dejar
 * nada (`Left`). Cortar el tema (moverse, etc.) los manda a `None`: se van sin decir nada.
 */
exports.CrowdState = { None: 0, Arriving: 1, Tipped: 2, Left: 3 };
exports.CROWD_ARRIVE_MS = 600;
/** Hasta cuántos tiles (en cualquier dirección) cuenta alguien como público o como compañero de comparsa. */
exports.BUSK_LISTEN_RADIUS = 6;
/** Cada jugador escuchando suma esto a la propina… */
exports.BUSK_LISTENER_BONUS = 0.15;
/** …hasta este tope (con 4 escuchando, el doble). */
exports.BUSK_MAX_LISTENER_BONUS = 1;
/** Cada uno que toca cerca a la vez (la comparsa) suma esto… */
exports.BUSK_PARTNER_BONUS = 0.1;
/** …hasta este tope. */
exports.BUSK_MAX_PARTNER_BONUS = 0.3;
/** Lo que multiplica la propina con `listeners` escuchando y `partners` tocando cerca. */
function buskMultiplier(listeners, partners) {
    return 1 + Math.min(exports.BUSK_MAX_LISTENER_BONUS, listeners * exports.BUSK_LISTENER_BONUS) + Math.min(exports.BUSK_MAX_PARTNER_BONUS, partners * exports.BUSK_PARTNER_BONUS);
}
/**
 * Plata que deja en promedio un tema con este instrumento, contando que nadie deje nada. Sin
 * público ni comparsa: es el piso.
 */
function tipValue(instrument) {
    return (1 - instrument.noTipChance) * ((instrument.tipMin + instrument.tipMax) / 2);
}
/** Las ventajas de un instrumento en frases cortas, para la tienda, la mochila y el panel de tocar. */
function instrumentPerks(instrument) {
    const perks = [
        `Propina: ${(0, money_1.formatMoney)(instrument.tipMin)}–${(0, money_1.formatMoney)(instrument.tipMax)} (con público, hasta el doble)`,
        `Que nadie deje nada: ${(0, fishing_1.formatPercent)(instrument.noTipChance)}`,
    ];
    if (instrument.waitFactor < 1)
        perks.push(`Propinas ${Math.round((1 - instrument.waitFactor) * 100)} % más rápido`);
    perks.push(`Dura ${instrument.maxUses} temas y rinde ~${(0, money_1.formatMoney)(Math.floor(tipValue(instrument) * instrument.maxUses))} en total (sin público)`);
    return perks;
}
//# sourceMappingURL=busking.js.map