"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ITEM_SLOTS, InventoryMessage, OutfitIds, getItem } from "@montevideo-world/shared";
import { ItemIcon } from "./ItemIcon";

interface HotbarPickerProps {
  /** Casillero que se está configurando (0–8). */
  index: number;
  /** Lo que tiene ahora ese casillero (null = vacío). */
  current: string | null;
  inventory: InventoryMessage | null;
  outfit: OutfitIds | null;
  onPick: (itemId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Elegir qué va en un casillero de la barra rápida tocando, sin arrastrar (en celulares el arrastre
 * no existe). Se abre tocando un casillero vacío o manteniendo apretado uno lleno. Lista lo que
 * tenés: la ropa puesta y lo de la mochila, un botón por ítem.
 */
export function HotbarPicker({ index, current, inventory, outfit, onPick, onClose, onClear }: HotbarPickerProps) {
  const ids: string[] = [];
  for (const slot of ITEM_SLOTS) if (outfit?.[slot]) ids.push(outfit[slot]);
  for (const stack of inventory?.stacks ?? []) if (!ids.includes(stack.itemId)) ids.push(stack.itemId);
  const items = ids.map(getItem).filter((item) => item !== undefined);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // En el body: la barra rápida tiene `transform` y dentro de ella `position: fixed` no cubriría la pantalla.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal hotbar-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotbar-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="hotbar-picker-title">Casillero {index + 1}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="hotbar-picker-body">
          {items.length === 0 ? (
            <p className="backpack-hint">No tenés nada para poner. Conseguí algo (comprando, pescando…) y volvé.</p>
          ) : (
            <ul className="hotbar-picker-grid">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === current ? "active" : undefined}
                    onClick={() => onPick(item.id)}
                  >
                    <ItemIcon item={item} size={40} />
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {current && (
            <button type="button" className="hotbar-picker-clear" onClick={onClear}>
              Quitar el atajo
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
