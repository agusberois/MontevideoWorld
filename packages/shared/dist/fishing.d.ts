import { FishItem, RodItem } from "./items";
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
export declare function catchWeight(fish: FishItem, rod: RodItem): number;
/** Probabilidad de cada pez con esta caña (suman `1 - rod.nothingChance`). */
export declare function fishChances(rod: RodItem): FishChance[];
/** Probabilidad de sacar algún pez de dificultad `minDifficulty` o más en un intento. */
export declare function rareChance(rod: RodItem, minDifficulty?: number): number;
/**
 * Plata que deja en promedio una tirada con esta caña: el precio de lo que pica en el Mercado del
 * Puerto (contando que no pique nada y la doble pesca).
 */
export declare function catchValue(rod: RodItem): number;
/** "12,5 %" con una cifra decimal si hace falta. */
export declare function formatPercent(chance: number): string;
/** Las ventajas de una caña en frases cortas, para la tienda y la mochila. */
export declare function rodPerks(rod: RodItem): string[];
//# sourceMappingURL=fishing.d.ts.map