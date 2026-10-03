import { CityMap } from "../map";
import { CityDefinition } from "./types";
/**
 * Entrada `@montevideo-world/shared/cities`: los barrios completos, con su mapa. La usa el server
 * (y el simulador de movimiento). El navegador no la importa: tiene lo liviano en la entrada
 * principal (`CITY_INFOS`) y descarga cada mapa al entrar (`apps/client/src/lib/cityMaps.ts`).
 */
export * from "./info";
export * from "./types";
export declare const CITIES: readonly CityDefinition[];
export declare function getCity(id: string): CityDefinition | undefined;
/** CityMap memoizado por barrio (el layout es inmutable). */
export declare function getCityMap(cityId: string): CityMap | undefined;
//# sourceMappingURL=index.d.ts.map