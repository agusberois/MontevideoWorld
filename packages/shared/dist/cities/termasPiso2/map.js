"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMAS_PISO_2 = void 0;
const map_1 = require("../termas/map");
const info_1 = require("./info");
/** El piso 2: el mismo spa, sólo con la escalera para bajar (la salida a la calle está abajo). */
exports.TERMAS_PISO_2 = (0, map_1.spaFloor)(info_1.TERMAS_PISO_2_INFO, [{ id: "escalera", name: "Bajar a la planta baja", area: map_1.STAIRS_AREA, to: { cityId: "termas", at: map_1.STAIRS_ARRIVAL }, access: "donor", stairs: "down" }], 
// Sin pase (volver a entrar al juego acá sin tile guardado): al pie de la escalera.
{ x: 1, y: 3, width: 3, height: 1 });
//# sourceMappingURL=map.js.map