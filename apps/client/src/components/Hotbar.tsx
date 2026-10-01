"use client";

import { useState } from "react";
import { getItem } from "@montevideo-world/shared";
import { HotbarSlots, isItemDrag, readItemDrag, startItemDrag } from "@/lib/hotbar";
import { ItemActionContext, countInBag, isWorn, itemAction } from "@/lib/itemActions";
import { ItemIcon } from "./ItemIcon";

interface HotbarProps {
  slots: HotbarSlots;
  /** Ropa puesta, mochila y pesca: para saber qué hace cada ítem y cuántos hay. */
  context: ItemActionContext;
  onChange: (slots: HotbarSlots) => void;
  /** Usar el ítem del casillero (tecla 1–9 o clic). Ver `itemActions.ts`. */
  onActivate: (index: number) => void;
}

/**
 * Barra de acceso rápido 1–9. Se configura arrastrando ítems desde la mochila (ropa, cañas,
 * pescados, cajas); entre casilleros se reordena arrastrando, y se saca un atajo arrastrándolo
 * afuera o con clic derecho. Cada casillero muestra si la prenda está puesta, cuántos hay en la
 * mochila o si ya no lo tenés.
 */
export function Hotbar({ slots, context, onChange, onActivate }: HotbarProps) {
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  function drop(index: number, itemId: string, fromHotbar?: number) {
    const next = [...slots];
    if (fromHotbar !== undefined) {
      [next[fromHotbar], next[index]] = [next[index], next[fromHotbar]];
    } else {
      // Un ítem ocupa un solo atajo: si ya estaba en otro casillero, se mueve.
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
        const item = itemId ? getItem(itemId) : undefined;
        const worn = item ? isWorn(item, context.outfit) : false;
        const inBag = item ? countInBag(context.inventory, item.id) : 0;
        const missing = Boolean(item) && !worn && inBag === 0;
        const action = item ? itemAction(item, context) : null;
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
                ? `${item.name}${worn ? " (puesto)" : missing ? " (no lo tenés)" : ""}${
                    action ? ` — ${index + 1} o clic para ${action.label}` : ""
                  }. Clic derecho: quitar atajo`
                : `Casillero ${index + 1}: arrastrá algo desde la mochila`
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
              // Cualquier ítem del catálogo: cada tipo tiene su acción (ver `itemActions.ts`).
              if (drag && getItem(drag.itemId)) drop(index, drag.itemId, drag.fromHotbar);
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
