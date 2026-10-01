"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchWeight = catchWeight;
exports.fishChances = fishChances;
exports.rareChance = rareChance;
exports.formatPercent = formatPercent;
exports.rodPerks = rodPerks;
const items_1 = require("./items");
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
    return perks;
}
//# sourceMappingURL=fishing.js.map