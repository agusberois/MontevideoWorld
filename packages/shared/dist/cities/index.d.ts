import { CityDefinition, Shop } from "./types";
export * from "./types";
/** Todos los barrios del juego, en el orden en que se muestran en la lista (tecla M). */
export declare const CITIES: readonly CityDefinition[];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
export declare const SPAWN_CITY_ID: string;
/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
export declare const JAIL_CITY_ID: string;
export declare function getCity(id: string): CityDefinition | undefined;
/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
export declare function shopsSelling(itemId: string): Array<{
    city: CityDefinition;
    shop: Shop;
}>;
/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
export declare function whereToBuy(itemId: string): string;
//# sourceMappingURL=index.d.ts.map