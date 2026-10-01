"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTHING_CHANCE = void 0;
exports.rollCatch = rollCatch;
const shared_1 = require("@montevideo-world/shared");
/** Probabilidad de que no pique nada en un intento. */
exports.NOTHING_CHANCE = 0.2;
/**
 * Sortea qué pica: nada (`NOTHING_CHANCE`) o un pez según su `catchWeight` (los fáciles pican más).
 * La espera crece con la dificultad: un pez difícil tarda más en picar.
 */
function rollCatch(random = Math.random) {
    if (random() < exports.NOTHING_CHANCE) {
        return { fish: null, durationMs: 4000 + Math.floor(random() * 3000) };
    }
    const total = shared_1.FISH.reduce((sum, fish) => sum + fish.catchWeight, 0);
    let roll = random() * total;
    let picked = shared_1.FISH[shared_1.FISH.length - 1];
    for (const fish of shared_1.FISH) {
        roll -= fish.catchWeight;
        if (roll < 0) {
            picked = fish;
            break;
        }
    }
    return { fish: picked, durationMs: 2500 + picked.difficulty * 800 + Math.floor(random() * 2500) };
}
//# sourceMappingURL=fishing.js.map