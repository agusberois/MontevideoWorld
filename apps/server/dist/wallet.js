"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const shared_1 = require("@montevideo-world/shared");
/**
 * Saldo de un jugador. Vive sólo en el servidor (estado privado de la Room) y se le manda a su
 * dueño con `MessageType.Wallet`. Toda operación valida el monto y nunca deja el saldo negativo
 * ni por encima de `MAX_MONEY`: si no se puede, no cambia nada y devuelve false.
 *
 * Uso previsto en tiendas: `if (!wallet.debit(price)) return;` → entregar el ítem → mandar saldo
 * e inventario actualizados.
 */
class Wallet {
    constructor(initial = shared_1.STARTING_MONEY) {
        this.amount = initial;
    }
    get balance() {
        return this.amount;
    }
    canAfford(amount) {
        return (0, shared_1.isValidAmount)(amount) && amount <= this.amount;
    }
    /** Cobrar (p. ej. vender algo): suma `amount` si es válido y no pasa el tope. */
    credit(amount) {
        if (!(0, shared_1.isValidAmount)(amount) || this.amount + amount > shared_1.MAX_MONEY)
            return false;
        this.amount += amount;
        return true;
    }
    /** Pagar (p. ej. comprar algo): resta `amount` si es válido y alcanza el saldo. */
    debit(amount) {
        if (!this.canAfford(amount))
            return false;
        this.amount -= amount;
        return true;
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map