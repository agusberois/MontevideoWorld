import { CartItem, MATCH_WAIT_FACTOR, VENDING_GIFTS, giftChance, saleRange } from "@montevideo-world/shared";

/** Resultado de un intento de venta, decidido al empezar a ofrecer. */
export interface SaleRoll {
  /** Lo que paga el hincha (0 = nadie compró). */
  earned: number;
  /** Prenda que regala el hincha, además de comprar (sólo si compró). */
  giftId?: string;
  /** Cuánto hay que esperar hasta saber el resultado. */
  durationMs: number;
}

/**
 * Sortea una venta con este carrito: nadie compra (`cart.noSaleChance`) o un hincha paga entre
 * `saleRange` (el doble con partido) y, con `giftChance`, además regala una prenda de `VENDING_GIFTS`.
 * Con partido los hinchas llegan antes (`MATCH_WAIT_FACTOR`); los mejores carritos, también.
 */
export function rollSale(cart: CartItem, match: boolean, random: () => number = Math.random): SaleRoll {
  const durationMs = Math.round((3000 + random() * 3000) * cart.waitFactor * (match ? MATCH_WAIT_FACTOR : 1));
  if (random() < cart.noSaleChance) return { earned: 0, durationMs };

  const [min, max] = saleRange(cart, match);
  const earned = min + Math.floor(random() * (max - min + 1));
  const giftId = random() < giftChance(cart, match) ? pickGift(random) : undefined;
  return { earned, giftId, durationMs };
}

function pickGift(random: () => number): string {
  const total = VENDING_GIFTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of VENDING_GIFTS) {
    roll -= entry.weight;
    if (roll < 0) return entry.itemId;
  }
  return VENDING_GIFTS[VENDING_GIFTS.length - 1].itemId;
}
