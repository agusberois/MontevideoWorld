/**
 * Regatear al vender en una tienda: pedís más que el precio normal (`sellPrice`) y es todo o nada.
 * Si la tienda acepta cobrás tu precio; si no, el ítem se pierde igual y no cobrás nada. Cliente y
 * server usan la misma fórmula: la probabilidad que se muestra es la que se sortea.
 */

/** Lo más que se puede pedir: 5 veces el precio normal. */
export const HAGGLE_MAX_RATIO = 5;

/**
 * Qué tan rápido cae la probabilidad al pedir más. Con 1 sería "justo" (en promedio da lo mismo que
 * vender normal); con más de 1 la tienda tiene una pequeña ventaja, así regatear es una apuesta
 * divertida y no una forma de farmear plata.
 */
const HAGGLE_STEEPNESS = 1.2;

/** El precio más alto que se puede pedir por algo que normalmente pagan `base`. */
export function maxHagglePrice(base: number): number {
  return Math.floor(base * HAGGLE_MAX_RATIO);
}

/** ¿Se puede regatear este precio? (entero, más que el normal y no más que el tope) */
export function isValidHagglePrice(base: number, price: unknown): price is number {
  return Number.isSafeInteger(price) && (price as number) > base && (price as number) <= maxHagglePrice(base);
}

/** Probabilidad (0–1) de que la tienda acepte `price` por algo que normalmente paga `base`. */
export function haggleChance(base: number, price: number): number {
  if (price <= base) return 1;
  return Math.pow(base / price, HAGGLE_STEEPNESS);
}
