import { BARRIO_DE_LOS_JUDIOS_INFO } from "./barrioDeLosJudios/info";
import { CENTRO_INFO } from "./centro/info";
import { CIUDAD_VIEJA_INFO } from "./ciudadVieja/info";
import { COMCAR_INFO } from "./comcar/info";
import { TERMAS_INFO } from "./termas/info";
import { CASINO_INFO } from "./casino/info";
import { TRES_CRUCES_INFO } from "./tresCruces/info";
import { CARTS } from "../items";
import { HOSPITAL_CITY_ID } from "../needs";
import { CityId, CityInfo, Shop } from "./types";

/**
 * Lo liviano de cada barrio (nombre, edificios, tiendas), en el orden en que se muestran en la lista
 * (tecla M). Lo usa el navegador siempre; los mapas completos están en `@montevideo-world/shared/cities`
 * (server) y el cliente los descarga de a uno al entrar (`lib/cityMaps.ts`).
 */
export const CITY_INFOS: readonly CityInfo[] = [CIUDAD_VIEJA_INFO, CENTRO_INFO, TRES_CRUCES_INFO, BARRIO_DE_LOS_JUDIOS_INFO, COMCAR_INFO, TERMAS_INFO, CASINO_INFO];

/** Barrio donde aparece siempre el jugador al entrar al juego. */
export const SPAWN_CITY_ID: CityId = CIUDAD_VIEJA_INFO.id;

/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
export const JAIL_CITY_ID: CityId = COMCAR_INFO.id;

/** Las Termas del Donador: sólo donadores y admin, por la puerta de Ciudad Vieja. */
export const TERMAS_CITY_ID: CityId = TERMAS_INFO.id;

/** ¿Se puede viajar en ómnibus a este barrio? (No a los de acceso restringido, que tienen puerta, ni a los ocultos.) */
export function isPublicCity(city: CityInfo): boolean {
  return !city.access && !city.hidden;
}

/** ¿El barrio existe y no está oculto (`CityInfo.hidden`)? */
export function isCityOpen(id: string): boolean {
  const city = getCityInfo(id);
  return Boolean(city && !city.hidden);
}

/**
 * ¿Se puede vender con carrito? Sólo si hay abierta alguna tienda que venda carritos (hoy, el Kiosco
 * del Parque de Tres Cruces). Con Tres Cruces oculto no: se esconde todo lo de la venta (atajo, panel
 * del admin, textos).
 */
export function isVendingOpen(): boolean {
  return CARTS.some((cart) => shopsSelling(cart.id).length > 0);
}

/** ¿Está abierta la guardia (el Sanatorio Americano, en Tres Cruces)? Si no, no se la nombra ni hay ambulancia. */
export function isHospitalOpen(): boolean {
  return isCityOpen(HOSPITAL_CITY_ID);
}

export function isCityId(id: string): id is CityId {
  return CITY_INFOS.some((city) => city.id === id);
}

export function getCityInfo(id: string): CityInfo | undefined {
  return CITY_INFOS.find((city) => city.id === id);
}

/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
export function shopsSelling(itemId: string): Array<{ city: CityInfo; shop: Shop }> {
  return CITY_INFOS.filter((city) => !city.hidden).flatMap((city) => city.shops.filter((shop) => shop.stock.includes(itemId)).map((shop) => ({ city, shop })));
}

/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
export function whereToBuy(itemId: string): string {
  return shopsSelling(itemId)
    .map(({ city, shop }) => `${shop.name} (${city.name})`)
    .join(" o ");
}
