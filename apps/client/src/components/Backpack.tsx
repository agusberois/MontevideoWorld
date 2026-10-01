"use client";

import {
  INVENTORY_CAPACITY,
  ITEM_SLOTS,
  ITEM_SLOT_LABELS,
  InventoryMessage,
  ItemSlot,
  MAX_STACK,
  OutfitIds,
  difficultyStars,
  formatMoney,
  getClothing,
  getItem,
} from "@montevideo-world/shared";
import { startItemDrag } from "@/lib/hotbar";
import { CityRoom, sendEquip } from "@/lib/network";
import { ItemIcon, SlotPlaceholderIcon } from "./ItemIcon";
import { UiIcon } from "./UiIcon";

interface BackpackProps {
  room: CityRoom;
  /** Ropa puesta según el Schema (llega por el EventBus); null hasta que se sincroniza. */
  outfit: OutfitIds | null;
  /** Mochila según el server (mensaje privado); null hasta que llega. */
  inventory: InventoryMessage | null;
  onClose: () => void;
}

/**
 * Mochila (tecla H): arriba lo que tenés puesto, abajo una grilla de casilleros con un ítem (o una
 * pila de ítems iguales, ×2, ×3…) en cada uno. Clic en un casillero = ponértelo; "Quitar" lo guarda.
 * Las prendas se pueden arrastrar a la barra de acceso rápido (1–9).
 * Son intenciones: el server valida y la UI se actualiza con el Schema y el mensaje de inventario.
 */
export function Backpack({ room, outfit, inventory, onClose }: BackpackProps) {
  const capacity = inventory?.capacity ?? INVENTORY_CAPACITY;
  const stacks = inventory?.stacks ?? [];
  /** Mismo criterio que el server: se apila sobre una pila igual o va a un casillero libre. */
  const canStore = (itemId: string) =>
    stacks.some((stack) => stack.itemId === itemId && stack.quantity < MAX_STACK) || stacks.length < capacity;
  const cells = Array.from({ length: capacity }, (_, index) => stacks[index]);

  const equip = (slot: ItemSlot, itemId: string | null) => sendEquip(room, slot, itemId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal backpack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backpack-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="backpack-title">
            <UiIcon name="backpack" size={18} />
            Mochila
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="backpack-body">
          <h3>Puesto</h3>
          <ul className="backpack-equipped">
            {ITEM_SLOTS.map((slot) => {
              const item = outfit?.[slot] ? getClothing(outfit[slot]) : undefined;
              return (
                <li
                  key={slot}
                  draggable={Boolean(item)}
                  onDragStart={(event) => item && startItemDrag(event, { itemId: item.id })}
                >
                  {item ? <ItemIcon item={item} /> : <SlotPlaceholderIcon slot={slot} />}
                  <span className="backpack-slot">
                    <small>{ITEM_SLOT_LABELS[slot]}</small>
                    {item?.name ?? "Nada"}
                  </span>
                  <button
                    type="button"
                    disabled={!item || !canStore(item.id)}
                    title={item && !canStore(item.id) ? "La mochila está llena" : undefined}
                    onClick={() => equip(slot, null)}
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>

          <h3>
            Inventario <span className="backpack-capacity">{stacks.length}/{capacity}</span>
          </h3>
          <ul className="backpack-grid">
            {cells.map((stack, index) => {
              const item = stack ? getItem(stack.itemId) : undefined;
              if (!stack || !item) return <li key={`empty-${index}`} className="backpack-cell empty" />;
              const qty = stack.quantity > 1 && <span className="backpack-qty">x{stack.quantity}</span>;
              if (item.category === "fish") {
                // Los pescados no se usan: se venden en el Mercado del Puerto.
                return (
                  <li key={`${stack.itemId}-${index}`} className="backpack-cell">
                    <div
                      className="backpack-cell-static"
                      title={`${item.name} ${difficultyStars(item.difficulty)} — en el Mercado del Puerto lo pagan ${formatMoney(item.price)}`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                    </div>
                  </li>
                );
              }
              return (
                <li key={`${stack.itemId}-${index}`} className="backpack-cell">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                    onClick={() => equip(item.slot, item.id)}
                    title={`${item.name} — clic para ponértelo, o arrastralo a la barra 1–9`}
                    aria-label={`${item.name}${stack.quantity > 1 ? `, ${stack.quantity} unidades` : ""}`}
                  >
                    <ItemIcon item={item} size={40} />
                    <span className="backpack-cell-name">{item.name}</span>
                    {qty}
                  </button>
                </li>
              );
            })}
          </ul>
          {stacks.length === 0 && <p className="backpack-hint">Vacía. Lo que te saques se guarda acá.</p>}
        </div>

        <footer>
          Apretá <kbd>H</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
