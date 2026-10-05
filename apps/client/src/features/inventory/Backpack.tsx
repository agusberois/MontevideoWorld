"use client";

import {
  ItemDefinition,
  InventoryStack,
  isTool,
  INVENTORY_CAPACITY,
  ITEM_SLOTS,
  ITEM_SLOT_LABELS,
  ItemSlot,
  BoxItem,
  difficultyStars,
  edibleLabel,
  edibleValue,
  FoodItem,
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
import { DragEvent, useRef, useState } from "react";
import { isItemDrag, readItemDrag, startItemDrag } from "@/features/inventory/hotbarStorage";
import { isTouchDevice } from "@/lib/viewport";
import { useGame } from "@/lib/gameStore";
import { sendBoxOpen, sendEquip, sendFoodEat, sendInventoryMove } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { ItemIcon, SlotPlaceholderIcon } from "./ItemIcon";
import { ToolWear } from "./ToolWear";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./inventory.module.css";

const cx = moduleClasses(styles);


/** Toque largo en celulares para levantar un casillero y moverlo. */
const LONG_PRESS_MS = 450;

/** Cómo se ve y qué hace un casillero de la mochila (ver `cellView`). */
interface CellView {
  onClick: () => void;
  title: string;
  ariaLabel?: string;
  /** Clase extra del casillero ("box", "rod-in-use"). */
  className?: string;
  /** El clic muestra la info del ítem (no lo usa). */
  showsDetail?: boolean;
  /** Es la herramienta con la que pescás o vendés ahora. */
  inUse?: boolean;
}

/**
 * Mochila (tecla I): arriba lo que tenés puesto, abajo una grilla de casilleros con un ítem (o una
 * pila de ítems iguales, ×2, ×3…) en cada uno. Clic en un casillero = ponértelo; "Quitar" lo guarda.
 * Las prendas se pueden arrastrar a la barra de acceso rápido (1–9).
 * Son intenciones: el server valida y la UI se actualiza con el Schema y el mensaje de inventario.
 */
export function Backpack({ room, onClose }: PanelProps) {
  const outfit = useGame((state) => state.outfit);
  const inventory = useGame((state) => state.inventory);
  /** Info del ítem tocado (cañas, carritos, pescados): en celulares no hay tooltips. */
  const [detail, setDetail] = useState<string | null>(null);
  // En pantallas táctiles el arrastre nativo no anda: la barra rápida se arma tocándola (HotbarPicker).
  const touch = isTouchDevice();
  const capacity = inventory?.capacity ?? INVENTORY_CAPACITY;
  const stacks = inventory?.stacks ?? [];
  /** Mismo criterio que el server: se apila sobre una pila igual o va a un casillero libre. */
  const canStore = (itemId: string) =>
    stacks.some((stack) => stack.itemId === itemId && stack.quantity < maxStack(getItem(itemId))) || stacks.length < capacity;
  /** Cada pila en su casillero (`slot`); si no trae uno (no debería), al primero libre. */
  const cells: Array<InventoryStack | undefined> = Array.from({ length: capacity }, () => undefined);
  for (const stack of stacks) {
    const slot = stack.slot !== undefined && stack.slot < capacity && !cells[stack.slot] ? stack.slot : cells.findIndex((cell) => !cell);
    if (slot >= 0) cells[slot] = stack;
  }
  /** Celulares: casillero "levantado" con un toque largo; el próximo toque lo deja en otro. */
  const [moving, setMoving] = useState<number | null>(null);
  /** Casillero sobre el que se está arrastrando algo de la mochila (para resaltarlo). */
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const moveTo = (from: number, to: number) => {
    if (from !== to) sendInventoryMove(room, from, to);
    setMoving(null);
  };
  /** Props de cada casillero para recibir lo que se arrastra desde otro casillero de la mochila. */
  const dropProps = (index: number) => ({
    onDragOver: (event: DragEvent) => {
      if (!isItemDrag(event)) return;
      event.preventDefault();
      setDropTarget(index);
    },
    onDragLeave: () => setDropTarget((current) => (current === index ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDropTarget(null);
      const drag = readItemDrag(event);
      if (drag?.fromBackpack !== undefined) moveTo(drag.fromBackpack, index);
    },
  });
  const cellClass = (index: number, extra?: string) =>
    ["backpack-cell", extra, moving === index && "moving", dropTarget === index && "drop-target"].filter(Boolean).join(" ");

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

  /**
   * Qué hace cada casillero según la categoría del ítem: ropa → ponérsela; caja → abrirla; caña,
   * carrito, pescado → mostrar su info (en celulares no hay tooltips). Una categoría nueva no
   * compila hasta tener su caso.
   */
  function cellView(item: ItemDefinition, stack: InventoryStack): CellView {
    const units = stack.quantity > 1 ? `, ${stack.quantity} unidades` : "";
    switch (item.category) {
      case "clothing":
        return {
          onClick: () => equip(item.slot, item.id),
          title: `${item.name} — clic para ponértelo, o arrastralo a la barra 1–9`,
          ariaLabel: `${item.name}${units}`,
        };
      case "box":
        return {
          className: "box",
          onClick: () => sendBoxOpen(room, item.id),
          title: boxTitle(item),
          ariaLabel: `${item.name}${units}: abrir`,
        };
      case "rod": {
        const inUse = stack === rodInUse;
        const text = rodTitle(item, inUse, stackUses(stack));
        return {
          className: inUse ? "rod-in-use" : undefined,
          showsDetail: true,
          inUse,
          onClick: () => setDetail(text),
          title: `${text}. Arrastrala a la barra 1–9 para pescar con un atajo.`,
        };
      }
      case "cart": {
        const inUse = stack === cartInUse;
        const text = cartTitle(item, inUse, stackUses(stack));
        return {
          className: inUse ? "rod-in-use" : undefined,
          showsDetail: true,
          inUse,
          onClick: () => setDetail(text),
          title: `${text}. Arrastralo a la barra 1–9 para vender con un atajo.`,
        };
      }
      case "ticket": {
        const text = `${item.name} — cada viaje en ómnibus a otro barrio usa uno. Se puede intercambiar.`;
        return {
          showsDetail: true,
          onClick: () => setDetail(text),
          title: `${text} Arrastralo a la barra 1–9 para abrir la lista de barrios.`,
        };
      }
      case "fish":
        // Los pescados se venden en el Mercado del Puerto o se comen desde la barra rápida (tocarlos
        // muestra su info: comerse uno caro por un toque sin querer sería feo).
        return {
          showsDetail: true,
          onClick: () => setDetail(fishTitle(item)),
          title: `${fishTitle(item)} Arrastralo a la barra 1–9 para comerlo.`,
        };
      case "food":
        return {
          onClick: () => sendFoodEat(room, item.id),
          title: `${foodTitle(item)} Clic para comerlo.`,
          ariaLabel: `Comer ${item.name}`,
        };
      case "medicine": {
        const value = edibleValue(item);
        return {
          onClick: () => sendFoodEat(room, item.id),
          title: `${item.name} — tomarlo: ${value ? edibleLabel(value) : ""}. Clic para tomarlo.`,
          ariaLabel: `Tomar ${item.name}`,
        };
      }
    }
  }

  return (
    <div
      className={cx("modal-backdrop")}
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
        className={cx("modal backpack")}
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

        <div className={cx("backpack-body")}>
          <h3>Puesto</h3>
          <ul className={cx("backpack-equipped")}>
            {ITEM_SLOTS.map((slot) => {
              const item = outfit?.[slot] ? getClothing(outfit[slot]) : undefined;
              return (
                <li
                  key={slot}
                  draggable={Boolean(item) && !touch}
                  onDragStart={(event) => item && startItemDrag(event, { itemId: item.id })}
                >
                  {item ? <ItemIcon item={item} /> : <SlotPlaceholderIcon slot={slot} />}
                  <span className={cx("backpack-slot")}>
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
            Inventario <span className={cx("backpack-capacity")}>{stacks.length}/{capacity}</span>
          </h3>
          <ul className={cx("backpack-grid")}>
            {cells.map((stack, index) => {
              const item = stack ? getItem(stack.itemId) : undefined;
              if (!stack || !item) {
                return (
                  <li
                    key={`empty-${index}`}
                    className={cx(cellClass(index, "empty"))}
                    {...dropProps(index)}
                    onClick={() => moving !== null && moveTo(moving, index)}
                  />
                );
              }
              const qty = stack.quantity > 1 && <span className={cx("backpack-qty")}>x{stack.quantity}</span>;
              const view = cellView(item, stack);
              return (
                <li key={`${stack.itemId}-${index}`} className={cx(cellClass(index, view.className))} {...dropProps(index)}>
                  <button
                    type="button"
                    className={cx(view.showsDetail ? "backpack-cell-static" : undefined)}
                    draggable={!touch}
                    onDragStart={(event) => {
                      cancelPress();
                      startItemDrag(event, { itemId: item.id, fromBackpack: index });
                    }}
                    onDragEnd={() => setDropTarget(null)}
                    onClick={() => {
                      // Después de un toque largo (que levantó el casillero) no se usa el ítem.
                      if (longPressed.current) {
                        longPressed.current = false;
                        return;
                      }
                      if (moving !== null) return moveTo(moving, index);
                      view.onClick();
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === "mouse") return;
                      longPressed.current = false;
                      cancelPress();
                      pressTimer.current = window.setTimeout(() => {
                        longPressed.current = true;
                        setMoving(index);
                      }, LONG_PRESS_MS);
                    }}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(event) => touch && event.preventDefault()}
                    title={view.title}
                    aria-label={view.ariaLabel}
                  >
                    <ItemIcon item={item} size={40} />
                    <span className={cx("backpack-cell-name")}>{item.name}</span>
                    {qty}
                    {view.inUse && <span className={cx("backpack-badge")}>En uso</span>}
                    {isTool(item) && <ToolWear item={item} uses={stackUses(stack)} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {detail && (
            <p className={cx("backpack-detail")} role="status">
              {detail}
            </p>
          )}
          {stacks.length === 0 && <p className={cx("backpack-hint")}>Vacía. Lo que te saques se guarda acá.</p>}
          {moving !== null ? (
            <p className={cx("backpack-hint")} role="status">
              Tocá el casillero donde lo querés poner (o el mismo para dejarlo donde está).
            </p>
          ) : (
            stacks.length > 0 && (
              <p className={cx("backpack-hint")}>
                {touch
                  ? "Para ordenar la mochila, mantené apretado un ítem y tocá dónde ponerlo. Para la barra rápida, tocá un casillero vacío de la barra (o mantené apretado uno lleno)."
                  : "Arrastrá los ítems para ordenarlos (sobre otro, se intercambian; sobre uno igual, se juntan) o a la barra rápida."}
              </p>
            )
          )}
          {hasBox && (
            <p className={cx("backpack-hint")}>🎁 Para abrir una caja sorpresa, tocala{touch ? "" : " o tirala fuera de la mochila"}.</p>
          )}
        </div>

        <footer className={cx("key-hint")}>
          Apretá <kbd>I</kbd> o <kbd>Esc</kbd> para cerrar
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
  const value = edibleValue(fish);
  return `${fish.name} ${difficultyStars(fish.difficulty)} — en el Mercado del Puerto lo pagan ${formatMoney(fish.price)}. Comerlo: ${value ? edibleLabel(value) : ""}.`;
}

function foodTitle(food: FoodItem): string {
  const value = edibleValue(food);
  return `${food.name} — comerlo: ${value ? edibleLabel(value) : ""}.`;
}
