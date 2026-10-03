/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`game/objects/clothing/`, `ItemIcon.tsx`).
 */
export type ItemCategory = "clothing" | "fish" | "food" | "medicine" | "rod" | "cart" | "box" | "ticket";
export declare const ITEM_SLOTS: readonly ["hat", "top", "bottom", "shoes"];
export type ItemSlot = (typeof ITEM_SLOTS)[number];
export declare const ITEM_SLOT_LABELS: Record<ItemSlot, string>;
/**
 * Estilos de prenda de cada lugar del cuerpo. El cliente dibuja cada uno en el avatar
 * (`game/objects/clothing/<lugar>.ts`) y en el ícono (`ItemIcon.tsx`): un estilo nuevo no compila
 * hasta tener los dos dibujos.
 */
export declare const ITEM_STYLES: {
    readonly hat: readonly ["cap", "beanie", "beret"];
    readonly top: readonly ["tshirt", "jersey", "hoodie", "tank"];
    readonly bottom: readonly ["jeans", "pants", "shorts"];
    readonly shoes: readonly ["sneakers", "boots", "flipflops"];
};
export type SlotStyle<S extends ItemSlot> = (typeof ITEM_STYLES)[S][number];
export type ItemStyle = SlotStyle<ItemSlot>;
interface ItemBase {
    id: string;
    name: string;
    /** Color principal, "#rrggbb". */
    color: string;
    /** Precio en pesos enteros: lo que cobra una tienda al vender (ropa) o lo que paga (pescado). */
    price: number;
}
/** Prenda de un lugar del cuerpo: su `style` es uno de los de ese lugar. */
export interface ClothingOf<S extends ItemSlot> extends ItemBase {
    category: "clothing";
    slot: S;
    style: SlotStyle<S>;
}
export type ClothingItem = {
    [S in ItemSlot]: ClothingOf<S>;
}[ItemSlot];
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
/**
 * Boleto de ómnibus (STM): cada viaje a otro barrio gasta uno. Se compra en la Agencia STM, se apila
 * en la mochila y se puede intercambiar.
 */
export interface TicketItem extends ItemBase {
    category: "ticket";
}
/** Forma del ícono de cada comida (`ItemIcon.tsx`). */
export type FoodShape = "tortaFrita" | "alfajor" | "mate" | "pancho" | "chivito" | "fishPlate";
/**
 * Comida: se compra en kioscos y en el Mercado, y se come desde la mochila o la barra rápida. Llena
 * la saciedad (`hunger`) y da algo de energía (`energy`). Ver `needs.ts` y `edibleValue`.
 */
export interface FoodItem extends ItemBase {
    category: "food";
    shape: FoodShape;
    hunger: number;
    energy: number;
    /** Lo que cura (0 = nada). */
    health: number;
}
/** Forma del ícono de cada remedio (`ItemIcon.tsx`). */
export type MedicineShape = "pills" | "bandage" | "vitamins" | "kit";
/**
 * Remedio: se compra en la farmacia y se toma desde la mochila o la barra rápida (`food:eat`, como
 * la comida). Cura salud (`health`) y algunos dan energía; no llenan la panza.
 */
export interface MedicineItem extends ItemBase {
    category: "medicine";
    shape: MedicineShape;
    health: number;
    energy: number;
}
export type ItemDefinition = ClothingItem | FishItem | FoodItem | MedicineItem | RodItem | CartItem | BoxItem | TicketItem;
export declare const CLOTHING: readonly ClothingItem[];
/**
 * Moda coreana: prendas que sólo se venden en el Barrio de los Judíos (los locales coreanos de la
 * calle Inca). Mismos estilos que el resto, otros colores; no están en `CLOTHING` para que las otras
 * roperías ("todo el catálogo") no las tengan.
 */
export declare const KOREAN_FASHION: readonly ClothingItem[];
/**
 * Peces del Río de la Plata que se sacan desde la Escollera Sarandí. Cuanto más difícil, menos
 * pica (`catchWeight`), más tarda en picar y más paga el Mercado del Puerto (`price`).
 */
export declare const FISH: readonly FishItem[];
/**
 * Comidas. Las baratas llenan poco (o dan sobre todo energía, como el mate); las caras llenan
 * mucho. Ver el balance en `docs/finished/necesidades-del-personaje.md`.
 */
export declare const FOODS: readonly FoodItem[];
/**
 * Remedios de la farmacia. Curan salud en el momento y se llevan en la mochila; por punto salen
 * algo más caros que la guardia del sanatorio ($1 por punto), que hay que ir hasta Tres Cruces.
 */
export declare const MEDICINES: readonly MedicineItem[];
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
/** El boleto de STM (`TicketItem`): lo que gasta viajar entre barrios. */
export declare const TICKET_ID = "boleto-stm";
export declare const TICKETS: readonly TicketItem[];
export declare const ITEMS: readonly ItemDefinition[];
/** Una tienda paga por una prenda usada esta fracción de su precio. */
export declare const SELL_RATIO = 0.5;
/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
export declare const FISH_BUY_MARKUP = 1.5;
/** Cómo se comporta cada categoría de ítem en la mochila y en las tiendas (cliente y server). */
export interface ItemCategoryInfo {
    /** Para los textos ("En X no compran cañas") y la pestaña del maker. */
    label: string;
    /** Herramienta con desgaste: va de a una por casillero y vale según los usos que le quedan. */
    tool: boolean;
    /** Lo que cobra una tienda al venderla: `price` × esto (redondeado para arriba). */
    buyMarkup: number;
    /** Lo que paga una tienda al comprarla: `price` × esto (mínimo $1). */
    sellRatio: number;
    /** Pie de la pestaña Vender de una tienda que compra esta categoría. */
    sellNote: string;
    /** Pie de la pestaña Comprar de una tienda que vende alguno de esta categoría. */
    buyNote?: string;
    /** Pestaña Vender vacía: no tenés nada de esta categoría para venderle. */
    nothingToSell: string;
}
/**
 * Todas las categorías, en el orden en que se muestran (p. ej. en el maker). Para una nueva: sumarla
 * a `ItemCategory` y acá; TypeScript pide después su ícono (`ItemIcon.tsx`), su vista en la mochila
 * (`Backpack.tsx`) y qué hace en la barra rápida (`itemActions.ts`).
 */
export declare const ITEM_CATEGORIES: Record<ItemCategory, ItemCategoryInfo>;
export declare const ITEM_CATEGORY_IDS: ItemCategory[];
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
export declare function isFood(item: ItemDefinition | undefined): item is FoodItem;
/** Lo que da comer algo: saciedad, energía y salud (negativa: hace mal). */
export interface EdibleValue {
    hunger: number;
    energy: number;
    health: number;
    /** Pescado crudo: la salud que saca nunca la deja por debajo de `RAW_FISH_HEALTH_FLOOR` (`needs.ts`). */
    raw?: boolean;
}
/**
 * Qué da comerse (o tomarse, un remedio) este ítem, o undefined si no. La comida y los remedios, lo suyo; un pescado crudo llena
 * según su dificultad (pejerrey +10 … corvina negra +30), da la mitad de eso en energía y saca un
 * poco de salud.
 */
export declare function edibleValue(item: ItemDefinition | undefined): EdibleValue | undefined;
/** "🍖 +30 · ⚡ +5 · ❤ +10" (o "❤ −2, crudo"): lo que da comerlo, para la mochila, la tienda y la barra rápida. */
export declare function edibleLabel(value: EdibleValue): string;
export declare function isTicket(item: ItemDefinition | undefined): item is TicketItem;
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
    /**
     * Casillero de la mochila (0 … capacidad − 1) donde está la pila: el jugador los reordena
     * (`inventory:move`) y puede haber huecos. Lo pone el server; una unidad suelta (lo que sale de
     * `Inventory.remove`, una oferta) no lo lleva.
     */
    slot?: number;
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
/**
 * Lo que cuesta comprar un ítem en una tienda: su precio por el recargo de su categoría (el pescado
 * sale más) y por el `priceFactor` de la tienda (los mayoristas venden más barato).
 */
export declare function buyPrice(item: ItemDefinition, priceFactor?: number): number;
/**
 * Lo que paga una tienda: el precio por el `sellRatio` de su categoría (la mitad por ropa usada, el
 * completo por pescado; mínimo $1). Una herramienta gastada vale en proporción a los `uses` que le quedan.
 */
export declare function sellPrice(item: ItemDefinition, uses?: number): number;
export {};
//# sourceMappingURL=items.d.ts.map