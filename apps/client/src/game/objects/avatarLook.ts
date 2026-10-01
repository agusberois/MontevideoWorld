import { ClothingItem, ITEM_SLOTS, ItemSlot, OutfitIds, getClothing } from "@montevideo-world/shared";

/**
 * Rasgos físicos del avatar (piel y pelo). Se derivan del sessionId de forma determinística, así
 * todos los clientes ven al mismo jugador igual sin agregar campos al Schema. La ropa, en cambio,
 * sí viaja en el Schema (ver `Outfit`) porque el jugador la cambia desde la mochila.
 */

export type HairStyle = "short" | "long" | "afro" | "buzz" | "ponytail";

export interface AvatarLook {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
}

/** Prendas puestas, resueltas contra el catálogo. Un lugar sin prenda queda `undefined`. */
export type Outfit = Partial<Record<ItemSlot, ClothingItem>>;

export function outfitFromIds(ids: OutfitIds): Outfit {
  const outfit: Outfit = {};
  for (const slot of ITEM_SLOTS) {
    const item = ids[slot] ? getClothing(ids[slot]) : undefined;
    if (item && item.slot === slot) outfit[slot] = item;
  }
  return outfit;
}

const SKIN_TONES = [0xf6d5b8, 0xeac09a, 0xd9a273, 0xb57a4c, 0x8d5a3b, 0x5e3a25];
const HAIR_COLORS = [0x1b1310, 0x3b2416, 0x6b4226, 0xa8742f, 0xd9b26a, 0x9c3b1f, 0x8a8a8a];
const HAIR_STYLES: HairStyle[] = ["short", "long", "afro", "buzz", "ponytail"];

/** Hash FNV-1a de 32 bits: estable entre navegadores. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** PRNG mulberry32: cada llamada devuelve un número en [0, 1). */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lookFor(seed: string): AvatarLook {
  const random = createRandom(hashString(seed));
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    hairStyle: pick(HAIR_STYLES),
  };
}
