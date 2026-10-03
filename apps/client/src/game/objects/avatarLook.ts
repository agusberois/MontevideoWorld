import {
  ClothingOf,
  Gender,
  HAIR_COLORS,
  HAIR_STYLES,
  HairStyle,
  ITEM_SLOTS,
  ItemSlot,
  OutfitIds,
  SKIN_TONES,
  getClothing,
} from "@montevideo-world/shared";

/**
 * Rasgos físicos del avatar (sexo, piel y pelo), resueltos a colores de Phaser. Salen del aspecto
 * que el jugador eligió al entrar, que viaja en el Schema (`gender`, `skin`, `hairColor`, `hairStyle`).
 * La ropa también viaja en el Schema (ver `Outfit`) porque el jugador la cambia desde la mochila.
 */

export interface AvatarLook {
  gender: Gender;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
}

/** Prendas puestas, resueltas contra el catálogo. Un lugar sin prenda queda `undefined`. */
export type Outfit = { [S in ItemSlot]?: ClothingOf<S> };

export function outfitFromIds(ids: OutfitIds): Outfit {
  const outfit: Partial<Record<ItemSlot, ClothingOf<ItemSlot>>> = {};
  for (const slot of ITEM_SLOTS) {
    const item = ids[slot] ? getClothing(ids[slot]) : undefined;
    if (item && item.slot === slot) outfit[slot] = item;
  }
  // Cada prenda quedó en su propio lugar (`item.slot === slot`).
  return outfit as Outfit;
}

/** Campos del aspecto tal como llegan del Schema (validados por el server, pero se defiende igual). */
export interface AppearanceFields {
  gender: string;
  skin: number;
  hairColor: number;
  hairStyle: string;
}

export function lookFromAppearance(fields: AppearanceFields): AvatarLook {
  return {
    gender: fields.gender === "f" ? "f" : "m",
    skin: hexToNumber(SKIN_TONES[fields.skin] ?? SKIN_TONES[0]),
    hair: hexToNumber(HAIR_COLORS[fields.hairColor] ?? HAIR_COLORS[0]),
    hairStyle: (HAIR_STYLES as readonly string[]).includes(fields.hairStyle) ? (fields.hairStyle as HairStyle) : "short",
  };
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}
