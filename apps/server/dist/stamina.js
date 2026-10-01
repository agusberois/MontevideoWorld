"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stamina = void 0;
const shared_1 = require("@montevideo-world/shared");
/**
 * Energía de un jugador con decimales (caminar gasta 0,6 por tile). Vive en la Room; al Schema
 * se copia el valor redondeado hacia abajo (`rounded`).
 *
 * Si una acción no alcanza, queda **agotado**: no puede gastar nada hasta recuperar
 * `EXHAUSTED_RECOVERY` (si no, cada tick de descanso alcanzaría para un paso más).
 */
class Stamina {
    constructor() {
        this.amount = shared_1.MAX_STAMINA;
        this.exhausted = false;
    }
    get rounded() {
        return Math.floor(this.amount);
    }
    has(cost) {
        return !this.exhausted && this.amount >= cost;
    }
    /** Gasta `cost` si alcanza; si no, queda agotado, no cambia nada y devuelve false. */
    spend(cost) {
        if (!this.has(cost)) {
            this.exhausted = true;
            return false;
        }
        this.amount -= cost;
        return true;
    }
    recover(amount) {
        this.amount = Math.min(shared_1.MAX_STAMINA, this.amount + amount);
        if (this.amount >= shared_1.EXHAUSTED_RECOVERY)
            this.exhausted = false;
    }
}
exports.Stamina = Stamina;
//# sourceMappingURL=stamina.js.map