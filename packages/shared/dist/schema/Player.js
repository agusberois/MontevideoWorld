"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        this.name = "";
        this.color = "#ffffff";
        /** Tile actual (coordenadas de grilla, no píxeles). */
        this.x = 0;
        this.y = 0;
        /** Sentado en el banco del tile actual. */
        this.sitting = false;
        /** Pescando desde la escollera (los demás lo ven con la caña). */
        this.fishing = false;
        /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `stamina.ts`. */
        this.stamina = 100;
        /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
        this.admin = false;
        /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
        this.hat = "";
        this.top = "";
        this.bottom = "";
        this.shoes = "";
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "sitting", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "fishing", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "stamina", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "admin", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "hat", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "top", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "bottom", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "shoes", void 0);
//# sourceMappingURL=Player.js.map