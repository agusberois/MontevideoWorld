import { FishItem, RodItem, catchWeight, FISH } from "@montevideo-world/shared";

/** Resultado de un intento de pesca, decidido al tirar la línea. */
export interface CatchRoll {
  /** Lo que picó: nada, un pez o (con suerte y buena caña) dos. */
  fish: FishItem[];
  /** Cuánto hay que esperar hasta saber el resultado. */
  durationMs: number;
}

/** Espera de una tirada antes de `waitFactor`: entre `MIN` y `MIN + SPREAD` ms (promedio 5,5 s, el que usa `needsBalance.ts`). */
const WAIT_MIN_MS = 3500;
const WAIT_SPREAD_MS = 4000;

/**
 * Sortea qué pica con esta caña: nada (`rod.nothingChance`) o un pez según su peso con la caña
 * (`catchWeight`: las mejores favorecen a los difíciles). Si picó, con `rod.doubleChance` sale un
 * segundo pez. La espera se sortea **aparte** del resultado y sólo la achica `rod.waitFactor`: el
 * cliente la recibe (`fish:started`) y cortar la pesca no cuesta nada, así que si dependiera de lo
 * que picó, se podría tirar y cortar hasta ver una espera "de pez difícil".
 */
export function rollCatch(rod: RodItem, random: () => number = Math.random): CatchRoll {
  const durationMs = Math.round((WAIT_MIN_MS + random() * WAIT_SPREAD_MS) * rod.waitFactor);
  if (random() < rod.nothingChance) return { fish: [], durationMs };
  const fish = [pickFish(rod, random)];
  if (random() < rod.doubleChance) fish.push(pickFish(rod, random));
  return { fish, durationMs };
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
