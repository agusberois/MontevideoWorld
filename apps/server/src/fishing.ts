import { FISH, FishItem } from "@montevideo-world/shared";

/** Probabilidad de que no pique nada en un intento. */
export const NOTHING_CHANCE = 0.2;

/** Resultado de un intento de pesca, decidido al tirar la línea. */
export interface CatchRoll {
  fish: FishItem | null;
  /** Cuánto hay que esperar hasta saber el resultado. */
  durationMs: number;
}

/**
 * Sortea qué pica: nada (`NOTHING_CHANCE`) o un pez según su `catchWeight` (los fáciles pican más).
 * La espera crece con la dificultad: un pez difícil tarda más en picar.
 */
export function rollCatch(random: () => number = Math.random): CatchRoll {
  if (random() < NOTHING_CHANCE) {
    return { fish: null, durationMs: 4000 + Math.floor(random() * 3000) };
  }
  const total = FISH.reduce((sum, fish) => sum + fish.catchWeight, 0);
  let roll = random() * total;
  let picked = FISH[FISH.length - 1];
  for (const fish of FISH) {
    roll -= fish.catchWeight;
    if (roll < 0) {
      picked = fish;
      break;
    }
  }
  return { fish: picked, durationMs: 2500 + picked.difficulty * 800 + Math.floor(random() * 2500) };
}
