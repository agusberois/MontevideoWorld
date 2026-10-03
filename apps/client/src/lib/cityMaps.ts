import { CityDefinition, CityId, CityMap, isCityId } from "@montevideo-world/shared";

/**
 * Mapas de los barrios, descargados de a uno: cada `import()` es un chunk aparte, así el navegador
 * sólo baja el mapa del barrio al que entra (lo liviano de todos, `CITY_INFOS`, ya viene con la
 * entrada principal de shared). `joinCity` lo pide en paralelo con la conexión y la escena lo toma
 * ya cargado con `loadedCityMap`.
 *
 * Un barrio nuevo no compila hasta tener su línea acá (`Record<CityId, …>`).
 */
const LOADERS: Record<CityId, () => Promise<CityDefinition>> = {
  "ciudad-vieja": () => import("@montevideo-world/shared/cities/ciudadVieja").then((module) => module.CIUDAD_VIEJA),
  "tres-cruces": () => import("@montevideo-world/shared/cities/tresCruces").then((module) => module.TRES_CRUCES),
  comcar: () => import("@montevideo-world/shared/cities/comcar").then((module) => module.COMCAR),
};

const loaded = new Map<CityId, CityMap>();
const loading = new Map<CityId, Promise<CityMap>>();

/** Descarga (una sola vez) el mapa del barrio. Si falla, se puede volver a pedir. */
export function loadCityMap(cityId: string): Promise<CityMap> {
  if (!isCityId(cityId)) return Promise.reject(new Error(`Barrio desconocido: ${cityId}`));
  const ready = loaded.get(cityId);
  if (ready) return Promise.resolve(ready);
  let promise = loading.get(cityId);
  if (!promise) {
    promise = LOADERS[cityId]()
      .then((city) => {
        const map = new CityMap(city);
        loaded.set(cityId, map);
        return map;
      })
      .finally(() => loading.delete(cityId));
    loading.set(cityId, promise);
  }
  return promise;
}

/** El mapa ya descargado (lo usa la escena, que arranca después de `joinCity`). */
export function loadedCityMap(cityId: string): CityMap | undefined {
  return isCityId(cityId) ? loaded.get(cityId) : undefined;
}
