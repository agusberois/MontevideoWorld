"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = void 0;
const schema_1 = require("@colyseus/schema");
const Player_1 = require("./Player");
const Weevil_1 = require("./Weevil");
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** Clave = sessionId del cliente. */
        this.players = new schema_1.MapSchema();
        /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
        this.minuteOfDay = 0;
        /**
         * Qué copia del barrio es esta sala (1 = la primera). Con una sala llena se abre otra copia del
         * mismo barrio; el HUD lo muestra para que no parezca que no hay nadie.
         */
        this.copy = 1;
        /** Partido que se juega ahora en el Centenario ("" = ninguno): lo ve todo el barrio (hinchas en el estadio). */
        this.match = "";
        /** Si el admin forzó el partido (`MatchMode`): para su panel. */
        this.matchMode = "auto";
        /** Picudos rojos sueltos en el barrio. Clave = id del picudo. */
        this.weevils = new schema_1.MapSchema();
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)({ map: Player_1.Player })
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("uint16")
], GameState.prototype, "minuteOfDay", void 0);
__decorate([
    (0, schema_1.type)("uint8")
], GameState.prototype, "copy", void 0);
__decorate([
    (0, schema_1.type)("string")
], GameState.prototype, "match", void 0);
__decorate([
    (0, schema_1.type)("string")
], GameState.prototype, "matchMode", void 0);
__decorate([
    (0, schema_1.type)({ map: Weevil_1.Weevil })
], GameState.prototype, "weevils", void 0);
//# sourceMappingURL=GameState.js.map