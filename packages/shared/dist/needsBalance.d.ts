import { FoodItem, ToolItem } from "./items";
/**
 * Balance de la comida (regla de `docs/finished/necesidades-del-personaje.md`): comer tiene que
 * costar una parte chica de lo que se gana trabajando, como mucho `MAX_FOOD_SHARE` de lo que deja
 * por hora cada herramienta. El server avisa al arrancar (`[Balance] …`) si alguna se pasa.
 *
 * Son estimaciones gruesas (para detectar un precio o un costo que se fue de mambo, no para
 * predecir lo que gana un jugador): una hora de trabajo con ~300 tiles caminados y ~30 tiradas o
 * ventas por la hora de hambre "de esfuerzo", y el resto del tiempo usando la herramienta.
 */
export declare const MAX_FOOD_SHARE = 0.15;
/**
 * Saciedad que se gasta en una hora trabajando: la del tiempo (por `hungerFactor`, el del clima:
 * con calor da más hambre) más la del esfuerzo.
 */
export declare function workHungerPerHour(hungerFactor?: number): number;
/** La comida que llena más barato (pesos por punto de saciedad). */
export declare function cheapestFood(): {
    food: FoodItem;
    costPerPoint: number;
};
/** Lo que cuesta comer una hora de trabajo, con la comida más barata. */
export declare function foodCostPerHour(hungerFactor?: number): number;
/** Plata por hora que deja una herramienta, descontando lo que se gasta (su precio repartido en sus usos). */
export declare function hourlyIncome(tool: ToolItem): number;
/**
 * Herramientas con las que comer se lleva más de `MAX_FOOD_SHARE` de lo que se gana. Tiene que estar
 * vacía. Se mide con el clima que más hambre da (`hungerFactor`), que es el peor caso.
 */
export declare function foodTooExpensiveFor(hungerFactor?: number): Array<{
    tool: ToolItem;
    share: number;
}>;
//# sourceMappingURL=needsBalance.d.ts.map