/**
 * Dinero del juego (pesos). Se maneja en unidades enteras: nada de decimales ni de flotantes.
 * El saldo es autoritativo del servidor y privado de cada jugador (no viaja en el Schema).
 */
/** Saldo con el que aparece un jugador nuevo. */
export declare const STARTING_MONEY = 100;
/** Tope del saldo, para que ninguna operación se vaya de rango. */
export declare const MAX_MONEY = 1000000000;
/** Precio del boleto de ómnibus (STM, `TICKET_ID`) en la Agencia STM: cada viaje entre barrios gasta uno. */
export declare const TRAVEL_FARE = 52;
/** Pase de viaje (boleto ya usado): hay que entrar al barrio de destino antes de que venza. */
export declare const TRAVEL_TICKET_MS = 30000;
/** ¿Es un monto válido para cobrar o pagar? (entero positivo y dentro del tope) */
export declare function isValidAmount(amount: unknown): amount is number;
/** "$1.250" — mismo formato en cliente y servidor (mensajes de tiendas, HUD…). */
export declare function formatMoney(amount: number): string;
//# sourceMappingURL=money.d.ts.map