/**
 * Regatear al vender en una tienda: pedís más que el precio normal (`sellPrice`) y es todo o nada.
 * Si la tienda acepta cobrás tu precio; si no, el ítem se pierde igual y no cobrás nada. Cliente y
 * server usan la misma fórmula: la probabilidad que se muestra es la que se sortea.
 */
/** Lo más que se puede pedir: 5 veces el precio normal. */
export declare const HAGGLE_MAX_RATIO = 5;
/** El precio más alto que se puede pedir por algo que normalmente pagan `base`. */
export declare function maxHagglePrice(base: number): number;
/** ¿Se puede regatear este precio? (entero, más que el normal y no más que el tope) */
export declare function isValidHagglePrice(base: number, price: unknown): price is number;
/** Probabilidad (0–1) de que la tienda acepte `price` por algo que normalmente paga `base`. */
export declare function haggleChance(base: number, price: number): number;
//# sourceMappingURL=haggle.d.ts.map