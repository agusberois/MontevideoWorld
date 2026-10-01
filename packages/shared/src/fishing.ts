import { FISH, FishItem, RodItem } from "./items";

/**
 * Probabilidades de pesca según la caña. Las comparten el server (que sortea) y el cliente (que
 * las muestra en la tienda y la mochila), así lo que se ve es lo que de verdad pasa.
 */

export interface FishChance {
  fish: FishItem;
  /** Probabilidad (0–1) de que pique este pez en un intento, contando la de que no pique nada. */
  chance: number;
}

/** Peso de un pez con esta caña: los difíciles ganan `(1 + rareBoost)` por cada nivel de dificultad. */
export function catchWeight(fish: FishItem, rod: RodItem): number {
  return fish.catchWeight * Math.pow(1 + rod.rareBoost, fish.difficulty - 1);
}

/** Probabilidad de cada pez con esta caña (suman `1 - rod.nothingChance`). */
export function fishChances(rod: RodItem): FishChance[] {
  const total = FISH.reduce((sum, fish) => sum + catchWeight(fish, rod), 0);
  return FISH.map((fish) => ({ fish, chance: ((1 - rod.nothingChance) * catchWeight(fish, rod)) / total }));
}

/** Probabilidad de sacar algún pez de dificultad `minDifficulty` o más en un intento. */
export function rareChance(rod: RodItem, minDifficulty = 4): number {
  return fishChances(rod)
    .filter(({ fish }) => fish.difficulty >= minDifficulty)
    .reduce((sum, { chance }) => sum + chance, 0);
}

/** "12,5 %" con una cifra decimal si hace falta. */
export function formatPercent(chance: number): string {
  const value = Math.round(chance * 1000) / 10;
  return `${String(value).replace(".", ",")} %`;
}

/** Las ventajas de una caña en frases cortas, para la tienda y la mochila. */
export function rodPerks(rod: RodItem): string[] {
  const perks = [`Peces raros: ${formatPercent(rareChance(rod))}`, `Que no pique nada: ${formatPercent(rod.nothingChance)}`];
  if (rod.doubleChance > 0) perks.push(`Doble pesca (cuando pica): ${formatPercent(rod.doubleChance)}`);
  if (rod.waitFactor < 1) perks.push(`Pica ${Math.round((1 - rod.waitFactor) * 100)} % más rápido`);
  return perks;
}
