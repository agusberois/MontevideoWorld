import { CARTS, FOODS, FoodItem, INSTRUMENTS, RODS, ToolItem } from "./items";
import {
  BUSK_ENERGY_COST,
  FISH_ENERGY_COST,
  FISH_HUNGER_COST,
  HUNGER_PER_SECOND,
  SIT_ENERGY_REGEN,
  VEND_ENERGY_COST,
  WALK_HUNGER_COST,
} from "./needs";
import { valuePerUse } from "./tools";

/**
 * Balance de la comida (regla de `docs/finished/necesidades-del-personaje.md`): comer tiene que
 * costar una parte chica de lo que se gana trabajando, como mucho `MAX_FOOD_SHARE` de lo que deja
 * por hora cada herramienta. El server avisa al arrancar (`[Balance] …`) si alguna se pasa.
 *
 * Son estimaciones gruesas (para detectar un precio o un costo que se fue de mambo, no para
 * predecir lo que gana un jugador): una hora de trabajo con ~300 tiles caminados y ~30 tiradas o
 * ventas por la hora de hambre "de esfuerzo", y el resto del tiempo usando la herramienta.
 */

export const MAX_FOOD_SHARE = 0.15;

/**
 * Saciedad que se gasta en una hora trabajando: la del tiempo (por `hungerFactor`, el del clima:
 * con calor da más hambre) más la del esfuerzo.
 */
export function workHungerPerHour(hungerFactor = 1): number {
  return HUNGER_PER_SECOND * 3600 * hungerFactor + 300 * WALK_HUNGER_COST + 30 * FISH_HUNGER_COST;
}

/** La comida que llena más barato (pesos por punto de saciedad). */
export function cheapestFood(): { food: FoodItem; costPerPoint: number } {
  return FOODS.map((food) => ({ food, costPerPoint: food.price / food.hunger })).reduce((best, next) =>
    next.costPerPoint < best.costPerPoint ? next : best,
  );
}

/** Lo que cuesta comer una hora de trabajo, con la comida más barata. */
export function foodCostPerHour(hungerFactor = 1): number {
  return workHungerPerHour(hungerFactor) * cheapestFood().costPerPoint;
}

/**
 * Segundos promedio de un intento (tirada, venta o tema, ver `fishing.ts` / `vending.ts` /
 * `busking.ts` del server: una tirada tarda ~5,5 s, una venta ~4,5 s y un tema ~5 s, por el `waitFactor` de la herramienta) más lo que hay que
 * descansar sentado para reponer la energía que gasta.
 */
function secondsPerUse(tool: ToolItem): number {
  const [attempt, energy] = tool.category === "rod" ? [5.5, FISH_ENERGY_COST] : tool.category === "cart" ? [4.5, VEND_ENERGY_COST] : [5, BUSK_ENERGY_COST];
  return attempt * tool.waitFactor + energy / SIT_ENERGY_REGEN;
}

/** Plata por hora que deja una herramienta, descontando lo que se gasta (su precio repartido en sus usos). */
export function hourlyIncome(tool: ToolItem): number {
  const net = valuePerUse(tool) - tool.price / tool.maxUses;
  return (net * 3600) / secondsPerUse(tool);
}

/**
 * Herramientas con las que comer se lleva más de `MAX_FOOD_SHARE` de lo que se gana. Tiene que estar
 * vacía. Se mide con el clima que más hambre da (`hungerFactor`), que es el peor caso.
 */
export function foodTooExpensiveFor(hungerFactor = 1): Array<{ tool: ToolItem; share: number }> {
  const cost = foodCostPerHour(hungerFactor);
  return [...RODS, ...CARTS, ...INSTRUMENTS]
    .map((tool) => ({ tool, share: cost / hourlyIncome(tool) }))
    .filter(({ share }) => !(share > 0 && share <= MAX_FOOD_SHARE));
}
