import { tipValue } from "./busking";
import { catchValue } from "./fishing";
import { CARTS, INSTRUMENTS, RODS, ToolItem } from "./items";
import { saleValue } from "./vending";

/**
 * Rentabilidad de las herramientas: lo que deja una caña, un carrito o un instrumento en promedio a lo largo de sus
 * `maxUses` tiene que superar lo que cuesta. Si no, comprarla sería perder plata.
 */

/** Plata que deja en promedio un uso (una tirada, un intento de venta o un tema). */
export function valuePerUse(tool: ToolItem): number {
  if (tool.category === "rod") return catchValue(tool);
  return tool.category === "cart" ? saleValue(tool) : tipValue(tool);
}

/** Plata que deja en promedio en toda su vida (`maxUses` usos), sin partidos, regalos, público ni reventa. */
export function lifetimeValue(tool: ToolItem): number {
  return valuePerUse(tool) * tool.maxUses;
}

/** Herramientas que no se pagan solas (lo que dejan no supera su precio). Tiene que estar vacía. */
export function unprofitableTools(): ToolItem[] {
  return [...RODS, ...CARTS, ...INSTRUMENTS].filter((tool) => lifetimeValue(tool) <= tool.price);
}
