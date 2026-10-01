import { FishItem, RodItem, catchWeight, FISH } from "@montevideo-world/shared";

/** Resultado de un intento de pesca, decidido al tirar la línea. */
export interface CatchRoll {
  /** Lo que picó: nada, un pez o (con suerte y buena caña) dos. */
  fish: FishItem[];
  /** Cuánto hay que esperar hasta saber el resultado. */
  durationMs: number;
}

/**
 * Sortea qué pica con esta caña: nada (`rod.nothingChance`) o un pez según su peso con la caña
 * (`catchWeight`: las mejores favorecen a los difíciles). Si picó, con `rod.doubleChance` sale un
 * segundo pez. La espera crece con la dificultad del más difícil y se achica con `rod.waitFactor`.
 */
export function rollCatch(rod: RodItem, random: () => number = Math.random): CatchRoll {
  if (random() < rod.nothingChance) {
    return { fish: [], durationMs: Math.round((4000 + random() * 3000) * rod.waitFactor) };
  }
  const fish = [pickFish(rod, random)];
  if (random() < rod.doubleChance) fish.push(pickFish(rod, random));
  const hardest = Math.max(...fish.map((f) => f.difficulty));
  return { fish, durationMs: Math.round((2500 + hardest * 800 + random() * 2500) * rod.waitFactor) };
}

function pickFish(rod: RodItem, random: () => number): FishItem {
  const total = FISH.reduce((sum, fish) => sum + catchWeight(fish, rod), 0);
  let roll = random() * total;
  for (const fish of FISH) {
    roll -= catchWeight(fish, rod);
    if (roll < 0) return fish;
  }
  return FISH[FISH.length - 1];
}
