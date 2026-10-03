"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JAIL_CITY_ID = exports.SPAWN_CITY_ID = exports.CITY_INFOS = void 0;
exports.isCityId = isCityId;
exports.getCityInfo = getCityInfo;
exports.shopsSelling = shopsSelling;
exports.whereToBuy = whereToBuy;
const info_1 = require("./barrioDeLosJudios/info");
const info_2 = require("./ciudadVieja/info");
const info_3 = require("./comcar/info");
const info_4 = require("./tresCruces/info");
/**
 * Lo liviano de cada barrio (nombre, edificios, tiendas), en el orden en que se muestran en la lista
 * (tecla M). Lo usa el navegador siempre; los mapas completos están en `@montevideo-world/shared/cities`
 * (server) y el cliente los descarga de a uno al entrar (`lib/cityMaps.ts`).
 */
exports.CITY_INFOS = [info_2.CIUDAD_VIEJA_INFO, info_4.TRES_CRUCES_INFO, info_1.BARRIO_DE_LOS_JUDIOS_INFO, info_3.COMCAR_INFO];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
exports.SPAWN_CITY_ID = info_2.CIUDAD_VIEJA_INFO.id;
/** Adonde va preso el que banea el admin (`/ban`): no se sale hasta cumplir. */
exports.JAIL_CITY_ID = info_3.COMCAR_INFO.id;
function isCityId(id) {
    return exports.CITY_INFOS.some((city) => city.id === id);
}
function getCityInfo(id) {
    return exports.CITY_INFOS.find((city) => city.id === id);
}
/** Dónde se vende `itemId` (p. ej. para decir dónde comprar boletos): tienda y barrio. */
function shopsSelling(itemId) {
    return exports.CITY_INFOS.flatMap((city) => city.shops.filter((shop) => shop.stock.includes(itemId)).map((shop) => ({ city, shop })));
}
/** "Agencia STM (Ciudad Vieja)": dónde se compra `itemId`, para los avisos. */
function whereToBuy(itemId) {
    return shopsSelling(itemId)
        .map(({ city, shop }) => `${shop.name} (${city.name})`)
        .join(" o ");
}
//# sourceMappingURL=info.js.map