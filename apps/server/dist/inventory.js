"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
const shared_1 = require("@montevideo-world/shared");
/**
 * Mochila de un jugador: casilleros con pilas de prendas iguales. Vive sólo en el servidor
 * (estado privado de la Room) y se le manda a su dueño con `MessageType.Inventory`.
 */
class Inventory {
    constructor(capacity = shared_1.INVENTORY_CAPACITY) {
        this.capacity = capacity;
        this.stacks = [];
    }
    count(itemId) {
        return this.stacks.filter((stack) => stack.itemId === itemId).reduce((total, stack) => total + stack.quantity, 0);
    }
    /** ¿Entra una unidad más de `itemId`? (apilada en una pila existente o en un casillero libre) */
    canAdd(itemId) {
        return this.stacks.some((stack) => stack.itemId === itemId && stack.quantity < shared_1.MAX_STACK) || this.stacks.length < this.capacity;
    }
    /** Suma una unidad: primero a una pila de la misma prenda, si no a un casillero nuevo. */
    add(itemId) {
        const stack = this.stacks.find((s) => s.itemId === itemId && s.quantity < shared_1.MAX_STACK);
        if (stack) {
            stack.quantity += 1;
            return true;
        }
        if (this.stacks.length >= this.capacity)
            return false;
        this.stacks.push({ itemId, quantity: 1 });
        return true;
    }
    /** Saca una unidad; la pila que queda vacía libera su casillero. */
    remove(itemId) {
        const index = this.stacks.findIndex((s) => s.itemId === itemId);
        if (index === -1)
            return false;
        const stack = this.stacks[index];
        stack.quantity -= 1;
        if (stack.quantity === 0)
            this.stacks.splice(index, 1);
        return true;
    }
    /** Copia serializable para mandar al cliente. */
    snapshot() {
        return this.stacks.map((stack) => ({ ...stack }));
    }
}
exports.Inventory = Inventory;
//# sourceMappingURL=inventory.js.map