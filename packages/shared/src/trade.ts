import { getItem, InventoryStack } from "./items";
import { MAX_MONEY } from "./money";

/**
 * Intercambio entre jugadores: cada uno arma una oferta (ítems de su mochila + plata) y el
 * intercambio se hace recién cuando los dos aceptan. Cambiar una oferta anula ambas aceptaciones.
 */

/** Cuánto dura una invitación a intercambiar sin respuesta. */
export const TRADE_INVITE_MS = 30_000;

/** Máximo de ítems distintos por oferta. */
export const TRADE_MAX_ITEMS = 9;

export interface TradeOffer {
  /** Ítems de la mochila ofrecidos: uno por `itemId`, con su cantidad. */
  items: InventoryStack[];
  /** Pesos enteros (0 = sin plata). */
  money: number;
}

export const EMPTY_TRADE_OFFER: TradeOffer = { items: [], money: 0 };

/**
 * Valida y normaliza una oferta que llega por red: ítems existentes, cantidades enteras positivas,
 * sin `itemId` repetidos (se suman) y plata entera dentro del tope. Devuelve null si no es válida.
 * No mira la mochila: eso lo chequea el server con el inventario real.
 */
export function normalizeTradeOffer(value: unknown): TradeOffer | null {
  if (typeof value !== "object" || value === null) return null;
  const { items, money } = value as Record<string, unknown>;
  if (!Array.isArray(items) || !isTradeMoney(money)) return null;

  const totals = new Map<string, number>();
  for (const entry of items) {
    if (typeof entry !== "object" || entry === null) return null;
    const { itemId, quantity } = entry as Record<string, unknown>;
    if (typeof itemId !== "string" || !getItem(itemId)) return null;
    if (!Number.isSafeInteger(quantity) || (quantity as number) <= 0) return null;
    totals.set(itemId, (totals.get(itemId) ?? 0) + (quantity as number));
  }
  if (totals.size > TRADE_MAX_ITEMS) return null;
  return { items: [...totals].map(([itemId, quantity]) => ({ itemId, quantity })), money };
}

/** Plata de una oferta: entero entre 0 y el tope. */
export function isTradeMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY;
}

/** Cantidad ofrecida de `itemId` (0 si no está en la oferta). */
export function offeredQuantity(offer: TradeOffer, itemId: string): number {
  return offer.items.find((stack) => stack.itemId === itemId)?.quantity ?? 0;
}

/** Copia de la oferta con `delta` unidades más (o menos) de `itemId`; las que quedan en 0 se van. */
export function changeOfferQuantity(offer: TradeOffer, itemId: string, delta: number): TradeOffer {
  const quantity = offeredQuantity(offer, itemId) + delta;
  const others = offer.items.filter((stack) => stack.itemId !== itemId);
  if (quantity <= 0) return { ...offer, items: others };
  const index = offer.items.findIndex((stack) => stack.itemId === itemId);
  const items = [...others];
  items.splice(index === -1 ? items.length : index, 0, { itemId, quantity });
  return { ...offer, items };
}
