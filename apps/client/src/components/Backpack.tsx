"use client";

import {
  INVENTORY_CAPACITY,
  ITEM_SLOTS,
  ITEM_SLOT_LABELS,
  InventoryMessage,
  ItemSlot,
  OutfitIds,
  BoxItem,
  difficultyStars,
  fishStamina,
  formatMoney,
  getClothing,
  getItem,
  RodItem,
  CartItem,
  FishItem,
  bestCart,
  bestRod,
  cartPerks,
  cartStars,
  maxStack,
  stackUses,
  usesLabel,
  wornestStack,
  isBox,
  lootChances,
  rodPerks,
  rodStars,
} from "@montevideo-world/shared";
import { useState } from "react";
import { isItemDrag, readItemDrag, startItemDrag } from "@/lib/hotbar";
import { isTouchDevice } from "@/lib/viewport";
import { CityRoom, sendBoxOpen, sendEquip } from "@/lib/network";
import { ItemIcon, SlotPlaceholderIcon } from "./ItemIcon";
import { ToolWear } from "./ToolWear";
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
  /** Info del ítem tocado (cañas, carritos, pescados): en celulares no hay tooltips. */
  const [detail, setDetail] = useState<string | null>(null);
  // En pantallas táctiles el arrastre nativo no anda: la barra rápida se arma tocándola (HotbarPicker).
  const touch = isTouchDevice();
  const capacity = inventory?.capacity ?? INVENTORY_CAPACITY;
  const stacks = inventory?.stacks ?? [];
  /** Mismo criterio que el server: se apila sobre una pila igual o va a un casillero libre. */
  const canStore = (itemId: string) =>
    stacks.some((stack) => stack.itemId === itemId && stack.quantity < maxStack(getItem(itemId))) || stacks.length < capacity;
  const cells = Array.from({ length: capacity }, (_, index) => stacks[index]);

  const equip = (slot: ItemSlot, itemId: string | null) => sendEquip(room, slot, itemId);
  const hasBox = stacks.some((stack) => isBox(getItem(stack.itemId)));
  /**
   * La caña que se usa al pescar y el carrito con el que se vende: los de mayor nivel y, si hay
   * varios iguales, el más gastado (se termina uno antes de empezar el otro).
   */
  const bestRodItem = bestRod(stacks.map((stack) => stack.itemId));
  const rodInUse = bestRodItem && wornestStack(stacks, bestRodItem.id);
  const bestCartItem = bestCart(stacks.map((stack) => stack.itemId));
  const cartInUse = bestCartItem && wornestStack(stacks, bestCartItem.id);

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
                  draggable={Boolean(item) && !touch}
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
                      draggable={!touch}
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
                const inUse = stack === rodInUse;
                return (
                  <li key={`${stack.itemId}-${index}`} className={`backpack-cell${inUse ? " rod-in-use" : ""}`}>
                    <button
                      type="button"
                      className="backpack-cell-static"
                      draggable={!touch}
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      onClick={() => setDetail(rodTitle(item, inUse, stackUses(stack)))}
                      title={`${rodTitle(item, inUse, stackUses(stack))}. Arrastrala a la barra 1–9 para pescar con un atajo.`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                      {inUse && <span className="backpack-badge">En uso</span>}
                      <ToolWear item={item} uses={stackUses(stack)} />
                    </button>
                  </li>
                );
              }
              if (item.category === "cart") {
                const inUse = stack === cartInUse;
                return (
                  <li key={`${stack.itemId}-${index}`} className={`backpack-cell${inUse ? " rod-in-use" : ""}`}>
                    <button
                      type="button"
                      className="backpack-cell-static"
                      draggable={!touch}
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      onClick={() => setDetail(cartTitle(item, inUse, stackUses(stack)))}
                      title={`${cartTitle(item, inUse, stackUses(stack))}. Arrastralo a la barra 1–9 para vender con un atajo.`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                      {inUse && <span className="backpack-badge">En uso</span>}
                      <ToolWear item={item} uses={stackUses(stack)} />
                    </button>
                  </li>
                );
              }
              if (item.category === "fish") {
                // Los pescados se venden en el Mercado del Puerto o se comen desde la barra rápida.
                return (
                  <li key={`${stack.itemId}-${index}`} className="backpack-cell">
                    <button
                      type="button"
                      className="backpack-cell-static"
                      draggable={!touch}
                      onDragStart={(event) => startItemDrag(event, { itemId: item.id })}
                      onClick={() => setDetail(fishTitle(item))}
                      title={`${fishTitle(item)} Arrastralo a la barra 1–9 para comerlo.`}
                    >
                      <ItemIcon item={item} size={40} />
                      <span className="backpack-cell-name">{item.name}</span>
                      {qty}
                    </button>
                  </li>
                );
              }
              return (
                <li key={`${stack.itemId}-${index}`} className="backpack-cell">
                  <button
                    type="button"
                    draggable={!touch}
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
          {detail && (
            <p className="backpack-detail" role="status">
              {detail}
            </p>
          )}
          {stacks.length === 0 && <p className="backpack-hint">Vacía. Lo que te saques se guarda acá.</p>}
          {touch && stacks.length > 0 && (
            <p className="backpack-hint">Para la barra rápida, tocá un casillero vacío de la barra (o mantené apretado uno lleno).</p>
          )}
          {hasBox && (
            <p className="backpack-hint">🎁 Para abrir una caja sorpresa, tocala{touch ? "" : " o tirala fuera de la mochila"}.</p>
          )}
        </div>

        <footer className="key-hint">
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

/** "Caña de fibra ★★☆☆ (32/80 usos) — es la que usás al pescar. Peces raros: 6,6 % · …" */
function rodTitle(rod: RodItem, inUse: boolean, uses: number): string {
  const use = inUse ? "es la que usás al pescar" : "pescás con tu mejor caña (y la más gastada), no con esta";
  return `${rod.name} ${rodStars(rod.tier)} (${usesLabel(rod, uses)}) — ${use}. ${rodPerks(rod).join(" · ")}`;
}

/** "Carrito de panchos ★★★☆ (90/110 usos) — es el que usás al vender. Venta: $10–$16 · …" */
function cartTitle(cart: CartItem, inUse: boolean, uses: number): string {
  const use = inUse ? "es el que usás al vender" : "vendés con tu mejor carrito (y el más gastado), no con este";
  return `${cart.name} ${cartStars(cart.tier)} (${usesLabel(cart, uses)}) — ${use}. ${cartPerks(cart).join(" · ")}`;
}

/** "Corvina negra ★★★★★ — en el Mercado del Puerto lo pagan $60. Comerlo da +30 de energía." */
function fishTitle(fish: FishItem): string {
  return `${fish.name} ${difficultyStars(fish.difficulty)} — en el Mercado del Puerto lo pagan ${formatMoney(fish.price)}. Comerlo da +${fishStamina(fish.difficulty)} de energía.`;
}
