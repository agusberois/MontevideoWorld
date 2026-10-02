"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Weevil = void 0;
const schema_1 = require("@colyseus/schema");
/**
 * Picudo rojo en el barrio (ver `weevils.ts`). Lo mueve el server; la posición es continua (se
 * arrastra en cualquier dirección, no de tile en tile) y viaja en centésimas de tile como entero
 * (`WEEVIL_POSITION_SCALE`, `weevilTile` para leerla): son lo que más se actualiza del barrio.
 */
class Weevil extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** Posición en centésimas de tile (`weevilTile` la pasa a tiles). */
        this.x = 0;
        this.y = 0;
        /** `WeevilMode` como su índice en `WEEVIL_MODES` (`weevilModeOf`): emerge, chase, leave, dead. */
        this.mode = 0;
        /** A quién persigue (sessionId) o "". */
        this.targetId = "";
        /** Sube en cada picadura: los clientes animan el mordisco y el "-2" sobre el picado. */
        this.bites = 0;
    }
}
exports.Weevil = Weevil;
__decorate([
    (0, schema_1.type)("uint16")
], Weevil.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Weevil.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Weevil.prototype, "mode", void 0);
__decorate([
    (0, schema_1.type)("string")
], Weevil.prototype, "targetId", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Weevil.prototype, "bites", void 0);
//# sourceMappingURL=Weevil.js.map