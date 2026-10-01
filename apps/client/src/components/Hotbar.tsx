"use client";

import { useState } from "react";
import { InventoryMessage, OutfitIds, getClothing } from "@montevideo-world/shared";
import { HotbarSlots, isItemDrag, readItemDrag, startItemDrag } from "@/lib/hotbar";
import { ItemIcon } from "./ItemIcon";

interface HotbarProps {
  slots: HotbarSlots;
  outfit: OutfitIds | null;
  inventory: InventoryMessage | null;
  onChange: (slots: HotbarSlots) => void;
  /** Usar la prenda del casillero (tecla 1–9 o clic): ponérsela o sacársela. */
  onActivate: (index: number) => void;
}

/**
 * Barra de acceso rápido 1–9. Se configura arrastrando prendas desde la mochila; entre casilleros
 * se reordena arrastrando, y se saca un atajo arrastrándolo afuera o con clic derecho.
 * Cada casillero muestra si la prenda está puesta, cuántas hay en la mochila o si ya no la tenés.
 */
export function Hotbar({ slots, outfit, inventory, onChange, onActivate }: HotbarProps) {
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  function drop(index: number, itemId: string, fromHotbar?: number) {
    const next = [...slots];
    if (fromHotbar !== undefined) {
      [next[fromHotbar], next[index]] = [next[index], next[fromHotbar]];
    } else {
      // Una prenda ocupa un solo atajo: si ya estaba en otro casillero, se mueve.
      for (let i = 0; i < next.length; i++) if (next[i] === itemId) next[i] = null;
      next[index] = itemId;
    }
    onChange(next);
  }

  function clear(index: number) {
    const next = [...slots];
    next[index] = null;
    onChange(next);
  }

  return (
    <nav className="hotbar" aria-label="Acceso rápido">
      {slots.map((itemId, index) => {
        const item = itemId ? getClothing(itemId) : undefined;
        const worn = item ? outfit?.[item.slot] === item.id : false;
        const inBag = item ? (inventory?.stacks.filter((s) => s.itemId === item.id).reduce((n, s) => n + s.quantity, 0) ?? 0) : 0;
        const missing = Boolean(item) && !worn && inBag === 0;
        const classes = ["hotbar-slot", worn && "worn", missing && "missing", dropTarget === index && "drop-target"]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={index}
            type="button"
            className={classes}
            draggable={Boolean(item)}
            title={
              item
                ? `${item.name}${worn ? " (puesto)" : missing ? " (no la tenés)" : ""} — ${index + 1} o clic para ${worn ? "sacártela" : "ponértela"}. Clic derecho: quitar atajo`
                : `Casillero ${index + 1}: arrastrá una prenda desde la mochila`
            }
            onClick={() => item && onActivate(index)}
            onContextMenu={(event) => {
              event.preventDefault();
              if (item) clear(index);
            }}
            onDragStart={(event) => item && startItemDrag(event, { itemId: item.id, fromHotbar: index })}
            onDragEnd={(event) => {
              // Soltado fuera de la barra: se quita el atajo.
              if (event.dataTransfer.dropEffect === "none") clear(index);
            }}
            onDragOver={(event) => {
              if (!isItemDrag(event)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(index);
            }}
            onDragLeave={() => setDropTarget((current) => (current === index ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setDropTarget(null);
              const drag = readItemDrag(event);
              // Sólo ropa: es lo único que se "usa" (ponérsela / sacársela).
              if (drag && getClothing(drag.itemId)) drop(index, drag.itemId, drag.fromHotbar);
            }}
          >
            <span className="hotbar-key">{index + 1}</span>
            {item && <ItemIcon item={item} size={32} />}
            {inBag > 1 && <span className="hotbar-qty">x{inBag}</span>}
            {worn && <span className="hotbar-worn" aria-label="puesto" />}
          </button>
        );
      })}
    </nav>
  );
}
