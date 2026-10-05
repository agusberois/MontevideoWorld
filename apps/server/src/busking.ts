import { InstrumentItem } from "@montevideo-world/shared";

/** Resultado de un tema, decidido al empezar a tocar (sin el público: ese se cuenta al terminar). */
export interface TipRoll {
  /** La propina base (0 = nadie dejó nada); al cobrarla se multiplica por el público (`buskMultiplier`). */
  tip: number;
  /** Cuánto hay que esperar hasta saber el resultado. */
  durationMs: number;
}

/**
 * Sortea un tema con este instrumento: nadie deja nada (`noTipChance`) o una propina entre `tipMin` y
 * `tipMax`. La espera (4–6 s × `waitFactor`) se sortea aparte del resultado, como al pescar: si
 * dependiera de la propina, cortar y volver a tocar hasta ver una espera corta sería gratis.
 */
export function rollTip(instrument: InstrumentItem, random: () => number = Math.random): TipRoll {
  const durationMs = Math.round((4000 + random() * 2000) * instrument.waitFactor);
  if (random() < instrument.noTipChance) return { tip: 0, durationMs };
  return { tip: instrument.tipMin + Math.floor(random() * (instrument.tipMax - instrument.tipMin + 1)), durationMs };
}
