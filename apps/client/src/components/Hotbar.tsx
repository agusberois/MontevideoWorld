"use client";

import { useRef, useState } from "react";
import { getItem } from "@montevideo-world/shared";
import { HotbarSlots, isItemDrag, readItemDrag, startItemDrag } from "@/lib/hotbar";
import { ItemActionContext, countInBag, isWorn, itemAction } from "@/lib/itemActions";
import { isTouchDevice } from "@/lib/viewport";
import { HotbarPicker } from "./HotbarPicker";
import { ItemIcon } from "./ItemIcon";

/** Mantener apretado un casillero este tiempo abre el selector (para cambiarlo o quitarlo). */
const LONG_PRESS_MS = 450;

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
 * afuera o con clic derecho. Sin arrastrar (celulares): tocar un casillero vacío o mantener
 * apretado uno lleno abre `HotbarPicker` para elegir qué va ahí o quitarlo. Cada casillero muestra
 * si la prenda está puesta, cuántos hay en la mochila o si ya no lo tenés.
 */
export function Hotbar({ slots, context, onChange, onActivate }: HotbarProps) {
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  /** Casillero con el selector abierto. */
  const [picking, setPicking] = useState<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  /** El toque largo ya abrió el selector: el "clic" que viene al soltar no usa el ítem. */
  const longPressed = useRef(false);
  // En pantallas táctiles el arrastre nativo no anda: los casilleros no se arrastran.
  const touch = isTouchDevice();

  function cancelPress() {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

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
            draggable={Boolean(item) && !touch}
            title={
              item
                ? `${item.name}${worn ? " (puesto)" : missing ? " (no lo tenés)" : ""}${
                    action ? ` — ${index + 1} o clic para ${action.label}` : ""
                  }. Mantené apretado o clic derecho para cambiarlo`
                : `Casillero ${index + 1}: tocá para elegir qué poner (o arrastrá algo desde la mochila)`
            }
            onClick={() => {
              if (longPressed.current) {
                longPressed.current = false;
                return;
              }
              if (item) onActivate(index);
              else setPicking(index);
            }}
            onPointerDown={() => {
              longPressed.current = false;
              cancelPress();
              pressTimer.current = window.setTimeout(() => {
                longPressed.current = true;
                setPicking(index);
              }, LONG_PRESS_MS);
            }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(event) => {
              // Clic derecho (o el toque largo en Android, que también lo dispara): abre el selector.
              event.preventDefault();
              cancelPress();
              setPicking(index);
            }}
            onDragStart={(event) => {
              cancelPress();
              if (item) startItemDrag(event, { itemId: item.id, fromHotbar: index });
            }}
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
      {picking !== null && (
        <HotbarPicker
          index={picking}
          current={slots[picking]}
          inventory={context.inventory}
          outfit={context.outfit}
          onPick={(itemId) => {
            drop(picking, itemId);
            setPicking(null);
          }}
          onClear={() => {
            clear(picking);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </nav>
  );
}
