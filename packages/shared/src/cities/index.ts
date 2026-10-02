import { CIUDAD_VIEJA } from "./ciudadVieja";
import { COMCAR } from "./comcar";
import { TRES_CRUCES } from "./tresCruces";
import { CityDefinition, Shop } from "./types";

export * from "./types";

/** Todos los barrios del juego, en el orden en que se muestran en la lista (tecla M). */
export const CITIES: readonly CityDefinition[] = [CIUDAD_VIEJA, TRES_CRUCES, COMCAR];

/** Barrio donde aparece siempre el jugador al entrar al juego. */
export const SPAWN_CITY_ID = CIUDAD_VIEJA.id;

/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
export const JAIL_CITY_ID = COMCAR.id;

export function getCity(id: string): CityDefinition | undefined {
  return CITIES.find((city) => city.id === id);
}

/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
export function shopsSelling(itemId: string): Array<{ city: CityDefinition; shop: Shop }> {
  return CITIES.flatMap((city) => city.shops.filter((shop) => shop.stock.includes(itemId)).map((shop) => ({ city, shop })));
}

/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
export function whereToBuy(itemId: string): string {
  return shopsSelling(itemId)
    .map(({ city, shop }) => `${shop.name} (${city.name})`)
    .join(" o ");
}
