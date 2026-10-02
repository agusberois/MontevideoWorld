/**
 * Picudo rojo: plaga de las palmeras. Clic en una palmera la sacude y salen picudos que persiguen
 * al jugador **más cercano** (no al que sacudió) y lo pican (le sacan energía). Se matan a patadas
 * (clic sobre el picudo, estando cerca) y cada uno paga una recompensa. Los mueve el server y viajan
 * en el Schema (`GameState.weevils`): todos los ven igual. Distancias en tiles, tiempos en ms.
 */

/** Cuántos salen al sacudir una palmera (al azar entre los dos). */
export const WEEVILS_PER_PALM = { min: 2, max: 4 } as const;
/** Tope de picudos vivos por sala, para que no se llene el barrio. */
export const MAX_WEEVILS = 24;
/** Una palmera recién sacudida no larga más picudos hasta que pase esto. */
export const PALM_COOLDOWN_MS = 8000;

/** Al salir de la palmera tardan esto en empezar a perseguir. */
export const WEEVIL_EMERGE_MS = 700;
/** Velocidad (tiles por segundo): más lentos que un jugador caminando (4/s), se los puede dejar atrás. */
export const WEEVIL_SPEED = 2.2;
/** Persiguen al jugador más cercano dentro de este radio; si no hay nadie, vuelven a la palmera. */
export const WEEVIL_AGGRO_RANGE = 6;
/** A esta distancia del objetivo pican. */
export const WEEVIL_BITE_RANGE = 0.55;
/** Tiempo mínimo entre dos picaduras del mismo picudo. */
export const WEEVIL_BITE_MS = 1500;
/** Energía y salud que saca cada picadura. */
export const WEEVIL_BITE_ENERGY = 2;
export const WEEVIL_BITE_HEALTH = 2;
/** Pasado este tiempo se vuelven a la palmera aunque tengan a quién picar. */
export const WEEVIL_LIFETIME_MS = 30_000;

/** Distancia máxima (desde el tile del jugador) para patear un picudo. */
export const WEEVIL_KICK_RANGE = 1.6;
/** Plata por cada picudo aplastado. */
export const WEEVIL_REWARD = 1;

/** Qué está haciendo: saliendo de la palmera, persiguiendo, volviendo a la palmera o muerto. */
export const WEEVIL_MODES = ["emerge", "chase", "leave", "dead"] as const;
export type WeevilMode = (typeof WEEVIL_MODES)[number];

/**
 * Cómo viajan en el Schema, para que pesen poco (son lo que más se actualiza del barrio): el modo
 * como número (su índice en `WEEVIL_MODES`) y la posición en centésimas de tile como entero de
 * 2 bytes (un cuarto de píxel de precisión; los mapas no pasan de 255 tiles).
 */
export const WEEVIL_POSITION_SCALE = 100;

export function weevilModeCode(mode: WeevilMode): number {
  return WEEVIL_MODES.indexOf(mode);
}

export function weevilModeOf(code: number): WeevilMode {
  return WEEVIL_MODES[code] ?? "dead";
}

/** Posición en tiles (con decimales) de un picudo del Schema. */
export function weevilTile(weevil: { x: number; y: number }): { x: number; y: number } {
  return { x: weevil.x / WEEVIL_POSITION_SCALE, y: weevil.y / WEEVIL_POSITION_SCALE };
}

/** Tiles con decimales → lo que va al Schema. */
export function encodeWeevilCoord(tile: number): number {
  return Math.max(0, Math.min(65535, Math.round(tile * WEEVIL_POSITION_SCALE)));
}
