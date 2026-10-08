import { FISH, FishDifficulty, FishItem, RodItem } from "./items";
import { fasterLabel, oddsLabel } from "./odds";

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

/**
 * Plata que deja en promedio una tirada con esta caña: el precio de lo que pica en el Mercado del
 * Puerto (contando que no pique nada y la doble pesca).
 */
export function catchValue(rod: RodItem): number {
  const single = fishChances(rod).reduce((sum, { fish, chance }) => sum + chance * fish.price, 0);
  return single * (1 + rod.doubleChance);
}

/** "12,5 %" con una cifra decimal si hace falta. */
export function formatPercent(chance: number): string {
  const value = Math.round(chance * 1000) / 10;
  return `${String(value).replace(".", ",")} %`;
}

/** Las ventajas de una caña en frases cortas, para la tienda y la mochila. */
export function rodPerks(rod: RodItem): string[] {
  const perks = [`Peces raros: ${oddsLabel(rareChance(rod))}`, `Que no pique nada: ${oddsLabel(rod.nothingChance)}`];
  if (rod.doubleChance > 0) perks.push(`Doble pesca: ${oddsLabel(rod.doubleChance)}`);
  if (rod.waitFactor < 1) perks.push(`Pica ${fasterLabel(1 - rod.waitFactor)}`);
  perks.push(`Dura ${rod.maxUses} tiradas`);
  return perks;
}

/**
 * La Parrilla del Mercado (`Shop.grill`, al lado del Mercado del Puerto): cada pescado de la mochila
 * se cocina y sale siempre **pescado a la plancha** (`GRILLED_FISH_ID`), más porciones cuanto más
 * difícil el pez (`GRILL_YIELD`): un bagre da una, una corvina negra, cinco. Pero cada porción se
 * puede **quemar** (`GRILL_BURN_CHANCE`): de 40 te quedan unas 34. Es gratis: es la forma de que el
 * pescador coma bien de lo que saca (ninguna tienda compra comida, así que no es negocio).
 */
export const GRILLED_FISH_ID = "pescado-plancha";

export const GRILL_YIELD: Readonly<Record<FishDifficulty, number>> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5 };

/** Probabilidad de que se queme cada porción en la parrilla (el server la sortea porción por porción). */
export const GRILL_BURN_CHANCE = 0.15;

/** Porciones de pescado a la plancha que salen de este pez. */
export function grillYield(fish: FishItem): number {
  return GRILL_YIELD[fish.difficulty];
}

