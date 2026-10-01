import { InventoryStack } from "./items";
/**
 * Intercambio entre jugadores: cada uno arma una oferta (ítems de su mochila + plata) y el
 * intercambio se hace recién cuando los dos aceptan. Cambiar una oferta anula ambas aceptaciones.
 */
/** Cuánto dura una invitación a intercambiar sin respuesta. */
export declare const TRADE_INVITE_MS = 30000;
/** Máximo de ítems distintos por oferta. */
export declare const TRADE_MAX_ITEMS = 9;
export interface TradeOffer {
    /** Ítems de la mochila ofrecidos: uno por `itemId`, con su cantidad. */
    items: InventoryStack[];
    /** Pesos enteros (0 = sin plata). */
    money: number;
}
export declare const EMPTY_TRADE_OFFER: TradeOffer;
/**
 * Valida y normaliza una oferta que llega por red: ítems existentes, cantidades enteras positivas,
 * sin `itemId` repetidos (se suman) y plata entera dentro del tope. Devuelve null si no es válida.
 * No mira la mochila: eso lo chequea el server con el inventario real.
 */
export declare function normalizeTradeOffer(value: unknown): TradeOffer | null;
/** Plata de una oferta: entero entre 0 y el tope. */
export declare function isTradeMoney(value: unknown): value is number;
/** Cantidad ofrecida de `itemId` (0 si no está en la oferta). */
export declare function offeredQuantity(offer: TradeOffer, itemId: string): number;
/** Copia de la oferta con `delta` unidades más (o menos) de `itemId`; las que quedan en 0 se van. */
export declare function changeOfferQuantity(offer: TradeOffer, itemId: string, delta: number): TradeOffer;
//# sourceMappingURL=trade.d.ts.map