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
exports.SPAWN_CITY_ID = exports.CITIES = void 0;
exports.getCity = getCity;
const ciudadVieja_1 = require("./ciudadVieja");
__exportStar(require("./types"), exports);
/** Todos los barrios del juego, en el orden en que se muestran en la lista (tecla M). */
exports.CITIES = [ciudadVieja_1.CIUDAD_VIEJA];
/** Barrio donde aparece siempre el jugador al entrar al juego. */
exports.SPAWN_CITY_ID = ciudadVieja_1.CIUDAD_VIEJA.id;
function getCity(id) {
    return exports.CITIES.find((city) => city.id === id);
}
//# sourceMappingURL=index.js.map