import { CityId, CityInfo, Shop } from "./types";
/**
 * Lo liviano de cada barrio (nombre, edificios, tiendas), en el orden en que se muestran en la lista
 * (tecla M). Lo usa el navegador siempre; los mapas completos están en `@montevideo-world/shared/cities`
 * (server) y el cliente los descarga de a uno al entrar (`lib/cityMaps.ts`).
 */
export declare const CITY_INFOS: readonly CityInfo[];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
export declare const SPAWN_CITY_ID: CityId;
/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
export declare const JAIL_CITY_ID: CityId;
/** Las Termas del Donador: sólo donadores y admin, por la puerta de Ciudad Vieja. */
export declare const TERMAS_CITY_ID: CityId;
/** ¿Se puede viajar en ómnibus a este barrio? (No a los de acceso restringido, que tienen puerta, ni a los ocultos.) */
export declare function isPublicCity(city: CityInfo): boolean;
/** ¿El barrio existe y no está oculto (`CityInfo.hidden`)? */
export declare function isCityOpen(id: string): boolean;
/**
 * ¿Se puede vender con carrito? Sólo si hay abierta alguna tienda que venda carritos (hoy, el Kiosco
 * del Parque de Tres Cruces). Con Tres Cruces oculto no: se esconde todo lo de la venta (atajo, panel
 * del admin, textos).
 */
export declare function isVendingOpen(): boolean;
/** ¿Está abierta la guardia (el Sanatorio Americano, en Tres Cruces)? Si no, no se la nombra ni hay ambulancia. */
export declare function isHospitalOpen(): boolean;
export declare function isCityId(id: string): id is CityId;
export declare function getCityInfo(id: string): CityInfo | undefined;
/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
export declare function shopsSelling(itemId: string): Array<{
    city: CityInfo;
    shop: Shop;
}>;
/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
export declare function whereToBuy(itemId: string): string;
//# sourceMappingURL=info.d.ts.map