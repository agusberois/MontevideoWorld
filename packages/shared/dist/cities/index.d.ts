import { CityDefinition } from "./types";
export * from "./types";
/** Todos los barrios del juego, en el orden en que se muestran en la lista (tecla M). */
export declare const CITIES: readonly CityDefinition[];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
export declare const SPAWN_CITY_ID: string;
export declare function getCity(id: string): CityDefinition | undefined;
//# sourceMappingURL=index.d.ts.map