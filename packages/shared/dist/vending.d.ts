import { CartItem, LootEntry } from "./items";
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
export declare const MATCHES: readonly Match[];
/**
 * El hincha que se acerca al carrito mientras se espera la venta (`vend:customer`, sólo lo ve el vendedor):
 * sale a caminar `CUSTOMER_LEAD_MS` antes del resultado y, al saberse, compra o sigue de largo.
 * Cancelar la venta (moverse, etc.) lo vuelve a `None` y se va sin decir nada.
 */
export declare const CustomerState: {
    readonly None: 0;
    readonly Arriving: 1;
    readonly Bought: 2;
    readonly Passed: 3;
};
export type CustomerState = (typeof CustomerState)[keyof typeof CustomerState];
export declare const CUSTOMER_LEAD_MS = 2200;
/** Con partido, cada venta paga esto más… */
export declare const MATCH_SALE_MULTIPLIER = 2;
/** …los hinchas llegan antes (multiplica la espera)… */
export declare const MATCH_WAIT_FACTOR = 0.6;
/** …y regalan ropa más seguido. */
export declare const MATCH_GIFT_MULTIPLIER = 2;
/** El partido que se está jugando a esta hora del juego, si hay. */
export declare function matchAt(minuteOfDay: number): Match | undefined;
/**
 * Partido forzado por el admin (`GameState.matchMode`): "auto" sigue el horario de `MATCHES`, "on"
 * juega el partido elegido hasta que se vuelva a "auto" y "off" no deja que haya ninguno.
 */
export declare const MATCH_MODES: readonly ["auto", "on", "off"];
export type MatchMode = (typeof MATCH_MODES)[number];
export declare function getMatch(name: string): Match | undefined;
/**
 * Lo que puede regalar un hincha contento (además de comprar): ropa de cancha. Es la única forma
 * de conseguir prendas sin comprarlas.
 */
export declare const VENDING_GIFTS: readonly LootEntry[];
/** Probabilidad (0–1) de que un hincha regale una prenda en un intento, con o sin partido. */
export declare function giftChance(cart: CartItem, match: boolean): number;
/** Lo que paga un hincha por unidad con este carrito: [mínimo, máximo]. */
export declare function saleRange(cart: CartItem, match: boolean): [number, number];
/**
 * Plata que deja en promedio un intento de venta con este carrito (contando que nadie compre). Sin
 * partido y sin contar los regalos: es el piso.
 */
export declare function saleValue(cart: CartItem): number;
/** Las ventajas de un carrito en frases cortas, para la tienda, la mochila y el botón de vender. */
export declare function cartPerks(cart: CartItem): string[];
//# sourceMappingURL=vending.d.ts.map