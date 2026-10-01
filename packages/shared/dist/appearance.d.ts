/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */
export declare const GENDERS: readonly ["m", "f"];
export type Gender = (typeof GENDERS)[number];
export declare const GENDER_LABELS: Record<Gender, string>;
export declare const SKIN_TONES: readonly ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"];
export declare const HAIR_COLORS: readonly ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"];
export declare const HAIR_STYLES: readonly ["short", "long", "afro", "buzz", "ponytail"];
export type HairStyle = (typeof HAIR_STYLES)[number];
export declare const HAIR_STYLE_LABELS: Record<HairStyle, string>;
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
/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
export declare function randomAppearance(random?: () => number): Appearance;
/** Valida un aspecto que llega por red; null si algún campo no es de las listas. */
export declare function sanitizeAppearance(value: unknown): Appearance | null;
//# sourceMappingURL=appearance.d.ts.map