/**
 * Catálogo de ítems: ropa (se pone en el avatar) y pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`Avatar.ts`, `ItemIcon.tsx`).
 */
export type ItemCategory = "clothing" | "fish";
export declare const ITEM_SLOTS: readonly ["hat", "top", "bottom", "shoes"];
export type ItemSlot = (typeof ITEM_SLOTS)[number];
export declare const ITEM_SLOT_LABELS: Record<ItemSlot, string>;
export type ItemStyle = "cap" | "beanie" | "beret" | "tshirt" | "jersey" | "hoodie" | "tank" | "jeans" | "pants" | "shorts" | "sneakers" | "boots" | "flipflops";
interface ItemBase {
    id: string;
    name: string;
    /** Color principal, "#rrggbb". */
    color: string;
    /** Precio en pesos enteros: lo que cobra una tienda al vender (ropa) o lo que paga (pescado). */
    price: number;
}
export interface ClothingItem extends ItemBase {
    category: "clothing";
    slot: ItemSlot;
    style: ItemStyle;
}
/** Dificultad de 1 (fácil, común, barato) a 5 (difícil, raro, caro). */
export type FishDifficulty = 1 | 2 | 3 | 4 | 5;
export interface FishItem extends ItemBase {
    category: "fish";
    difficulty: FishDifficulty;
    /** Para los textos: "un pejerrey", "una corvina". */
    gender: "m" | "f";
    /** Silueta del ícono: pez común o pez plano (lenguado). */
    shape: "fish" | "flat";
    /** Peso relativo en el sorteo al pescar: más alto = pica más seguido. */
    catchWeight: number;
}
export type ItemDefinition = ClothingItem | FishItem;
export declare const CLOTHING: readonly ClothingItem[];
/**
 * Peces del Río de la Plata que se sacan desde la Escollera Sarandí. Cuanto más difícil, menos
 * pica (`catchWeight`), más tarda en picar y más paga el Mercado del Puerto (`price`).
 */
export declare const FISH: readonly FishItem[];
export declare const ITEMS: readonly ItemDefinition[];
export declare const ITEM_CATEGORY_LABELS: Record<ItemCategory, string>;
export declare function isClothing(item: ItemDefinition | undefined): item is ClothingItem;
/** La prenda `id` del catálogo, o undefined si no existe o no es ropa. */
export declare function getClothing(id: string): ClothingItem | undefined;
/** "un pejerrey", "una corvina blanca": para usar en medio de una oración. */
export declare function fishWithArticle(fish: FishItem): string;
/** "★★★☆☆" para mostrar la dificultad de un pescado. */
export declare function difficultyStars(difficulty: FishDifficulty): string;
/**
 * Kit con el que aparece un jugador nuevo: una remera, un short y chancletas, puestos, y la mochila
 * vacía. De cada lista se elige una opción al azar (para que no estén todos vestidos iguales).
 */
export declare const STARTER_KIT: Readonly<Partial<Record<ItemSlot, readonly string[]>>>;
/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
export declare const INVENTORY_CAPACITY = 20;
export declare const MAX_STACK = 99;
/** Pila de prendas iguales en un casillero de la mochila. */
export interface InventoryStack {
    itemId: string;
    quantity: number;
}
/** Prenda puesta en cada lugar ("" = nada). Es la forma en que viaja en el Schema. */
export type OutfitIds = Record<ItemSlot, string>;
export declare function getItem(id: string): ItemDefinition | undefined;
export declare function isItemSlot(value: unknown): value is ItemSlot;
/** Una tienda paga por una prenda usada esta fracción de su precio. */
export declare const SELL_RATIO = 0.5;
/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
export declare const FISH_BUY_MARKUP = 1.5;
/** Lo que cuesta comprar un ítem en una tienda: la ropa a su precio, el pescado con recargo. */
export declare function buyPrice(item: ItemDefinition): number;
/** Lo que paga una tienda: la mitad por ropa usada (mínimo $1), el precio completo por pescado. */
export declare function sellPrice(item: ItemDefinition): number;
export {};
//# sourceMappingURL=items.d.ts.map