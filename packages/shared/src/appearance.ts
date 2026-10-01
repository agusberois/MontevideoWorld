import { PLAYER_COLORS } from "./constants";

/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */

export const GENDERS = ["m", "f"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { m: "Hombre", f: "Mujer" };

export const SKIN_TONES = ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"] as const;
export const HAIR_COLORS = ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"] as const;

export const HAIR_STYLES = ["short", "long", "afro", "buzz", "ponytail"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Corto",
  long: "Largo",
  afro: "Afro",
  buzz: "Rapado",
  ponytail: "Colita",
};

export interface Appearance {
  gender: Gender;
  /** Índice en `SKIN_TONES`. */
  skin: number;
  /** Índice en `HAIR_COLORS`. */
  hairColor: number;
  hairStyle: HairStyle;
  /** Color del jugador (uno de `PLAYER_COLORS`): su nombre en el juego, el HUD y la lista. */
  color: string;
}

/** Peinados que el dado prefiere para cada sexo (igual se puede elegir cualquiera). */
const LIKELY_HAIR: Record<Gender, readonly HairStyle[]> = {
  m: ["short", "short", "buzz", "afro", "long"],
  f: ["long", "long", "ponytail", "ponytail", "afro", "short"],
};

/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
export function randomAppearance(random: () => number = Math.random): Appearance {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const gender = pick(GENDERS);
  return {
    gender,
    skin: Math.floor(random() * SKIN_TONES.length),
    hairColor: Math.floor(random() * HAIR_COLORS.length),
    hairStyle: pick(LIKELY_HAIR[gender]),
    color: pick(PLAYER_COLORS),
  };
}

/** Valida un aspecto que llega por red; null si algún campo no es de las listas. */
export function sanitizeAppearance(value: unknown): Appearance | null {
  if (typeof value !== "object" || value === null) return null;
  const { gender, skin, hairColor, hairStyle, color } = value as Record<string, unknown>;
  if (!GENDERS.includes(gender as Gender)) return null;
  if (!isIndex(skin, SKIN_TONES.length) || !isIndex(hairColor, HAIR_COLORS.length)) return null;
  if (!HAIR_STYLES.includes(hairStyle as HairStyle)) return null;
  if (!(PLAYER_COLORS as readonly unknown[]).includes(color)) return null;
  return { gender: gender as Gender, skin, hairColor, hairStyle: hairStyle as HairStyle, color: color as string };
}

function isIndex(value: unknown, length: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
}
