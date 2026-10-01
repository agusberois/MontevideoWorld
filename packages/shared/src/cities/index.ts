import { CIUDAD_VIEJA } from "./ciudadVieja";
import { TRES_CRUCES } from "./tresCruces";
import { CityDefinition } from "./types";

export * from "./types";

/** Todos los barrios del juego, en el orden en que se muestran en la lista (tecla M). */
export const CITIES: readonly CityDefinition[] = [CIUDAD_VIEJA, TRES_CRUCES];

/** Barrio donde aparece siempre el jugador al entrar al juego. */
export const SPAWN_CITY_ID = CIUDAD_VIEJA.id;

export function getCity(id: string): CityDefinition | undefined {
  return CITIES.find((city) => city.id === id);
}
