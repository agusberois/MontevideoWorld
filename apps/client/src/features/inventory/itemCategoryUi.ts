import {
  ItemCategory,
  ItemDefinition,
  SAFETY_VEST_ID,
  cartPerks,
  cartStars,
  difficultyStars,
  edibleLabel,
  edibleValue,
  instrumentPerks,
  instrumentStars,
  newbiePerk,
  rodPerks,
  rodStars,
  speedPerk,
} from "@montevideo-world/shared";

/**
 * Cómo se muestra cada categoría de ítem en las listas (tienda, mochila, cajas): estrellas y
 * ventajas. Lo que no es presentación (precios, si se apila, textos de la tienda) está en
 * `ITEM_CATEGORIES` (shared). Una categoría sin estrellas ni ventajas queda `{}`.
 */

type ItemOf<C extends ItemCategory> = Extract<ItemDefinition, { category: C }>;

interface CategoryUi<I extends ItemDefinition> {
  /** Estrellas ("★★☆☆") y qué significan, para el tooltip. */
  rating?: (item: I) => { stars: string; title: string };
  /** Ventajas en una línea corta cada una ("Peces raros: 6,6 %"). */
  perks?: (item: I) => string[];
}

const CATEGORY_UI: { [C in ItemCategory]: CategoryUi<ItemOf<C>> } = {
  clothing: {
    perks: (item) => [
      ...speedPerk(item),
      ...newbiePerk(item),
      ...(item.id === SAFETY_VEST_ID ? ["🦺 Puesto, cuidás coches frente a los edificios con nombre (no en tiendas)"] : []),
    ],
  },
  fish: {
    rating: (fish) => ({ stars: difficultyStars(fish.difficulty), title: `Dificultad ${fish.difficulty} de 5` }),
    perks: (fish) => edibleText(fish),
  },
  food: {
    perks: (item) => edibleText(item),
  },
  medicine: {
    perks: (item) => {
      const value = edibleValue(item);
      return value ? [`Tomarlo: ${edibleLabel(value)}`] : [];
    },
  },
  rod: {
    rating: (rod) => ({ stars: rodStars(rod.tier), title: `Nivel ${rod.tier} de 4` }),
    perks: rodPerks,
  },
  cart: {
    rating: (cart) => ({ stars: cartStars(cart.tier), title: `Nivel ${cart.tier} de 4` }),
    perks: cartPerks,
  },
  instrument: {
    rating: (instrument) => ({ stars: instrumentStars(instrument.tier), title: `Nivel ${instrument.tier} de 4` }),
    perks: instrumentPerks,
  },
  box: {},
  letter: {},
  ticket: {},
};

/** "Comerlo: 🍖 +30 · ⚡ +5" para lo que se come. */
function edibleText(item: ItemDefinition): string[] {
  const value = edibleValue(item);
  return value ? [`Comerlo: ${edibleLabel(value)}`] : [];
}

/** El registro de la categoría de este ítem (TypeScript no une solo la categoría con su tipo de ítem). */
function uiFor(item: ItemDefinition): CategoryUi<ItemDefinition> {
  return CATEGORY_UI[item.category] as CategoryUi<ItemDefinition>;
}

export function itemRating(item: ItemDefinition): { stars: string; title: string } | undefined {
  return uiFor(item).rating?.(item);
}

export function itemPerks(item: ItemDefinition): string[] {
  return uiFor(item).perks?.(item) ?? [];
}
