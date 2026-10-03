import { INVENTORY_CAPACITY, InventoryStack, MAX_STACK, getItem, isTool, maxStack, stackUses, wornestStack } from "@montevideo-world/shared";

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
export class Inventory {
  private readonly stacks: InventoryStack[] = [];

  constructor(readonly capacity = INVENTORY_CAPACITY) {}

  count(itemId: string): number {
    let total = 0;
    for (const stack of this.stacks) if (stack.itemId === itemId) total += stack.quantity;
    return total;
  }

  /** ¿Entra una unidad más de `itemId`? (apilada en una pila existente o en un casillero libre) */
  canAdd(itemId: string): boolean {
    const limit = maxStack(getItem(itemId));
    return this.stacks.some((stack) => stack.itemId === itemId && stack.quantity < limit) || this.stacks.length < this.capacity;
  }

  /**
   * Suma una unidad: primero a una pila de la misma prenda, si no a un casillero nuevo. Una
   * herramienta va siempre a un casillero propio, con `uses` usos (nueva si no se indica).
   */
  add(itemId: string, uses?: number): boolean {
    const item = getItem(itemId);
    if (isTool(item)) {
      if (this.stacks.length >= this.capacity) return false;
      this.stacks.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses), slot: this.freeSlot() });
      return true;
    }
    const stack = this.stacks.find((s) => s.itemId === itemId && s.quantity < MAX_STACK);
    if (stack) {
      stack.quantity += 1;
      return true;
    }
    if (this.stacks.length >= this.capacity) return false;
    this.stacks.push({ itemId, quantity: 1, slot: this.freeSlot() });
    return true;
  }

  /**
   * Mover lo del casillero `from` al `to`: si está vacío, se muda; si hay la misma prenda (no
   * herramienta), se junta hasta llenar la pila; si no, se intercambian. Devuelve si cambió algo.
   */
  move(from: number, to: number): boolean {
    if (!this.isSlot(from) || !this.isSlot(to) || from === to) return false;
    const source = this.stacks.find((stack) => stack.slot === from);
    if (!source) return false;
    const target = this.stacks.find((stack) => stack.slot === to);
    if (!target) {
      source.slot = to;
      return true;
    }
    const room = maxStack(getItem(target.itemId)) - target.quantity;
    if (target.itemId === source.itemId && !isTool(getItem(source.itemId)) && room > 0) {
      const moved = Math.min(room, source.quantity);
      target.quantity += moved;
      source.quantity -= moved;
      if (source.quantity === 0) this.stacks.splice(this.stacks.indexOf(source), 1);
      return true;
    }
    source.slot = to;
    target.slot = from;
    return true;
  }

  private isSlot(slot: number): boolean {
    return Number.isInteger(slot) && slot >= 0 && slot < this.capacity;
  }

  /** El primer casillero sin nada (hay que chequear antes que quede lugar). */
  private freeSlot(): number {
    const used = new Set(this.stacks.map((stack) => stack.slot));
    let slot = 0;
    while (used.has(slot)) slot += 1;
    return slot;
  }

  /**
   * Saca una unidad (la herramienta más usada, si es una) y la devuelve con sus `uses`, para poder
   * pasarla a otra mochila tal cual; null si no había. La pila que queda vacía libera su casillero.
   */
  remove(itemId: string): InventoryStack | null {
    const stack = wornestStack(this.stacks, itemId);
    if (!stack) return null;
    stack.quantity -= 1;
    if (stack.quantity === 0) this.stacks.splice(this.stacks.indexOf(stack), 1);
    return stack.uses === undefined ? { itemId, quantity: 1 } : { itemId, quantity: 1, uses: stack.uses };
  }

  /** Usos de las `quantity` unidades de `itemId` que saldrían primero (sólo herramientas; si no, []). */
  nextUses(itemId: string, quantity = 1): number[] {
    if (!isTool(getItem(itemId))) return [];
    return this.stacks
      .filter((stack) => stack.itemId === itemId)
      .map(stackUses)
      .sort((a, b) => a - b)
      .slice(0, quantity);
  }

  /**
   * Gasta un uso de la herramienta `itemId` (la más usada). Devuelve los usos que le quedan (0 = se
   * rompió y se sacó de la mochila) o null si no había ninguna.
   */
  wear(itemId: string): number | null {
    const stack = wornestStack(this.stacks, itemId);
    if (!stack || !isTool(getItem(itemId))) return null;
    const left = stackUses(stack) - 1;
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
  static restore(stacks: readonly InventoryStack[], capacity = INVENTORY_CAPACITY): Inventory {
    const inventory = new Inventory(capacity);
    /** Casilleros guardados: se respetan si son válidos y no se repiten; si no, van al primero libre. */
    const taken = new Set<number>();
    const keepSlot = (slot: number | undefined, index: number) => {
      if (index > 0 || slot === undefined || !inventory.isSlot(slot) || taken.has(slot)) return undefined;
      taken.add(slot);
      return slot;
    };
    const restored: InventoryStack[] = [];
    for (const { itemId, quantity, uses, slot } of stacks) {
      const item = getItem(itemId);
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_STACK) continue;
      if (isTool(item)) {
        for (let i = 0; i < quantity && restored.length < capacity; i += 1) {
          restored.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses), slot: keepSlot(slot, i) });
        }
        continue;
      }
      if (restored.length >= capacity) break;
      restored.push({ itemId, quantity, slot: keepSlot(slot, 0) });
    }
    // Los guardados viejos (sin casillero) o repetidos ocupan los libres, en orden.
    for (const stack of restored) {
      if (stack.slot === undefined) {
        let free = 0;
        while (taken.has(free)) free += 1;
        stack.slot = free;
        taken.add(free);
      }
      inventory.stacks.push(stack);
    }
    return inventory;
  }

  /** Copia independiente, para simular cambios sin tocar la mochila real (p. ej. un intercambio). */
  clone(): Inventory {
    const copy = new Inventory(this.capacity);
    copy.stacks.push(...this.snapshot());
    return copy;
  }

  /** Copia serializable para mandar al cliente, en orden de casillero. */
  snapshot(): InventoryStack[] {
    return this.stacks.map((stack) => ({ ...stack })).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  }
}

/** Usos entre 1 y el máximo de la herramienta; si no vino un valor válido, nueva. */
function validUses(uses: number | undefined, maxUses: number): number {
  return Number.isInteger(uses) && uses! >= 1 && uses! <= maxUses ? uses! : maxUses;
}
