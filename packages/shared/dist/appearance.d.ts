/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo, ojos, barba, lentes y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */
export declare const GENDERS: readonly ["m", "f"];
export type Gender = (typeof GENDERS)[number];
export declare const GENDER_LABELS: Record<Gender, string>;
export declare const SKIN_TONES: readonly ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"];
export declare const HAIR_COLORS: readonly ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"];
export declare const HAIR_STYLES: readonly ["short", "long", "afro", "buzz", "ponytail", "curly", "braids", "bun", "dreads"];
export type HairStyle = (typeof HAIR_STYLES)[number];
export declare const HAIR_STYLE_LABELS: Record<HairStyle, string>;
/** Marrón oscuro, marrón, negro, verde y celeste. */
export declare const EYE_COLORS: readonly ["#2b1d14", "#6b4226", "#141414", "#3f7a52", "#4f86b8"];
export declare const FACIAL_HAIR: readonly ["none", "stubble", "mustache", "goatee", "beard"];
export type FacialHair = (typeof FACIAL_HAIR)[number];
export declare const FACIAL_HAIR_LABELS: Record<FacialHair, string>;
export declare const GLASSES: readonly ["none", "round", "square", "sun"];
export type Glasses = (typeof GLASSES)[number];
export declare const GLASSES_LABELS: Record<Glasses, string>;
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
/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
export declare function randomAppearance(random?: () => number): Appearance;
/**
 * Valida un aspecto que llega por red; null si algún campo no es de las listas. Ojos, barba y lentes
 * son posteriores: si faltan (un aspecto guardado en el navegador antes de que existieran, o un
 * cliente viejo) van los de por defecto en vez de descartar todo; si vienen, tienen que ser válidos.
 */
export declare function sanitizeAppearance(value: unknown): Appearance | null;
//# sourceMappingURL=appearance.d.ts.map