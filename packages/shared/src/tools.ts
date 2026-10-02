import { catchValue } from "./fishing";
import { CARTS, RODS, ToolItem } from "./items";
import { saleValue } from "./vending";

/**
 * Rentabilidad de las herramientas: lo que deja una caña o un carrito en promedio a lo largo de sus
 * `maxUses` tiene que superar lo que cuesta. Si no, comprarla sería perder plata.
 */

/** Plata que deja en promedio un uso (una tirada o un intento de venta). */
export function valuePerUse(tool: ToolItem): number {
  return tool.category === "rod" ? catchValue(tool) : saleValue(tool);
}

/** Plata que deja en promedio en toda su vida (`maxUses` usos), sin partidos, regalos ni reventa. */
export function lifetimeValue(tool: ToolItem): number {
  return valuePerUse(tool) * tool.maxUses;
}

/** Herramientas que no se pagan solas (lo que dejan no supera su precio). Tiene que estar vacía. */
export function unprofitableTools(): ToolItem[] {
  return [...RODS, ...CARTS].filter((tool) => lifetimeValue(tool) <= tool.price);
}
