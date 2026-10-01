import { INVENTORY_CAPACITY, InventoryStack, MAX_STACK, getItem } from "@montevideo-world/shared";

/**
 * Mochila de un jugador: casilleros con pilas de prendas iguales. Vive sólo en el servidor
 * (estado privado de la Room) y se le manda a su dueño con `MessageType.Inventory`.
 */
export class Inventory {
  private readonly stacks: InventoryStack[] = [];

  constructor(readonly capacity = INVENTORY_CAPACITY) {}

  count(itemId: string): number {
    return this.stacks.filter((stack) => stack.itemId === itemId).reduce((total, stack) => total + stack.quantity, 0);
  }

  /** ¿Entra una unidad más de `itemId`? (apilada en una pila existente o en un casillero libre) */
  canAdd(itemId: string): boolean {
    return this.stacks.some((stack) => stack.itemId === itemId && stack.quantity < MAX_STACK) || this.stacks.length < this.capacity;
  }

  /** Suma una unidad: primero a una pila de la misma prenda, si no a un casillero nuevo. */
  add(itemId: string): boolean {
    const stack = this.stacks.find((s) => s.itemId === itemId && s.quantity < MAX_STACK);
    if (stack) {
      stack.quantity += 1;
      return true;
    }
    if (this.stacks.length >= this.capacity) return false;
    this.stacks.push({ itemId, quantity: 1 });
    return true;
  }

  /** Saca una unidad; la pila que queda vacía libera su casillero. */
  remove(itemId: string): boolean {
    const index = this.stacks.findIndex((s) => s.itemId === itemId);
    if (index === -1) return false;
    const stack = this.stacks[index];
    stack.quantity -= 1;
    if (stack.quantity === 0) this.stacks.splice(index, 1);
    return true;
  }

  /**
   * Mochila guardada (p. ej. al volver a entrar): sólo ítems del catálogo, cantidades válidas y
   * hasta `capacity` casilleros; lo que no cumple se descarta.
   */
  static restore(stacks: readonly InventoryStack[], capacity = INVENTORY_CAPACITY): Inventory {
    const inventory = new Inventory(capacity);
    for (const { itemId, quantity } of stacks) {
      if (!getItem(itemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_STACK) continue;
      if (inventory.stacks.length >= capacity) break;
      inventory.stacks.push({ itemId, quantity });
    }
    return inventory;
  }

  /** Copia independiente, para simular cambios sin tocar la mochila real (p. ej. un intercambio). */
  clone(): Inventory {
    const copy = new Inventory(this.capacity);
    copy.stacks.push(...this.snapshot());
    return copy;
  }

  /** Copia serializable para mandar al cliente. */
  snapshot(): InventoryStack[] {
    return this.stacks.map((stack) => ({ ...stack }));
  }
}
