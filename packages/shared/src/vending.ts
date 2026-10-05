import { formatPercent } from "./fishing";
import { CartItem, LootEntry } from "./items";
import { formatMoney } from "./money";

/**
 * Vender en la explanada del Estadio Centenario (Tres Cruces): reglas que comparten el server (que
 * sortea) y el cliente (que las muestra en la tienda, la mochila y el botón de vender).
 */

/** Partido en el Centenario: de `start` a `end` (minutos del día del juego) se vende más. */
export interface Match {
  name: string;
  start: number;
  end: number;
}

/** Los partidos de cada día del juego (con `DAY_LENGTH_MINUTES` = 24, cada uno dura 2 minutos reales). */
export const MATCHES: readonly Match[] = [
  { name: "Nacional – Peñarol", start: 15 * 60, end: 17 * 60 },
  { name: "Uruguay – Argentina", start: 21 * 60, end: 23 * 60 },
];

/**
 * El hincha que se acerca al carrito mientras se espera la venta (`vend:customer`, sólo lo ve el vendedor):
 * sale a caminar `CUSTOMER_LEAD_MS` antes del resultado y, al saberse, compra o sigue de largo.
 * Cancelar la venta (moverse, etc.) lo vuelve a `None` y se va sin decir nada.
 */
export const CustomerState = { None: 0, Arriving: 1, Bought: 2, Passed: 3 } as const;
export type CustomerState = (typeof CustomerState)[keyof typeof CustomerState];
export const CUSTOMER_LEAD_MS = 2200;

/** Con partido, cada venta paga esto más… */
export const MATCH_SALE_MULTIPLIER = 2;
/** …los hinchas llegan antes (multiplica la espera)… */
export const MATCH_WAIT_FACTOR = 0.6;
/** …y regalan ropa más seguido. */
export const MATCH_GIFT_MULTIPLIER = 2;

/** El partido que se está jugando a esta hora del juego, si hay. */
export function matchAt(minuteOfDay: number): Match | undefined {
  return MATCHES.find((match) => minuteOfDay >= match.start && minuteOfDay < match.end);
}

/**
 * Partido forzado por el admin (`GameState.matchMode`): "auto" sigue el horario de `MATCHES`, "on"
 * juega el partido elegido hasta que se vuelva a "auto" y "off" no deja que haya ninguno.
 */
export const MATCH_MODES = ["auto", "on", "off"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export function getMatch(name: string): Match | undefined {
  return MATCHES.find((match) => match.name === name);
}

/**
 * Lo que puede regalar un hincha contento (además de comprar): ropa de cancha. Es la única forma
 * de conseguir prendas sin comprarlas.
 */
export const VENDING_GIFTS: readonly LootEntry[] = [
  { itemId: "camiseta-celeste", weight: 40 },
  { itemId: "gorra-azul", weight: 20 },
  { itemId: "short-azul", weight: 15 },
  { itemId: "buzo-gris", weight: 10 },
  { itemId: "championes-blancos", weight: 10 },
  { itemId: "botas-marrones", weight: 5 },
];

/** Probabilidad (0–1) de que un hincha regale una prenda en un intento, con o sin partido. */
export function giftChance(cart: CartItem, match: boolean): number {
  return Math.min(1, cart.giftChance * (match ? MATCH_GIFT_MULTIPLIER : 1));
}

/** Lo que paga un hincha por unidad con este carrito: [mínimo, máximo]. */
export function saleRange(cart: CartItem, match: boolean): [number, number] {
  const multiplier = match ? MATCH_SALE_MULTIPLIER : 1;
  return [cart.saleMin * multiplier, cart.saleMax * multiplier];
}

/**
 * Plata que deja en promedio un intento de venta con este carrito (contando que nadie compre). Sin
 * partido y sin contar los regalos: es el piso.
 */
export function saleValue(cart: CartItem): number {
  const [min, max] = saleRange(cart, false);
  return (1 - cart.noSaleChance) * ((min + max) / 2);
}

/** Las ventajas de un carrito en frases cortas, para la tienda, la mochila y el botón de vender. */
export function cartPerks(cart: CartItem): string[] {
  const [min, max] = saleRange(cart, false);
  const [matchMin, matchMax] = saleRange(cart, true);
  const perks = [
    `Venta: ${formatMoney(min)}–${formatMoney(max)} (con partido ${formatMoney(matchMin)}–${formatMoney(matchMax)})`,
    `Que nadie compre: ${formatPercent(cart.noSaleChance)}`,
    `Regalo de un hincha: ${formatPercent(giftChance(cart, false))}`,
  ];
  if (cart.waitFactor < 1) perks.push(`Clientes ${Math.round((1 - cart.waitFactor) * 100)} % más rápido`);
  perks.push(`Dura ${cart.maxUses} intentos y rinde ~${formatMoney(Math.floor(saleValue(cart) * cart.maxUses))} en total (sin partidos)`);
  return perks;
}
