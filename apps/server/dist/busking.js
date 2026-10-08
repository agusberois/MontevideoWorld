"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollTip = rollTip;
/**
 * Sortea un tema con este instrumento: nadie deja nada (`noTipChance`) o una propina entre `tipMin` y
 * `tipMax`. La espera (5–8 s × `waitFactor`) se sortea aparte del resultado, como al pescar: si
 * dependiera de la propina, cortar y volver a tocar hasta ver una espera corta sería gratis.
 */
function rollTip(instrument, random = Math.random) {
    const durationMs = Math.round((5000 + random() * 3000) * instrument.waitFactor);
    if (random() < instrument.noTipChance)
        return { tip: 0, durationMs };
    return { tip: instrument.tipMin + Math.floor(random() * (instrument.tipMax - instrument.tipMin + 1)), durationMs };
}
//# sourceMappingURL=busking.js.map