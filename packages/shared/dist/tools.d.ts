import { ToolItem } from "./items";
/**
 * Rentabilidad de las herramientas: lo que deja una caña o un carrito en promedio a lo largo de sus
 * `maxUses` tiene que superar lo que cuesta. Si no, comprarla sería perder plata.
 */
/** Plata que deja en promedio un uso (una tirada o un intento de venta). */
export declare function valuePerUse(tool: ToolItem): number;
/** Plata que deja en promedio en toda su vida (`maxUses` usos), sin partidos, regalos ni reventa. */
export declare function lifetimeValue(tool: ToolItem): number;
/** Herramientas que no se pagan solas (lo que dejan no supera su precio). Tiene que estar vacía. */
export declare function unprofitableTools(): ToolItem[];
//# sourceMappingURL=tools.d.ts.map