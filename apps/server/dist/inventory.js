"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
const shared_1 = require("@montevideo-world/shared");
/**
 * Mochila de un jugador: casilleros con pilas de prendas iguales. Vive sólo en el servidor
 * (estado privado de la Room) y se le manda a su dueño con `MessageType.Inventory`.
 *
 * Cada pila sabe en qué casillero está (`slot`): lo nuevo va al primer casillero libre y el jugador
 * los reordena con `move` (puede haber huecos). Una pila que se vacía libera su casillero.
 *
 * Las herramientas (cañas, carritos) no se apilan: cada una ocupa su casillero y lleva sus `uses`
 * restantes. Al gastar, vender o pasar una, se toma la más usada (`wornestStack`).
 */
class Inventory {
    constructor(capacity = shared_1.INVENTORY_CAPACITY) {
        this.capacity = capacity;
        this.stacks = [];
    }
    count(itemId) {
        let total = 0;
        for (const stack of this.stacks)
            if (stack.itemId === itemId)
                total += stack.quantity;
        return total;
    }
    /** ¿Entra una unidad más de `itemId`? (apilada en una pila existente o en un casillero libre) */
    canAdd(itemId) {
        const limit = (0, shared_1.maxStack)((0, shared_1.getItem)(itemId));
        return this.stacks.some((stack) => stack.itemId === itemId && stack.quantity < limit) || this.stacks.length < this.capacity;
    }
    /**
     * Suma una unidad: primero a una pila de la misma prenda, si no a un casillero nuevo. Una
     * herramienta va siempre a un casillero propio, con `uses` usos (nueva si no se indica).
     */
    add(itemId, uses) {
        const item = (0, shared_1.getItem)(itemId);
        if ((0, shared_1.isTool)(item)) {
            if (this.stacks.length >= this.capacity)
                return false;
            this.stacks.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses), slot: this.freeSlot() });
            return true;
        }
        const stack = this.stacks.find((s) => s.itemId === itemId && s.quantity < shared_1.MAX_STACK);
        if (stack) {
            stack.quantity += 1;
            return true;
        }
        if (this.stacks.length >= this.capacity)
            return false;
        this.stacks.push({ itemId, quantity: 1, slot: this.freeSlot() });
        return true;
    }
    /**
     * Mover lo del casillero `from` al `to`: si está vacío, se muda; si hay la misma prenda (no
     * herramienta), se junta hasta llenar la pila; si no, se intercambian. Devuelve si cambió algo.
     */
    move(from, to) {
        if (!this.isSlot(from) || !this.isSlot(to) || from === to)
            return false;
        const source = this.stacks.find((stack) => stack.slot === from);
        if (!source)
            return false;
        const target = this.stacks.find((stack) => stack.slot === to);
        if (!target) {
            source.slot = to;
            return true;
        }
        const room = (0, shared_1.maxStack)((0, shared_1.getItem)(target.itemId)) - target.quantity;
        if (target.itemId === source.itemId && !(0, shared_1.isTool)((0, shared_1.getItem)(source.itemId)) && room > 0) {
            const moved = Math.min(room, source.quantity);
            target.quantity += moved;
            source.quantity -= moved;
            if (source.quantity === 0)
                this.stacks.splice(this.stacks.indexOf(source), 1);
            return true;
        }
        source.slot = to;
        target.slot = from;
        return true;
    }
    isSlot(slot) {
        return Number.isInteger(slot) && slot >= 0 && slot < this.capacity;
    }
    /** El primer casillero sin nada (hay que chequear antes que quede lugar). */
    freeSlot() {
        const used = new Set(this.stacks.map((stack) => stack.slot));
        let slot = 0;
        while (used.has(slot))
            slot += 1;
        return slot;
    }
    /**
     * Saca una unidad (la herramienta más usada, si es una) y la devuelve con sus `uses`, para poder
     * pasarla a otra mochila tal cual; null si no había. La pila que queda vacía libera su casillero.
     */
    remove(itemId) {
        const stack = (0, shared_1.wornestStack)(this.stacks, itemId);
        if (!stack)
            return null;
        stack.quantity -= 1;
        if (stack.quantity === 0)
            this.stacks.splice(this.stacks.indexOf(stack), 1);
        return stack.uses === undefined ? { itemId, quantity: 1 } : { itemId, quantity: 1, uses: stack.uses };
    }
    /** Usos de las `quantity` unidades de `itemId` que saldrían primero (sólo herramientas; si no, []). */
    nextUses(itemId, quantity = 1) {
        if (!(0, shared_1.isTool)((0, shared_1.getItem)(itemId)))
            return [];
        return this.stacks
            .filter((stack) => stack.itemId === itemId)
            .map(shared_1.stackUses)
            .sort((a, b) => a - b)
            .slice(0, quantity);
    }
    /**
     * Gasta un uso de la herramienta `itemId` (la más usada). Devuelve los usos que le quedan (0 = se
     * rompió y se sacó de la mochila) o null si no había ninguna.
     */
    wear(itemId) {
        const stack = (0, shared_1.wornestStack)(this.stacks, itemId);
        if (!stack || !(0, shared_1.isTool)((0, shared_1.getItem)(itemId)))
            return null;
        const left = (0, shared_1.stackUses)(stack) - 1;
        if (left <= 0) {
            this.stacks.splice(this.stacks.indexOf(stack), 1);
            return 0;
        }
        stack.uses = left;
        return left;
    }
    /**
     * Mochila guardada (p. ej. al volver a entrar): sólo ítems del catálogo, cantidades válidas y
     * hasta `capacity` casilleros; lo que no cumple se descarta. Las herramientas se separan de a una
     * (las guardadas antes de que se gastaran vuelven nuevas) y sus usos se validan.
     */
    static restore(stacks, capacity = shared_1.INVENTORY_CAPACITY) {
        const inventory = new Inventory(capacity);
        /** Casilleros guardados: se respetan si son válidos y no se repiten; si no, van al primero libre. */
        const taken = new Set();
        const keepSlot = (slot, index) => {
            if (index > 0 || slot === undefined || !inventory.isSlot(slot) || taken.has(slot))
                return undefined;
            taken.add(slot);
            return slot;
        };
        const restored = [];
        for (const { itemId, quantity, uses, slot } of stacks) {
            const item = (0, shared_1.getItem)(itemId);
            if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > shared_1.MAX_STACK)
                continue;
            if ((0, shared_1.isTool)(item)) {
                for (let i = 0; i < quantity && restored.length < capacity; i += 1) {
                    restored.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses), slot: keepSlot(slot, i) });
                }
                continue;
            }
            if (restored.length >= capacity)
                break;
            restored.push({ itemId, quantity, slot: keepSlot(slot, 0) });
        }
        // Los guardados viejos (sin casillero) o repetidos ocupan los libres, en orden.
        for (const stack of restored) {
            if (stack.slot === undefined) {
                let free = 0;
                while (taken.has(free))
                    free += 1;
                stack.slot = free;
                taken.add(free);
            }
            inventory.stacks.push(stack);
        }
        return inventory;
    }
    /** Copia independiente, para simular cambios sin tocar la mochila real (p. ej. un intercambio). */
    clone() {
        const copy = new Inventory(this.capacity);
        copy.stacks.push(...this.snapshot());
        return copy;
    }
    /** Copia serializable para mandar al cliente, en orden de casillero. */
    snapshot() {
        return this.stacks.map((stack) => ({ ...stack })).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    }
}
exports.Inventory = Inventory;
/** Usos entre 1 y el máximo de la herramienta; si no vino un valor válido, nueva. */
function validUses(uses, maxUses) {
    return Number.isInteger(uses) && uses >= 1 && uses <= maxUses ? uses : maxUses;
}
//# sourceMappingURL=inventory.js.map