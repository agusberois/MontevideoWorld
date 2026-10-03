import { PLAYER_COLORS } from "./constants";

/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo, ojos, barba, lentes y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */

export const GENDERS = ["m", "f"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { m: "Hombre", f: "Mujer" };

export const SKIN_TONES = ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"] as const;
export const HAIR_COLORS = ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"] as const;

export const HAIR_STYLES = ["short", "long", "afro", "buzz", "ponytail", "curly", "braids", "bun", "dreads"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Corto",
  long: "Largo",
  afro: "Afro",
  buzz: "Rapado",
  ponytail: "Colita",
  curly: "Rulos",
  braids: "Trenzas",
  bun: "Moño",
  dreads: "Rastas",
};

/** Marrón oscuro, marrón, negro, verde y celeste. */
export const EYE_COLORS = ["#2b1d14", "#6b4226", "#141414", "#3f7a52", "#4f86b8"] as const;

export const FACIAL_HAIR = ["none", "stubble", "mustache", "goatee", "beard"] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];
export const FACIAL_HAIR_LABELS: Record<FacialHair, string> = {
  none: "Sin barba",
  stubble: "De días",
  mustache: "Bigote",
  goatee: "Chiva",
  beard: "Barba",
};

export const GLASSES = ["none", "round", "square", "sun"] as const;
export type Glasses = (typeof GLASSES)[number];
export const GLASSES_LABELS: Record<Glasses, string> = {
  none: "Sin lentes",
  round: "Redondos",
  square: "Cuadrados",
  sun: "De sol",
};

export interface Appearance {
  gender: Gender;
  /** Índice en `SKIN_TONES`. */
  skin: number;
  /** Índice en `HAIR_COLORS`. */
  hairColor: number;
  hairStyle: HairStyle;
  /** Índice en `EYE_COLORS`. */
  eyeColor: number;
  facialHair: FacialHair;
  glasses: Glasses;
  /** Color del jugador (uno de `PLAYER_COLORS`): su nombre en el juego, el HUD y la lista. */
  color: string;
}

/** Peinados que el dado prefiere para cada sexo (igual se puede elegir cualquiera). */
const LIKELY_HAIR: Record<Gender, readonly HairStyle[]> = {
  m: ["short", "short", "buzz", "afro", "long", "curly", "dreads"],
  f: ["long", "long", "ponytail", "ponytail", "afro", "short", "curly", "braids", "bun"],
};

/** Barbas que tira el dado (al avatar de mujer, ninguna; igual se puede elegir). */
const LIKELY_FACIAL_HAIR: Record<Gender, readonly FacialHair[]> = {
  m: ["none", "none", "none", "stubble", "mustache", "goatee", "beard"],
  f: ["none"],
};

/** Lentes que tira el dado: la mayoría sin. */
const LIKELY_GLASSES: readonly Glasses[] = ["none", "none", "none", "none", "round", "square", "sun"];

/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
export function randomAppearance(random: () => number = Math.random): Appearance {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const gender = pick(GENDERS);
  return {
    gender,
    skin: Math.floor(random() * SKIN_TONES.length),
    hairColor: Math.floor(random() * HAIR_COLORS.length),
    hairStyle: pick(LIKELY_HAIR[gender]),
    eyeColor: Math.floor(random() * EYE_COLORS.length),
    facialHair: pick(LIKELY_FACIAL_HAIR[gender]),
    glasses: pick(LIKELY_GLASSES),
    color: pick(PLAYER_COLORS),
  };
}

/**
 * Valida un aspecto que llega por red; null si algún campo no es de las listas. Ojos, barba y lentes
 * son posteriores: si faltan (un aspecto guardado en el navegador antes de que existieran, o un
 * cliente viejo) van los de por defecto en vez de descartar todo; si vienen, tienen que ser válidos.
 */
export function sanitizeAppearance(value: unknown): Appearance | null {
  if (typeof value !== "object" || value === null) return null;
  const { gender, skin, hairColor, hairStyle, color, eyeColor = 0, facialHair = "none", glasses = "none" } = value as Record<string, unknown>;
  if (!GENDERS.includes(gender as Gender)) return null;
  if (!isIndex(skin, SKIN_TONES.length) || !isIndex(hairColor, HAIR_COLORS.length)) return null;
  if (!HAIR_STYLES.includes(hairStyle as HairStyle)) return null;
  if (!isIndex(eyeColor, EYE_COLORS.length)) return null;
  if (!FACIAL_HAIR.includes(facialHair as FacialHair) || !GLASSES.includes(glasses as Glasses)) return null;
  if (!(PLAYER_COLORS as readonly unknown[]).includes(color)) return null;
  return {
    gender: gender as Gender,
    skin,
    hairColor,
    hairStyle: hairStyle as HairStyle,
    eyeColor,
    facialHair: facialHair as FacialHair,
    glasses: glasses as Glasses,
    color: color as string,
  };
}

function isIndex(value: unknown, length: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
}
