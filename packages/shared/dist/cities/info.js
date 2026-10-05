"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS_CITY_ID = exports.JAIL_CITY_ID = exports.SPAWN_CITY_ID = exports.CITY_INFOS = void 0;
exports.isPublicCity = isPublicCity;
exports.isCityId = isCityId;
exports.getCityInfo = getCityInfo;
exports.shopsSelling = shopsSelling;
exports.whereToBuy = whereToBuy;
const info_1 = require("./barrioDeLosJudios/info");
const info_2 = require("./centro/info");
const info_3 = require("./ciudadVieja/info");
const info_4 = require("./comcar/info");
const info_5 = require("./termas/info");
const info_6 = require("./casino/info");
const info_7 = require("./tresCruces/info");
/**
 * Lo liviano de cada barrio (nombre, edificios, tiendas), en el orden en que se muestran en la lista
 * (tecla M). Lo usa el navegador siempre; los mapas completos están en `@montevideo-world/shared/cities`
 * (server) y el cliente los descarga de a uno al entrar (`lib/cityMaps.ts`).
 */
exports.CITY_INFOS = [info_3.CIUDAD_VIEJA_INFO, info_2.CENTRO_INFO, info_7.TRES_CRUCES_INFO, info_1.BARRIO_DE_LOS_JUDIOS_INFO, info_4.COMCAR_INFO, info_5.TERMAS_INFO, info_6.CASINO_INFO];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
exports.SPAWN_CITY_ID = info_3.CIUDAD_VIEJA_INFO.id;
/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
exports.JAIL_CITY_ID = info_4.COMCAR_INFO.id;
/** Las Termas del Donador: sólo donadores y admin, por la puerta de Ciudad Vieja. */
exports.TERMAS_CITY_ID = info_5.TERMAS_INFO.id;
/** ¿Se puede viajar en ómnibus a este barrio? (No a los de acceso restringido, que tienen puerta, ni a los ocultos.) */
function isPublicCity(city) {
    return !city.access && !city.hidden;
}
function isCityId(id) {
    return exports.CITY_INFOS.some((city) => city.id === id);
}
function getCityInfo(id) {
    return exports.CITY_INFOS.find((city) => city.id === id);
}
/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
function shopsSelling(itemId) {
    return exports.CITY_INFOS.filter((city) => !city.hidden).flatMap((city) => city.shops.filter((shop) => shop.stock.includes(itemId)).map((shop) => ({ city, shop })));
}
/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
function whereToBuy(itemId) {
    return shopsSelling(itemId)
        .map(({ city, shop }) => `${shop.name} (${city.name})`)
        .join(" o ");
}
//# sourceMappingURL=info.js.map