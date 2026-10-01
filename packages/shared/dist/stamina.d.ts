/**
 * Stamina (energía) del jugador. Las actividades la gastan y descansar la recupera, así nadie puede
 * caminar ni pescar sin parar. La lleva el servidor; el cliente sólo la muestra.
 */
export declare const MAX_STAMINA = 100;
/** Gasto por cada tile caminado (con el tanque lleno alcanza para ~165 pasos). */
export declare const WALK_STAMINA_COST = 0.6;
/** Gasto por cada vez que se tira la línea en la escollera. */
export declare const FISH_STAMINA_COST = 10;
/** Recuperación por segundo quieto (parado, sin pescar). */
export declare const IDLE_STAMINA_REGEN = 2;
/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
export declare const SIT_STAMINA_REGEN = 10;
/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
export declare const EXHAUSTED_RECOVERY = 20;
/** Por debajo de esto el HUD la muestra en rojo. */
export declare const LOW_STAMINA = 20;
//# sourceMappingURL=stamina.d.ts.map