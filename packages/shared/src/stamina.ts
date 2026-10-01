/**
 * Stamina (energía) del jugador. Las actividades la gastan y descansar la recupera, así nadie puede
 * caminar ni pescar sin parar. La lleva el servidor; el cliente sólo la muestra.
 */

export const MAX_STAMINA = 100;

/** Gasto por cada tile caminado (con el tanque lleno alcanza para ~165 pasos). */
export const WALK_STAMINA_COST = 0.6;

/** Gasto por cada vez que se tira la línea en la escollera. */
export const FISH_STAMINA_COST = 10;

/** Recuperación por segundo quieto (parado, sin pescar). */
export const IDLE_STAMINA_REGEN = 2;

/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
export const SIT_STAMINA_REGEN = 10;

/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
export const EXHAUSTED_RECOVERY = 20;

/**
 * Energía que da comer un pescado: más cuanto más difícil (pejerrey +10 … corvina negra +30).
 * Es un trade-off: el pescado que te comés no lo vendés.
 */
export function fishStamina(difficulty: number): number {
  return 5 + difficulty * 5;
}

/** Por debajo de esto el HUD la muestra en rojo. */
export const LOW_STAMINA = EXHAUSTED_RECOVERY;
