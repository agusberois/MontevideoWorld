import { FishDifficulty, FishItem, RodItem } from "./items";
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
/**
 * La Parrilla del Mercado (`Shop.grill`, al lado del Mercado del Puerto): cada pescado de la mochila
 * se cocina y sale siempre **pescado a la plancha** (`GRILLED_FISH_ID`), más porciones cuanto más
 * difícil el pez (`GRILL_YIELD`): un bagre da una, una corvina negra, cinco. Pero cada porción se
 * puede **quemar** (`GRILL_BURN_CHANCE`): de 40 te quedan unas 34. Es gratis: es la forma de que el
 * pescador coma bien de lo que saca (ninguna tienda compra comida, así que no es negocio).
 */
export declare const GRILLED_FISH_ID = "pescado-plancha";
export declare const GRILL_YIELD: Readonly<Record<FishDifficulty, number>>;
/** Probabilidad de que se queme cada porción en la parrilla (el server la sortea porción por porción). */
export declare const GRILL_BURN_CHANCE = 0.15;
/** Porciones de pescado a la plancha que salen de este pez. */
export declare function grillYield(fish: FishItem): number;
//# sourceMappingURL=fishing.d.ts.map