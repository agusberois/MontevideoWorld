import type { DragEvent } from "react";

/**
 * Barra de acceso rápido (teclas 1–9). Es una preferencia de UI: guarda referencias a ítems (ids:
 * ropa, cañas, pescados, cajas), no los ítems; por eso vive en el navegador y no pasa por el
 * servidor. Qué hace cada ítem al usarlo está en `itemActions.ts`.
 */
export const HOTBAR_SIZE = 9;

export type HotbarSlots = Array<string | null>;

const STORAGE_KEY = "montevideo-world:hotbar";

export function emptyHotbar(): HotbarSlots {
  return Array<string | null>(HOTBAR_SIZE).fill(null);
}

export function loadHotbar(): HotbarSlots {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!Array.isArray(parsed)) return emptyHotbar();
    return emptyHotbar().map((_, index) => (typeof parsed[index] === "string" ? (parsed[index] as string) : null));
  } catch {
    return emptyHotbar();
  }
}

export function saveHotbar(slots: HotbarSlots) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // Sin almacenamiento (modo privado, etc.): la barra funciona igual, sólo no se recuerda.
  }
}

/** Qué se está arrastrando: un ítem y desde qué casillero de la barra o de la mochila viene. */
export interface ItemDrag {
  itemId: string;
  fromHotbar?: number;
  fromBackpack?: number;
}

const DRAG_TYPE = "application/x-montevideo-item";

export function startItemDrag(event: DragEvent, drag: ItemDrag) {
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag));
  event.dataTransfer.effectAllowed = "move";
}

/** En `dragover`: ¿es algo que la barra acepta? (los datos sólo se pueden leer en `drop`) */
export function isItemDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes(DRAG_TYPE);
}

export function readItemDrag(event: DragEvent): ItemDrag | null {
  try {
    const parsed: unknown = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { itemId, fromHotbar, fromBackpack } = parsed as Record<string, unknown>;
    if (typeof itemId !== "string") return null;
    return {
      itemId,
      fromHotbar: typeof fromHotbar === "number" ? fromHotbar : undefined,
      fromBackpack: typeof fromBackpack === "number" ? fromBackpack : undefined,
    };
  } catch {
    return null;
  }
}
