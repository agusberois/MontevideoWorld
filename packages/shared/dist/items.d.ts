/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`Avatar.ts`, `ItemIcon.tsx`).
 */
export type ItemCategory = "clothing" | "fish" | "rod" | "cart" | "box";
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
/** Nivel de una caña: 1 = básica … 4 = profesional. */
export type RodTier = 1 | 2 | 3 | 4;
/**
 * Caña de pescar. Para pescar hay que tener una en la mochila; se usa siempre la de mayor nivel.
 * Las mejores hacen que piquen más los peces difíciles, que no pique nada menos seguido, que piquen
 * antes y a veces sacan dos peces de una (ver `fishing.ts`).
 */
export interface RodItem extends ItemBase {
    category: "rod";
    tier: RodTier;
    /**
     * Ventaja para los peces difíciles: el peso de cada pez se multiplica por
     * `(1 + rareBoost) ^ (dificultad - 1)`. 0 = sin ventaja.
     */
    rareBoost: number;
    /** Probabilidad (0–1) de que no pique nada. */
    nothingChance: number;
    /** Probabilidad (0–1) de sacar un segundo pez junto con el primero. */
    doubleChance: number;
    /** Multiplica la espera hasta que pica (menos de 1 = pica antes). */
    waitFactor: number;
    /** Tiradas que aguanta (cada tirada gasta un uso, pique o no); después se rompe. */
    maxUses: number;
}
/** Nivel de un carrito: 1 = conservadora … 4 = parrillita. */
export type CartTier = 1 | 2 | 3 | 4;
/**
 * Carrito de vendedor ambulante. Para vender en la explanada del Estadio Centenario hay que tener
 * uno en la mochila; se usa siempre el de mayor nivel. Los mejores venden algo más caro, los
 * hinchas compran más seguido y más rápido, y regalan ropa más seguido (ver `vending.ts`).
 */
export interface CartItem extends ItemBase {
    category: "cart";
    tier: CartTier;
    /** Lo que se vende, con artículo: "un refresco", "una garrapiñada". */
    product: string;
    /** Lo que grita el vendedor al empezar a vender. */
    cry: string;
    /** Lo que paga un hincha por unidad, en pesos enteros (sin partido). */
    saleMin: number;
    saleMax: number;
    /** Probabilidad (0–1) de que nadie compre. */
    noSaleChance: number;
    /** Probabilidad (0–1) de que, además de comprar, el hincha te regale una prenda (sin partido). */
    giftChance: number;
    /** Multiplica la espera hasta que llega un cliente (menos de 1 = antes). */
    waitFactor: number;
    /** Intentos de venta que aguanta (cada intento gasta un uso, compren o no); después se rompe. */
    maxUses: number;
}
/**
 * Herramientas: cañas y carritos. Se gastan con el uso (`maxUses`), no se apilan (cada una ocupa su
 * casillero y lleva sus `uses` restantes) y, como se rompen, hay que volver a comprarlas: eso
 * mantiene vivo el mercado.
 */
export type ToolItem = RodItem | CartItem;
/** Premio posible de una caja: `weight` relativo (más alto = sale más seguido). */
export interface LootEntry {
    itemId: string;
    weight: number;
}
/** Caja sorpresa: al abrirla se consume y da uno de sus `loot`, sorteado por peso. */
export interface BoxItem extends ItemBase {
    category: "box";
    loot: readonly LootEntry[];
}
export type ItemDefinition = ClothingItem | FishItem | RodItem | CartItem | BoxItem;
export declare const CLOTHING: readonly ClothingItem[];
/**
 * Peces del Río de la Plata que se sacan desde la Escollera Sarandí. Cuanto más difícil, menos
 * pica (`catchWeight`), más tarda en picar y más paga el Mercado del Puerto (`price`).
 */
export declare const FISH: readonly FishItem[];
/** Caña con la que arranca todo jugador nuevo (en la mochila). */
export declare const BASIC_ROD_ID = "cana-basica";
/** Cañas de pescar, de la básica a la profesional. Se compran en Pesca Sarandí. */
export declare const RODS: readonly RodItem[];
/** Carritos de venta, de la conservadora a la parrillita. Se compran en el Kiosco del Parque. */
export declare const CARTS: readonly CartItem[];
/** Caja que da el comando de admin `/box`. */
export declare const MYSTERY_BOX_ID = "caja-sorpresa";
/**
 * Cajas sorpresa. No se compran ni se venden en tiendas: las reparte el admin y se pueden pasar por
 * intercambio. Los pesos de la caja de peces suman 100, así cada número es directamente el %.
 */
export declare const BOXES: readonly BoxItem[];
export declare const ITEMS: readonly ItemDefinition[];
export declare const ITEM_CATEGORY_LABELS: Record<ItemCategory, string>;
export declare function isRod(item: ItemDefinition | undefined): item is RodItem;
/** La caña de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguna. */
export declare function bestRod(itemIds: Iterable<string>): RodItem | undefined;
/** "★★☆☆" para mostrar el nivel de una caña. */
export declare function rodStars(tier: RodTier): string;
export declare function isCart(item: ItemDefinition | undefined): item is CartItem;
/** El carrito de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguno. */
export declare function bestCart(itemIds: Iterable<string>): CartItem | undefined;
/** "★★☆☆" para mostrar el nivel de un carrito. */
export declare function cartStars(tier: CartTier): string;
export declare function isBox(item: ItemDefinition | undefined): item is BoxItem;
/** Probabilidad (0–1) de cada premio de una caja, para mostrarla en la UI. */
export declare function lootChances(box: BoxItem): {
    item: ItemDefinition;
    chance: number;
}[];
/** Sortea el premio de una caja según los pesos de su `loot`. */
export declare function rollLoot(box: BoxItem, random?: () => number): ItemDefinition;
export declare function isClothing(item: ItemDefinition | undefined): item is ClothingItem;
/** La prenda `id` del catálogo, o undefined si no existe o no es ropa. */
export declare function getClothing(id: string): ClothingItem | undefined;
/** "un pejerrey", "una corvina blanca": para usar en medio de una oración. */
export declare function fishWithArticle(fish: FishItem): string;
/** "★★★☆☆" para mostrar la dificultad de un pescado. */
export declare function difficultyStars(difficulty: FishDifficulty): string;
/** Lo que tiene en la mochila un jugador nuevo: la caña básica para poder pescar. */
export declare const STARTER_INVENTORY: readonly string[];
/**
 * Kit con el que aparece un jugador nuevo: una remera, un short y chancletas, puestos (y en la
 * mochila, `STARTER_INVENTORY`). De cada lista se elige una opción al azar (para que no estén todos vestidos iguales).
 */
export declare const STARTER_KIT: Readonly<Partial<Record<ItemSlot, readonly string[]>>>;
/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
export declare const INVENTORY_CAPACITY = 20;
export declare const MAX_STACK = 99;
/** Pila de prendas iguales en un casillero de la mochila. */
export interface InventoryStack {
    itemId: string;
    quantity: number;
    /** Sólo herramientas (cañas, carritos; siempre de a una): usos que le quedan. */
    uses?: number;
}
export declare function isTool(item: ItemDefinition | undefined): item is ToolItem;
/** Cuántas unidades entran en un casillero: las herramientas van de a una (cada una con su desgaste). */
export declare function maxStack(item: ItemDefinition | undefined): number;
/** Usos que le quedan a una pila (una herramienta sin `uses` está nueva). */
export declare function stackUses(stack: InventoryStack): number;
/**
 * La unidad de `itemId` que se gasta, se vende o se intercambia primero: la más usada. Así una
 * herramienta se termina antes de empezar la siguiente igual. Para lo que no es herramienta, la
 * primera pila.
 */
export declare function wornestStack(stacks: readonly InventoryStack[], itemId: string): InventoryStack | undefined;
/** Con estos usos o menos, la UI avisa que la herramienta está por romperse. */
export declare const LOW_USES = 5;
/** "32/40 usos" para mostrar el desgaste de una herramienta. */
export declare function usesLabel(item: ToolItem, uses: number): string;
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
/**
 * Lo que paga una tienda: la mitad por ropa usada (mínimo $1), el precio completo por pescado. Una
 * herramienta gastada vale en proporción a los `uses` que le quedan.
 */
export declare function sellPrice(item: ItemDefinition, uses?: number): number;
export {};
//# sourceMappingURL=items.d.ts.map