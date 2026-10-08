"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRILL_BURN_CHANCE = exports.GRILL_YIELD = exports.GRILLED_FISH_ID = void 0;
exports.catchWeight = catchWeight;
exports.fishChances = fishChances;
exports.rareChance = rareChance;
exports.catchValue = catchValue;
exports.formatPercent = formatPercent;
exports.rodPerks = rodPerks;
exports.grillYield = grillYield;
const items_1 = require("./items");
const money_1 = require("./money");
/** Peso de un pez con esta caña: los difíciles ganan `(1 + rareBoost)` por cada nivel de dificultad. */
function catchWeight(fish, rod) {
    return fish.catchWeight * Math.pow(1 + rod.rareBoost, fish.difficulty - 1);
}
/** Probabilidad de cada pez con esta caña (suman `1 - rod.nothingChance`). */
function fishChances(rod) {
    const total = items_1.FISH.reduce((sum, fish) => sum + catchWeight(fish, rod), 0);
    return items_1.FISH.map((fish) => ({ fish, chance: ((1 - rod.nothingChance) * catchWeight(fish, rod)) / total }));
}
/** Probabilidad de sacar algún pez de dificultad `minDifficulty` o más en un intento. */
function rareChance(rod, minDifficulty = 4) {
    return fishChances(rod)
        .filter(({ fish }) => fish.difficulty >= minDifficulty)
        .reduce((sum, { chance }) => sum + chance, 0);
}
/**
 * Plata que deja en promedio una tirada con esta caña: el precio de lo que pica en el Mercado del
 * Puerto (contando que no pique nada y la doble pesca).
 */
function catchValue(rod) {
    const single = fishChances(rod).reduce((sum, { fish, chance }) => sum + chance * fish.price, 0);
    return single * (1 + rod.doubleChance);
}
/** "12,5 %" con una cifra decimal si hace falta. */
function formatPercent(chance) {
    const value = Math.round(chance * 1000) / 10;
    return `${String(value).replace(".", ",")} %`;
}
/** Las ventajas de una caña en frases cortas, para la tienda y la mochila. */
function rodPerks(rod) {
    const perks = [`Peces raros: ${formatPercent(rareChance(rod))}`, `Que no pique nada: ${formatPercent(rod.nothingChance)}`];
    if (rod.doubleChance > 0)
        perks.push(`Doble pesca (cuando pica): ${formatPercent(rod.doubleChance)}`);
    if (rod.waitFactor < 1)
        perks.push(`Pica ${Math.round((1 - rod.waitFactor) * 100)} % más rápido`);
    perks.push(`Dura ${rod.maxUses} tiradas y rinde ~${(0, money_1.formatMoney)(Math.floor(catchValue(rod) * rod.maxUses))} en total`);
    return perks;
}
/**
 * La Parrilla del Mercado (`Shop.grill`, al lado del Mercado del Puerto): cada pescado de la mochila
 * se cocina y sale siempre **pescado a la plancha** (`GRILLED_FISH_ID`), más porciones cuanto más
 * difícil el pez (`GRILL_YIELD`): un bagre da una, una corvina negra, cinco. Pero cada porción se
 * puede **quemar** (`GRILL_BURN_CHANCE`): de 40 te quedan unas 34. Es gratis: es la forma de que el
 * pescador coma bien de lo que saca (ninguna tienda compra comida, así que no es negocio).
 */
exports.GRILLED_FISH_ID = "pescado-plancha";
exports.GRILL_YIELD = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5 };
/** Probabilidad de que se queme cada porción en la parrilla (el server la sortea porción por porción). */
exports.GRILL_BURN_CHANCE = 0.15;
/** Porciones de pescado a la plancha que salen de este pez. */
function grillYield(fish) {
    return exports.GRILL_YIELD[fish.difficulty];
}
//# sourceMappingURL=fishing.js.map