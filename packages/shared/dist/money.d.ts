/**
 * Dinero del juego (pesos). Se maneja en unidades enteras: nada de decimales ni de flotantes.
 * El saldo es autoritativo del servidor y privado de cada jugador (no viaja en el Schema).
 */
/** Saldo con el que aparece un jugador nuevo. */
export declare const STARTING_MONEY = 100;
/** Tope del saldo, para que ninguna operación se vaya de rango. */
export declare const MAX_MONEY = 1000000000;
/** ¿Es un monto válido para cobrar o pagar? (entero positivo y dentro del tope) */
export declare function isValidAmount(amount: unknown): amount is number;
/** "$1.250" — mismo formato en cliente y servidor (mensajes de tiendas, HUD…). */
export declare function formatMoney(amount: number): string;
//# sourceMappingURL=money.d.ts.map