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
        /** Aspecto elegido al entrar (ver `appearance.ts`): sexo, índices de piel y color de pelo, peinado. */
        this.gender = "m";
        this.skin = 0;
        this.hairColor = 0;
        this.hairStyle = "short";
        /** Tile actual (coordenadas de grilla, no píxeles). */
        this.x = 0;
        this.y = 0;
        /** Sentado en el banco del tile actual. */
        this.sitting = false;
        /** Pescando desde la escollera (los demás lo ven con la caña). */
        this.fishing = false;
        /** Caña con la que está pescando (id de `RODS`; "" si no pesca): los demás la ven de su color. */
        this.rod = "";
        /** Vendiendo en la explanada del Centenario (los demás lo ven con su carrito). */
        this.vending = false;
        /** Carrito con el que está vendiendo (id de `CARTS`; "" si no vende): los demás lo ven de su color. */
        this.cart = "";
        /** Sube en cada venta: los clientes muestran "¡Vendido!" sobre el vendedor. */
        this.sales = 0;
        /** Sube en cada patada (a un picudo): los clientes animan la patada del avatar. */
        this.kicks = 0;
        /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `stamina.ts`. */
        this.stamina = 100;
        /** Donador: aporta plata al proyecto. Se muestra un distintivo arriba del nombre (lo pone el admin con /donador). */
        this.donor = false;
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
    (0, schema_1.type)("string")
], Player.prototype, "gender", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "skin", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "hairColor", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "hairStyle", void 0);
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
    (0, schema_1.type)("string")
], Player.prototype, "rod", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "vending", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "cart", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Player.prototype, "sales", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Player.prototype, "kicks", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "stamina", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "donor", void 0);
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