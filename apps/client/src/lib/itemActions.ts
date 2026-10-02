import { InventoryMessage, ItemDefinition, OutfitIds, edibleLabel, edibleValue } from "@montevideo-world/shared";
import { eventBus } from "./eventBus";
import { openPanel } from "./gameStore";
import { CityRoom, sendBoxOpen, sendEquip, sendFoodEat, sendFishing, sendVending } from "./network";

/**
 * Qué hace cada tipo de ítem al usarlo desde la barra rápida (tecla 1–9 o clic). Es el único lugar
 * con esa lógica: para un tipo de ítem nuevo, sumar su caso en `itemAction`.
 */

export interface ItemActionContext {
  room: CityRoom;
  outfit: OutfitIds | null;
  inventory: InventoryMessage | null;
  /** Si el avatar propio está en la escollera y si tiene la línea en el agua. */
  fishing: { canFish: boolean; fishing: boolean };
  /** Si el avatar propio está en la explanada del Centenario y si está vendiendo. */
  vending: { canVend: boolean; vending: boolean };
}

export interface ItemAction {
  /** Qué va a pasar, para el tooltip: "ponértela", "comerlo (+10 de energía)"… */
  label: string;
  run: () => void;
}

/** Unidades de `itemId` en la mochila (sumando todas sus pilas). */
export function countInBag(inventory: InventoryMessage | null, itemId: string): number {
  return inventory?.stacks.filter((stack) => stack.itemId === itemId).reduce((total, stack) => total + stack.quantity, 0) ?? 0;
}

/** Si la prenda está puesta (sólo ropa). */
export function isWorn(item: ItemDefinition, outfit: OutfitIds | null): boolean {
  return item.category === "clothing" && outfit?.[item.slot] === item.id;
}

/** La acción de este ítem ahora mismo, o null si no se puede usar (p. ej. no lo tenés). */
export function itemAction(item: ItemDefinition, context: ItemActionContext): ItemAction | null {
  const { room, outfit, inventory, fishing, vending } = context;
  const inBag = countInBag(inventory, item.id) > 0;

  switch (item.category) {
    case "clothing":
      if (isWorn(item, outfit)) return { label: "sacártela", run: () => sendEquip(room, item.slot, null) };
      return inBag ? { label: "ponértela", run: () => sendEquip(room, item.slot, item.id) } : null;
    case "rod":
      // Se pesca con la mejor caña de la mochila; el atajo es lo mismo que la tecla F.
      if (!inBag) return null;
      if (fishing.fishing) return { label: "recoger la línea", run: () => sendFishing(room, "stop") };
      if (fishing.canFish) return { label: "pescar", run: () => sendFishing(room, "cast") };
      return {
        label: "pescar (parado en la escollera)",
        run: () => eventBus.emit("notice", { text: "Para pescar parate en la Escollera Sarandí." }),
      };
    case "cart":
      // Se vende con el mejor carrito de la mochila; el atajo es lo mismo que la tecla F en la explanada.
      if (!inBag) return null;
      if (vending.vending) return { label: "dejar de vender", run: () => sendVending(room, "stop") };
      if (vending.canVend) return { label: "vender", run: () => sendVending(room, "start") };
      return {
        label: "vender (en la explanada del Centenario)",
        run: () => eventBus.emit("notice", { text: "Para vender parate en la Explanada del Centenario, en Tres Cruces." }),
      };
    case "fish":
    case "food":
    case "medicine": {
      // Pescados y comida se comen (llenan el hambre y dan energía); los remedios se toman (curan).
      const value = edibleValue(item);
      const verb = item.category === "medicine" ? "tomar" : "comer";
      return inBag && value ? { label: `${verb} (${edibleLabel(value)})`, run: () => sendFoodEat(room, item.id) } : null;
    }
    case "box":
      return inBag ? { label: "abrirla", run: () => sendBoxOpen(room, item.id) } : null;
    case "ticket":
      // Un boleto se usa al viajar: el atajo abre la lista de barrios (como la tecla M).
      return inBag ? { label: "elegir barrio", run: () => openPanel("cities") } : null;
  }
}
