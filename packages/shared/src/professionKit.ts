import { CARTS, INSTRUMENTS, RODS, SAFETY_VEST_ID } from "./items";
import type { ProfessionId } from "./welcome";

/** Lo más barato de una lista (la herramienta de nivel 1). */
function cheapest<T extends { id: string; price: number }>(items: readonly T[]): T {
  return items.reduce((best, item) => (item.price < best.price ? item : best));
}

/**
 * Lo que te da cada profesión al elegirla en la carta de bienvenida (o al tocarte cuidacoches): la
 * herramienta más barata de su trabajo, o el chaleco flúo. Va a la mochila (`systems/welcome.ts`).
 * Aparte de `welcome.ts` porque mira el catálogo (`items.ts` ya importa de `welcome.ts`).
 */
export const PROFESSION_KIT: Record<ProfessionId, string> = {
  pescador: cheapest(RODS).id,
  vendedor: cheapest(CARTS).id,
  musico: cheapest(INSTRUMENTS).id,
  cuidacoches: SAFETY_VEST_ID,
};
