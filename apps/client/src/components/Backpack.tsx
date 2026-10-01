"use client";

import {
  INVENTORY_CAPACITY,
  ITEM_SLOTS,
  ITEM_SLOT_LABELS,
  InventoryMessage,
  ItemSlot,
  MAX_STACK,
  OutfitIds,
  BoxItem,
  difficultyStars,
  fishStamina,
  formatMoney,
  getClothing,
  getItem,
  RodItem,
  bestRod,
  isBox,
  lootChances,
  rodPerks,
  rodStars,
} from "@montevideo-world/shared";
import { isItemDrag, readItemDrag, startItemDrag } from "@/lib/hotbar";
import { CityRoom, sendBoxOpen, sendEquip } from "@/lib/network";
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
  const hasBox = stacks.some((stack) => isBox(getItem(stack.itemId)));
  /** La caña que se usa al pescar: la de mayor nivel de la mochila. */
  const rodInUse = bestRod(stacks.map((stack) => stack.itemId));

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      // Tirar una caja fuera de la mochila (sobre el fondo, no sobre el panel) la abre.
      onDragOver={(event) => {
        if (event.target === event.currentTarget && isItemDrag(event)) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        const drag = readItemDrag(event);
        if (drag && isBox(getItem(drag.itemId))) sendBoxOpen(room, drag.itemId);
      }}
    >
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
              if (item.category === "box") {
                return (
                  <li key={`${stack.itemId}-${index}`} className="backpack-cell box">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      onClick={() => sendBoxOpen(room, item.id)}
                      title={boxTitle(item)}
                      aria-label={`${item.name}${stack.quantity > 1 ? `, ${stack.quantity} unidades` : ""}: abrir`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                    </button>
                  </li>
                );
              }
              if (item.category === "rod") {
                const inUse = item.id === rodInUse?.id;
                return (
                  <li key={`${stack.itemId}-${index}`} className={`backpack-cell${inUse ? " rod-in-use" : ""}`}>
                    <div
                      className="backpack-cell-static"
                      draggable
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      title={`${rodTitle(item, inUse)}. Arrastrala a la barra 1–9 para pescar con un atajo.`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                      {inUse && <span className="backpack-badge">En uso</span>}
                    </div>
                  </li>
                );
              }
              if (item.category === "fish") {
                // Los pescados se venden en el Mercado del Puerto o se comen desde la barra rápida.
                return (
                  <li key={`${stack.itemId}-${index}`} className="backpack-cell">
                    <div
                      className="backpack-cell-static"
                      draggable
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      title={`${item.name} ${difficultyStars(item.difficulty)} — en el Mercado del Puerto lo pagan ${formatMoney(item.price)}. Arrastralo a la barra 1–9 para comerlo (+${fishStamina(item.difficulty)} de energía).`}
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
          {hasBox && (
            <p className="backpack-hint">🎁 Para abrir una caja sorpresa, hacé clic o tirala fuera de la mochila.</p>
          )}
        </div>

        <footer>
          Apretá <kbd>H</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

/** "Caja sorpresa — puede salir: Pejerrey 25 %, …" (las probabilidades reales del server). */
function boxTitle(box: BoxItem): string {
  const odds = lootChances(box)
    .map(({ item, chance }) => `${item.name} ${Math.round(chance * 100)} %`)
    .join(", ");
  return `${box.name} — clic o tirala fuera de la mochila para abrirla. Puede salir: ${odds}`;
}

/** "Caña de fibra ★★☆☆ — se usa al pescar. Peces raros: 6,6 % · …" */
function rodTitle(rod: RodItem, inUse: boolean): string {
  const use = inUse ? "es la que usás al pescar" : "pescás con tu mejor caña, no con esta";
  return `${rod.name} ${rodStars(rod.tier)} — ${use}. ${rodPerks(rod).join(" · ")}`;
}
