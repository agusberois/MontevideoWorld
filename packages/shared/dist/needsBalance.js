"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FOOD_SHARE = void 0;
exports.workHungerPerHour = workHungerPerHour;
exports.cheapestFood = cheapestFood;
exports.foodCostPerHour = foodCostPerHour;
exports.hourlyIncome = hourlyIncome;
exports.foodTooExpensiveFor = foodTooExpensiveFor;
const items_1 = require("./items");
const needs_1 = require("./needs");
const tools_1 = require("./tools");
/**
 * Balance de la comida (regla de `docs/finished/necesidades-del-personaje.md`): comer tiene que
 * costar una parte chica de lo que se gana trabajando, como mucho `MAX_FOOD_SHARE` de lo que deja
 * por hora cada herramienta. El server avisa al arrancar (`[Balance] …`) si alguna se pasa.
 *
 * Son estimaciones gruesas (para detectar un precio o un costo que se fue de mambo, no para
 * predecir lo que gana un jugador): una hora de trabajo con ~300 tiles caminados y ~30 tiradas o
 * ventas por la hora de hambre "de esfuerzo", y el resto del tiempo usando la herramienta.
 */
exports.MAX_FOOD_SHARE = 0.15;
/**
 * Saciedad que se gasta en una hora trabajando: la del tiempo (por `hungerFactor`, el del clima:
 * con calor da más hambre) más la del esfuerzo.
 */
function workHungerPerHour(hungerFactor = 1) {
    return needs_1.HUNGER_PER_SECOND * 3600 * hungerFactor + 300 * needs_1.WALK_HUNGER_COST + 30 * needs_1.FISH_HUNGER_COST;
}
/** La comida que llena más barato (pesos por punto de saciedad). */
function cheapestFood() {
    return items_1.FOODS.map((food) => ({ food, costPerPoint: food.price / food.hunger })).reduce((best, next) => next.costPerPoint < best.costPerPoint ? next : best);
}
/** Lo que cuesta comer una hora de trabajo, con la comida más barata. */
function foodCostPerHour(hungerFactor = 1) {
    return workHungerPerHour(hungerFactor) * cheapestFood().costPerPoint;
}
/**
 * Segundos promedio de un intento (tirada, venta o tema, ver `fishing.ts` / `vending.ts` /
 * `busking.ts` del server: una tirada tarda ~5,5 s, una venta ~4,5 s y un tema ~5 s, por el `waitFactor` de la herramienta) más lo que hay que
 * descansar sentado para reponer la energía que gasta.
 */
function secondsPerUse(tool) {
    const [attempt, energy] = tool.category === "rod" ? [5.5, needs_1.FISH_ENERGY_COST] : tool.category === "cart" ? [4.5, needs_1.VEND_ENERGY_COST] : [5, needs_1.BUSK_ENERGY_COST];
    return attempt * tool.waitFactor + energy / needs_1.SIT_ENERGY_REGEN;
}
/** Plata por hora que deja una herramienta, descontando lo que se gasta (su precio repartido en sus usos). */
function hourlyIncome(tool) {
    const net = (0, tools_1.valuePerUse)(tool) - tool.price / tool.maxUses;
    return (net * 3600) / secondsPerUse(tool);
}
/**
 * Herramientas con las que comer se lleva más de `MAX_FOOD_SHARE` de lo que se gana. Tiene que estar
 * vacía. Se mide con el clima que más hambre da (`hungerFactor`), que es el peor caso.
 */
function foodTooExpensiveFor(hungerFactor = 1) {
    const cost = foodCostPerHour(hungerFactor);
    return [...items_1.RODS, ...items_1.CARTS, ...items_1.INSTRUMENTS]
        .map((tool) => ({ tool, share: cost / hourlyIncome(tool) }))
        .filter(({ share }) => !(share > 0 && share <= exports.MAX_FOOD_SHARE));
}
//# sourceMappingURL=needsBalance.js.map