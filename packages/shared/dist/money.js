"use strict";
/**
 * Dinero del juego (pesos). Se maneja en unidades enteras: nada de decimales ni de flotantes.
 * El saldo es autoritativo del servidor y privado de cada jugador (no viaja en el Schema).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRAVEL_TICKET_MS = exports.TRAVEL_FARE = exports.MAX_MONEY = exports.STARTING_MONEY = void 0;
exports.isValidAmount = isValidAmount;
exports.formatMoney = formatMoney;
/** Saldo con el que aparece un jugador nuevo. */
exports.STARTING_MONEY = 20;
/** Tope del saldo, para que ninguna operación se vaya de rango. */
exports.MAX_MONEY = 1_000_000_000;
/** Precio del boleto de ómnibus (STM, `TICKET_ID`) en la Agencia STM: cada viaje entre barrios gasta uno. */
exports.TRAVEL_FARE = 52;
/** Pase de viaje (boleto ya usado): hay que entrar al barrio de destino antes de que venza. */
exports.TRAVEL_TICKET_MS = 30_000;
/** ¿Es un monto válido para cobrar o pagar? (entero positivo y dentro del tope) */
function isValidAmount(amount) {
    return typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0 && amount <= exports.MAX_MONEY;
}
/** "$1.250" — mismo formato en cliente y servidor (mensajes de tiendas, HUD…). */
function formatMoney(amount) {
    const digits = String(Math.abs(Math.trunc(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${amount < 0 ? "-" : ""}$${digits}`;
}
//# sourceMappingURL=money.js.map