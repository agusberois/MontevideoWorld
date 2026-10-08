"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARK_WAIT_MAX_MS = exports.PARK_WAIT_MIN_MS = exports.PARK_NO_TIP_CHANCE = exports.PARK_TIP_MAX = exports.PARK_TIP_MIN = exports.CAR_ARRIVE_MS = exports.CarState = void 0;
exports.wearsSafetyVest = wearsSafetyVest;
exports.parkValue = parkValue;
exports.parkingHourlyIncome = parkingHourlyIncome;
exports.parkingPerks = parkingPerks;
const odds_1 = require("./odds");
const items_1 = require("./items");
const money_1 = require("./money");
const needs_1 = require("./needs");
/**
 * Cuidar coches (el trabajo del cuidacoches, frente a cualquier edificio con nombre de los barrios,
 * `CityMap.canParkAt`; nunca frente a tiendas ni kioscos): reglas que
 * comparten el server (que sortea y paga) y el cliente (que las muestra en el panel).
 *
 * Funciona como tocar en la calle, pero sin herramienta que se gaste: hace falta tener **puesto el
 * chaleco flúo** (`SAFETY_VEST_ID`) y pararse frente a un edificio con nombre. Llega un auto,
 * estaciona al lado, el cuidacoches le hace señas con la franela y, al rato, el dueño vuelve y deja
 * (o no) una moneda.
 */
/**
 * El auto de mentira (sólo lo ve el cuidacoches, `park:car`): llega y estaciona `CAR_ARRIVE_MS`
 * después de empezar y, al terminar, el dueño deja plata (`Tipped`) o se va sin dejar nada (`Left`).
 * Cortar (moverse, etc.) lo manda a `None`: arranca y se va.
 */
exports.CarState = { None: 0, Arriving: 1, Tipped: 2, Left: 3 };
exports.CAR_ARRIVE_MS = 400;
/** La propina, en pesos enteros (sorteada pareja entre los dos). */
exports.PARK_TIP_MIN = 6;
exports.PARK_TIP_MAX = 14;
/** Que el dueño se vaya sin dejar nada ("hoy no tengo cambio"). */
exports.PARK_NO_TIP_CHANCE = 0.3;
/** Cuánto tarda el dueño en volver (al azar entre los dos, sorteado aparte del resultado). */
exports.PARK_WAIT_MIN_MS = 5000;
exports.PARK_WAIT_MAX_MS = 8000;
/** ¿Tiene puesto el chaleco flúo? (Sin él no se puede cuidar coches.) */
function wearsSafetyVest(top) {
    return top === items_1.SAFETY_VEST_ID;
}
/** Plata que deja en promedio cada auto, contando los que no dejan nada. */
function parkValue() {
    return (1 - exports.PARK_NO_TIP_CHANCE) * ((exports.PARK_TIP_MIN + exports.PARK_TIP_MAX) / 2);
}
/** Plata por hora cuidando coches (con lo que hay que descansar para reponer la energía; no hay herramienta que se gaste). */
function parkingHourlyIncome() {
    const seconds = (exports.PARK_WAIT_MIN_MS + exports.PARK_WAIT_MAX_MS) / 2000 + needs_1.PARK_ENERGY_COST / needs_1.SIT_ENERGY_REGEN;
    return (parkValue() * 3600) / seconds;
}
/** Las reglas en frases cortas, para el panel. */
function parkingPerks() {
    return [
        `Propina: ${(0, money_1.formatMoney)(exports.PARK_TIP_MIN)}–${(0, money_1.formatMoney)(exports.PARK_TIP_MAX)} por auto`,
        `Que el dueño no deje nada: ${(0, odds_1.oddsLabel)(exports.PARK_NO_TIP_CHANCE)}`,
        "No se gasta nada: sólo hace falta el chaleco flúo puesto",
    ];
}
//# sourceMappingURL=parking.js.map