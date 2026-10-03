"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CITIES = void 0;
exports.getCity = getCity;
exports.getCityMap = getCityMap;
const map_1 = require("../map");
const map_2 = require("./ciudadVieja/map");
const map_3 = require("./comcar/map");
const map_4 = require("./tresCruces/map");
/**
 * Entrada `@montevideo-world/shared/cities`: los barrios completos, con su mapa. La usa el server
 * (y el simulador de movimiento). El navegador no la importa: tiene lo liviano en la entrada
 * principal (`CITY_INFOS`) y descarga cada mapa al entrar (`apps/client/src/lib/cityMaps.ts`).
 */
__exportStar(require("./info"), exports);
__exportStar(require("./types"), exports);
exports.CITIES = [map_2.CIUDAD_VIEJA, map_4.TRES_CRUCES, map_3.COMCAR];
/** Un barrio por id (los tipos obligan a que estén todos los de `CITY_IDS`). */
const BY_ID = { "ciudad-vieja": map_2.CIUDAD_VIEJA, "tres-cruces": map_4.TRES_CRUCES, comcar: map_3.COMCAR };
function getCity(id) {
    return BY_ID[id];
}
const cityMaps = new Map();
/** CityMap memoizado por barrio (el layout es inmutable). */
function getCityMap(cityId) {
    let map = cityMaps.get(cityId);
    if (!map) {
        const city = getCity(cityId);
        if (!city)
            return undefined;
        map = new map_1.CityMap(city);
        cityMaps.set(cityId, map);
    }
    return map;
}
//# sourceMappingURL=index.js.map