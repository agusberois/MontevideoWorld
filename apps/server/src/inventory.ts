import { INVENTORY_CAPACITY, InventoryStack, MAX_STACK, getItem, isTool, maxStack, stackUses, wornestStack } from "@montevideo-world/shared";

/**
 * Mochila de un jugador: casilleros con pilas de prendas iguales. Vive sólo en el servidor
 * (estado privado de la Room) y se le manda a su dueño con `MessageType.Inventory`.
 *
 * Las herramientas (cañas, carritos) no se apilan: cada una ocupa su casillero y lleva sus `uses`
 * restantes. Al gastar, vender o pasar una, se toma la más usada (`wornestStack`).
 */
export class Inventory {
  private readonly stacks: InventoryStack[] = [];

  constructor(readonly capacity = INVENTORY_CAPACITY) {}

  count(itemId: string): number {
    return this.stacks.filter((stack) => stack.itemId === itemId).reduce((total, stack) => total + stack.quantity, 0);
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
      this.stacks.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses) });
      return true;
    }
    const stack = this.stacks.find((s) => s.itemId === itemId && s.quantity < MAX_STACK);
    if (stack) {
      stack.quantity += 1;
      return true;
    }
    if (this.stacks.length >= this.capacity) return false;
    this.stacks.push({ itemId, quantity: 1 });
    return true;
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
    for (const { itemId, quantity, uses } of stacks) {
      const item = getItem(itemId);
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_STACK) continue;
      if (isTool(item)) {
        for (let i = 0; i < quantity && inventory.stacks.length < capacity; i += 1) {
          inventory.stacks.push({ itemId, quantity: 1, uses: validUses(uses, item.maxUses) });
        }
        continue;
      }
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

/** Usos entre 1 y el máximo de la herramienta; si no vino un valor válido, nueva. */
function validUses(uses: number | undefined, maxUses: number): number {
  return Number.isInteger(uses) && uses! >= 1 && uses! <= maxUses ? uses! : maxUses;
}
