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
        /**
         * Aspecto elegido al entrar (ver `appearance.ts`): sexo, índices de piel y color de pelo, peinado,
         * índice del color de ojos, barba y lentes.
         */
        this.gender = "m";
        this.skin = 0;
        this.hairColor = 0;
        this.hairStyle = "short";
        this.eyeColor = 0;
        this.facialHair = "none";
        this.glasses = "none";
        /** Tile actual (coordenadas de grilla, no píxeles). */
        this.x = 0;
        this.y = 0;
        /** Sentado en el banco del tile actual. */
        this.sitting = false;
        /** Metido en el jacuzzi (el lugar del tile actual; las Termas del Donador): todos lo ven en el agua. */
        this.bathing = false;
        /** Pescando desde la escollera (los demás lo ven con la caña). */
        this.fishing = false;
        /** Caña con la que está pescando (id de `RODS`; "" si no pesca): los demás la ven de su color. */
        this.rod = "";
        /** Vendiendo en la explanada del Centenario (los demás lo ven con su carrito). */
        this.vending = false;
        /** Carrito con el que está vendiendo (id de `CARTS`; "" si no vende): los demás lo ven de su color. */
        this.cart = "";
        /** Tocando en la calle en el Centro (los demás lo ven con su instrumento y las notas). */
        this.busking = false;
        /** Instrumento con el que toca (id de `INSTRUMENTS`; "" si no toca). */
        this.instrument = "";
        /** Sube con cada propina: los clientes muestran la moneda cayendo en el estuche. */
        this.tips = 0;
        /** Mascota que lo sigue (id de `PETS`; "" = ninguna) y su nombre: todos la ven. */
        this.pet = "";
        this.petName = "";
        /** Preso en el COMCAR (`/ban`): segundos que le quedan (0 = libre). */
        this.jailLeft = 0;
        /** Sube en cada venta: los clientes muestran "¡Vendido!" sobre el vendedor. */
        this.sales = 0;
        /** Sube en cada patada (a un picudo): los clientes animan la patada del avatar. */
        this.kicks = 0;
        /** Gesto que está haciendo (id de `GESTURES`; "" = ninguno). Lo pone y lo saca el server (`systems/gestures.ts`). */
        this.gesture = "";
        /** Gesto de a dos (`PAIR_GESTURES`): con quién (sessionId) y si lo invitó él (en el mate, el que convida). */
        this.gesturePartner = "";
        this.gestureLead = false;
        /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `needs.ts`. */
        this.energy = 100;
        /** Cansado: camina `TIRED_STEP_TICKS` veces más lento (lo decide el server; todos lo ven así). */
        this.tired = false;
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
], Player.prototype, "eyeColor", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "facialHair", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "glasses", void 0);
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
], Player.prototype, "bathing", void 0);
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
    (0, schema_1.type)("boolean")
], Player.prototype, "busking", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "instrument", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Player.prototype, "tips", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "pet", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "petName", void 0);
__decorate([
    (0, schema_1.type)("uint32")
], Player.prototype, "jailLeft", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Player.prototype, "sales", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], Player.prototype, "kicks", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "gesture", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "gesturePartner", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "gestureLead", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], Player.prototype, "energy", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Player.prototype, "tired", void 0);
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