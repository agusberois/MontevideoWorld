import { CityMap } from "../map";
import { CIUDAD_VIEJA } from "./ciudadVieja/map";
import { COMCAR } from "./comcar/map";
import { TRES_CRUCES } from "./tresCruces/map";
import { CityDefinition, CityId } from "./types";

/**
 * Entrada `@montevideo-world/shared/cities`: los barrios completos, con su mapa. La usa el server
 * (y el simulador de movimiento). El navegador no la importa: tiene lo liviano en la entrada
 * principal (`CITY_INFOS`) y descarga cada mapa al entrar (`apps/client/src/lib/cityMaps.ts`).
 */
export * from "./info";
export * from "./types";

export const CITIES: readonly CityDefinition[] = [CIUDAD_VIEJA, TRES_CRUCES, COMCAR];

/** Un barrio por id (los tipos obligan a que estén todos los de `CITY_IDS`). */
const BY_ID: Record<CityId, CityDefinition> = { "ciudad-vieja": CIUDAD_VIEJA, "tres-cruces": TRES_CRUCES, comcar: COMCAR };

export function getCity(id: string): CityDefinition | undefined {
  // `hasOwn`: si no, "constructor" o "__proto__" devolvían algo de `Object.prototype` (el id viene del cliente).
  return Object.hasOwn(BY_ID, id) ? BY_ID[id as CityId] : undefined;
}

const cityMaps = new Map<string, CityMap>();

/** CityMap memoizado por barrio (el layout es inmutable). */
export function getCityMap(cityId: string): CityMap | undefined {
  let map = cityMaps.get(cityId);
  if (!map) {
    const city = getCity(cityId);
    if (!city) return undefined;
    map = new CityMap(city);
    cityMaps.set(cityId, map);
  }
  return map;
}
