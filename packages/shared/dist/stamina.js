"use strict";
/**
 * Stamina (energía) del jugador. Las actividades la gastan y descansar la recupera, así nadie puede
 * caminar, pescar ni vender sin parar. La lleva el servidor; el cliente sólo la muestra.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOW_STAMINA = exports.EXHAUSTED_RECOVERY = exports.SIT_STAMINA_REGEN = exports.IDLE_STAMINA_REGEN = exports.VEND_STAMINA_COST = exports.FISH_STAMINA_COST = exports.WALK_STAMINA_COST = exports.MAX_STAMINA = void 0;
exports.fishStamina = fishStamina;
exports.MAX_STAMINA = 100;
/** Gasto por cada tile caminado (con el tanque lleno alcanza para ~165 pasos). */
exports.WALK_STAMINA_COST = 0.6;
/** Gasto por cada vez que se tira la línea en la escollera. */
exports.FISH_STAMINA_COST = 10;
/** Gasto por cada vez que se ofrece la mercadería en la explanada del Centenario. */
exports.VEND_STAMINA_COST = 6;
/** Recuperación por segundo quieto (parado, sin pescar). */
exports.IDLE_STAMINA_REGEN = 2;
/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
exports.SIT_STAMINA_REGEN = 10;
/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
exports.EXHAUSTED_RECOVERY = 20;
/**
 * Energía que da comer un pescado: más cuanto más difícil (pejerrey +10 … corvina negra +30).
 * Es un trade-off: el pescado que te comés no lo vendés.
 */
function fishStamina(difficulty) {
    return 5 + difficulty * 5;
}
/** Por debajo de esto el HUD la muestra en rojo. */
exports.LOW_STAMINA = exports.EXHAUSTED_RECOVERY;
//# sourceMappingURL=stamina.js.map