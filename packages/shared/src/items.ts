/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`Avatar.ts`, `ItemIcon.tsx`).
 */

export type ItemCategory = "clothing" | "fish" | "rod" | "cart" | "box";

export const ITEM_SLOTS = ["hat", "top", "bottom", "shoes"] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

export const ITEM_SLOT_LABELS: Record<ItemSlot, string> = {
  hat: "Cabeza",
  top: "Torso",
  bottom: "Piernas",
  shoes: "Pies",
};

export type ItemStyle =
  | "cap"
  | "beanie"
  | "beret"
  | "tshirt"
  | "jersey"
  | "hoodie"
  | "tank"
  | "jeans"
  | "pants"
  | "shorts"
  | "sneakers"
  | "boots"
  | "flipflops";

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

type CatalogEntry<T> = Omit<T, "category">;

const clothing = (items: CatalogEntry<ClothingItem>[]): ClothingItem[] =>
  items.map((item) => ({ ...item, category: "clothing" }));
const fish = (items: CatalogEntry<FishItem>[]): FishItem[] => items.map((item) => ({ ...item, category: "fish" }));

export const CLOTHING: readonly ClothingItem[] = clothing([
  { id: "gorra-azul", name: "Gorra azul", slot: "hat", style: "cap", color: "#1d4fa0", price: 20 },
  { id: "gorro-lana", name: "Gorro de lana", slot: "hat", style: "beanie", color: "#b5651d", price: 18 },
  { id: "boina-negra", name: "Boina negra", slot: "hat", style: "beret", color: "#26262b", price: 25 },
  { id: "remera-blanca", name: "Remera blanca", slot: "top", style: "tshirt", color: "#f1f1f1", price: 20 },
  { id: "remera-roja", name: "Remera roja", slot: "top", style: "tshirt", color: "#e63946", price: 20 },
  { id: "remera-negra", name: "Remera negra", slot: "top", style: "tshirt", color: "#26262b", price: 20 },
  { id: "camiseta-celeste", name: "Camiseta celeste", slot: "top", style: "jersey", color: "#6cace4", price: 45 },
  { id: "buzo-gris", name: "Buzo gris", slot: "top", style: "hoodie", color: "#7a828c", price: 50 },
  { id: "musculosa-blanca", name: "Musculosa blanca", slot: "top", style: "tank", color: "#f1f1f1", price: 15 },
  { id: "jean", name: "Jean", slot: "bottom", style: "jeans", color: "#2b3a55", price: 40 },
  { id: "pantalon-beige", name: "Pantalón beige", slot: "bottom", style: "pants", color: "#c8b28a", price: 35 },
  { id: "short-verde", name: "Short verde", slot: "bottom", style: "shorts", color: "#3d6b4f", price: 15 },
  { id: "short-azul", name: "Short azul", slot: "bottom", style: "shorts", color: "#1d4fa0", price: 15 },
  { id: "championes-blancos", name: "Championes blancos", slot: "shoes", style: "sneakers", color: "#f0f0f0", price: 40 },
  { id: "championes-rojos", name: "Championes rojos", slot: "shoes", style: "sneakers", color: "#c0392b", price: 40 },
  { id: "botas-marrones", name: "Botas marrones", slot: "shoes", style: "boots", color: "#6b3e1e", price: 55 },
  { id: "chancletas", name: "Chancletas", slot: "shoes", style: "flipflops", color: "#2a9d8f", price: 8 },
]);

/**
 * Peces del Río de la Plata que se sacan desde la Escollera Sarandí. Cuanto más difícil, menos
 * pica (`catchWeight`), más tarda en picar y más paga el Mercado del Puerto (`price`).
 */
export const FISH: readonly FishItem[] = fish([
  { id: "pejerrey", name: "Pejerrey", gender: "m", difficulty: 1, shape: "fish", color: "#b8c4cc", price: 6, catchWeight: 30 },
  { id: "lisa", name: "Lisa", gender: "f", difficulty: 1, shape: "fish", color: "#9aa7a0", price: 7, catchWeight: 24 },
  { id: "bagre", name: "Bagre", gender: "m", difficulty: 2, shape: "fish", color: "#6b5a4a", price: 9, catchWeight: 18 },
  { id: "burriqueta", name: "Burriqueta", gender: "f", difficulty: 2, shape: "fish", color: "#c9a66b", price: 12, catchWeight: 14 },
  { id: "pescadilla", name: "Pescadilla", gender: "f", difficulty: 3, shape: "fish", color: "#d9cbb0", price: 16, catchWeight: 10 },
  { id: "corvina-blanca", name: "Corvina blanca", gender: "f", difficulty: 3, shape: "fish", color: "#cfc6b8", price: 20, catchWeight: 9 },
  { id: "brotola", name: "Brótola", gender: "f", difficulty: 3, shape: "fish", color: "#a0614a", price: 18, catchWeight: 8 },
  { id: "lenguado", name: "Lenguado", gender: "m", difficulty: 4, shape: "flat", color: "#8a7a5c", price: 35, catchWeight: 4 },
  { id: "corvina-negra", name: "Corvina negra", gender: "f", difficulty: 5, shape: "fish", color: "#3e3a38", price: 60, catchWeight: 2 },
]);

/** Caña con la que arranca todo jugador nuevo (en la mochila). */
export const BASIC_ROD_ID = "cana-basica";

/** Cañas de pescar, de la básica a la profesional. Se compran en Pesca Sarandí. */
export const RODS: readonly RodItem[] = [
  { id: BASIC_ROD_ID, name: "Caña básica", category: "rod", tier: 1, color: "#8a6a45", price: 30, rareBoost: 0, nothingChance: 0.2, doubleChance: 0, waitFactor: 1, maxUses: 40 },
  { id: "cana-fibra", name: "Caña de fibra", category: "rod", tier: 2, color: "#2a9d8f", price: 150, rareBoost: 0.2, nothingChance: 0.15, doubleChance: 0.05, waitFactor: 0.9, maxUses: 80 },
  { id: "cana-carbono", name: "Caña de carbono", category: "rod", tier: 3, color: "#3a3f4c", price: 450, rareBoost: 0.4, nothingChance: 0.1, doubleChance: 0.12, waitFactor: 0.8, maxUses: 110 },
  { id: "cana-profesional", name: "Caña profesional", category: "rod", tier: 4, color: "#c9a227", price: 1200, rareBoost: 0.7, nothingChance: 0.06, doubleChance: 0.25, waitFactor: 0.7, maxUses: 150 },
];

const cart = (items: CatalogEntry<CartItem>[]): CartItem[] => items.map((item) => ({ ...item, category: "cart" }));

/** Carritos de venta, de la conservadora a la parrillita. Se compran en el Kiosco del Parque. */
export const CARTS: readonly CartItem[] = cart([
  { id: "conservadora", name: "Conservadora", tier: 1, color: "#2a7bd1", price: 35, product: "un refresco", cry: "¡Refresco, refresquito frío!", saleMin: 3, saleMax: 6, noSaleChance: 0.25, giftChance: 0.01, waitFactor: 1, maxUses: 40 },
  { id: "carrito-garrapinada", name: "Carrito de garrapiñada", tier: 2, color: "#c1440e", price: 160, product: "una garrapiñada", cry: "¡Garrapiñada, garrapiñada!", saleMin: 6, saleMax: 10, noSaleChance: 0.2, giftChance: 0.02, waitFactor: 0.9, maxUses: 80 },
  { id: "carrito-panchos", name: "Carrito de panchos", tier: 3, color: "#e9b10a", price: 480, product: "un pancho", cry: "¡Panchos, panchos calentitos!", saleMin: 10, saleMax: 16, noSaleChance: 0.15, giftChance: 0.035, waitFactor: 0.8, maxUses: 110 },
  { id: "parrillita-choripan", name: "Parrillita de choripán", tier: 4, color: "#7a2e1e", price: 1250, product: "un choripán", cry: "¡Choripán, choripán al pan!", saleMin: 16, saleMax: 26, noSaleChance: 0.1, giftChance: 0.05, waitFactor: 0.7, maxUses: 150 },
]);

/** Caja que da el comando de admin `/box`. */
export const MYSTERY_BOX_ID = "caja-sorpresa";

/**
 * Cajas sorpresa. No se compran ni se venden en tiendas: las reparte el admin y se pueden pasar por
 * intercambio. Los pesos de la caja de peces suman 100, así cada número es directamente el %.
 */
export const BOXES: readonly BoxItem[] = [
  {
    id: MYSTERY_BOX_ID,
    name: "Caja sorpresa",
    category: "box",
    color: "#c8553d",
    price: 0,
    loot: [
      { itemId: "pejerrey", weight: 25 },
      { itemId: "lisa", weight: 20 },
      { itemId: "bagre", weight: 15 },
      { itemId: "burriqueta", weight: 12 },
      { itemId: "pescadilla", weight: 9 },
      { itemId: "corvina-blanca", weight: 8 },
      { itemId: "brotola", weight: 6 },
      { itemId: "lenguado", weight: 4 },
      { itemId: "corvina-negra", weight: 1 },
    ],
  },
];

export const ITEMS: readonly ItemDefinition[] = [...CLOTHING, ...FISH, ...RODS, ...CARTS, ...BOXES];

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  clothing: "ropa",
  fish: "pescado",
  rod: "cañas",
  cart: "carritos",
  box: "cajas",
};

export function isRod(item: ItemDefinition | undefined): item is RodItem {
  return item?.category === "rod";
}

/** La caña de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguna. */
export function bestRod(itemIds: Iterable<string>): RodItem | undefined {
  let best: RodItem | undefined;
  for (const id of itemIds) {
    const item = getItem(id);
    if (isRod(item) && (!best || item.tier > best.tier)) best = item;
  }
  return best;
}

/** "★★☆☆" para mostrar el nivel de una caña. */
export function rodStars(tier: RodTier): string {
  return "★".repeat(tier) + "☆".repeat(4 - tier);
}

export function isCart(item: ItemDefinition | undefined): item is CartItem {
  return item?.category === "cart";
}

/** El carrito de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguno. */
export function bestCart(itemIds: Iterable<string>): CartItem | undefined {
  let best: CartItem | undefined;
  for (const id of itemIds) {
    const item = getItem(id);
    if (isCart(item) && (!best || item.tier > best.tier)) best = item;
  }
  return best;
}

/** "★★☆☆" para mostrar el nivel de un carrito. */
export function cartStars(tier: CartTier): string {
  return "★".repeat(tier) + "☆".repeat(4 - tier);
}

export function isBox(item: ItemDefinition | undefined): item is BoxItem {
  return item?.category === "box";
}

/** Probabilidad (0–1) de cada premio de una caja, para mostrarla en la UI. */
export function lootChances(box: BoxItem): { item: ItemDefinition; chance: number }[] {
  const total = box.loot.reduce((sum, entry) => sum + entry.weight, 0);
  return box.loot.flatMap((entry) => {
    const item = getItem(entry.itemId);
    return item ? [{ item, chance: entry.weight / total }] : [];
  });
}

/** Sortea el premio de una caja según los pesos de su `loot`. */
export function rollLoot(box: BoxItem, random: () => number = Math.random): ItemDefinition {
  const chances = lootChances(box);
  let roll = random();
  for (const { item, chance } of chances) {
    roll -= chance;
    if (roll < 0) return item;
  }
  return chances[chances.length - 1].item;
}

export function isClothing(item: ItemDefinition | undefined): item is ClothingItem {
  return item?.category === "clothing";
}

/** La prenda `id` del catálogo, o undefined si no existe o no es ropa. */
export function getClothing(id: string): ClothingItem | undefined {
  const item = getItem(id);
  return isClothing(item) ? item : undefined;
}

/** "un pejerrey", "una corvina blanca": para usar en medio de una oración. */
export function fishWithArticle(fish: FishItem): string {
  return `${fish.gender === "f" ? "una" : "un"} ${fish.name.toLowerCase()}`;
}

/** "★★★☆☆" para mostrar la dificultad de un pescado. */
export function difficultyStars(difficulty: FishDifficulty): string {
  return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
}

/** Lo que tiene en la mochila un jugador nuevo: la caña básica para poder pescar. */
export const STARTER_INVENTORY: readonly string[] = [BASIC_ROD_ID];

/**
 * Kit con el que aparece un jugador nuevo: una remera, un short y chancletas, puestos (y en la
 * mochila, `STARTER_INVENTORY`). De cada lista se elige una opción al azar (para que no estén todos vestidos iguales).
 */
export const STARTER_KIT: Readonly<Partial<Record<ItemSlot, readonly string[]>>> = {
  top: ["remera-blanca", "remera-roja", "remera-negra"],
  bottom: ["short-verde", "short-azul"],
  shoes: ["chancletas"],
};

/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
export const INVENTORY_CAPACITY = 20;
export const MAX_STACK = 99;

/** Pila de prendas iguales en un casillero de la mochila. */
export interface InventoryStack {
  itemId: string;
  quantity: number;
  /** Sólo herramientas (cañas, carritos; siempre de a una): usos que le quedan. */
  uses?: number;
}

export function isTool(item: ItemDefinition | undefined): item is ToolItem {
  return item?.category === "rod" || item?.category === "cart";
}

/** Cuántas unidades entran en un casillero: las herramientas van de a una (cada una con su desgaste). */
export function maxStack(item: ItemDefinition | undefined): number {
  return isTool(item) ? 1 : MAX_STACK;
}

/** Usos que le quedan a una pila (una herramienta sin `uses` está nueva). */
export function stackUses(stack: InventoryStack): number {
  const item = getItem(stack.itemId);
  return isTool(item) ? (stack.uses ?? item.maxUses) : 0;
}

/**
 * La unidad de `itemId` que se gasta, se vende o se intercambia primero: la más usada. Así una
 * herramienta se termina antes de empezar la siguiente igual. Para lo que no es herramienta, la
 * primera pila.
 */
export function wornestStack(stacks: readonly InventoryStack[], itemId: string): InventoryStack | undefined {
  let found: InventoryStack | undefined;
  for (const stack of stacks) {
    if (stack.itemId !== itemId) continue;
    if (!found || stackUses(stack) < stackUses(found)) found = stack;
  }
  return found;
}

/** Con estos usos o menos, la UI avisa que la herramienta está por romperse. */
export const LOW_USES = 5;

/** "32/40 usos" para mostrar el desgaste de una herramienta. */
export function usesLabel(item: ToolItem, uses: number): string {
  return `${uses}/${item.maxUses} usos`;
}

/** Prenda puesta en cada lugar ("" = nada). Es la forma en que viaja en el Schema. */
export type OutfitIds = Record<ItemSlot, string>;

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS.find((item) => item.id === id);
}

export function isItemSlot(value: unknown): value is ItemSlot {
  return typeof value === "string" && (ITEM_SLOTS as readonly string[]).includes(value);
}

/** Una tienda paga por una prenda usada esta fracción de su precio. */
export const SELL_RATIO = 0.5;

/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
export const FISH_BUY_MARKUP = 1.5;

/** Lo que cuesta comprar un ítem en una tienda: la ropa a su precio, el pescado con recargo. */
export function buyPrice(item: ItemDefinition): number {
  if (item.category === "fish") return Math.ceil(item.price * FISH_BUY_MARKUP);
  return item.price;
}

/**
 * Lo que paga una tienda: la mitad por ropa usada (mínimo $1), el precio completo por pescado. Una
 * herramienta gastada vale en proporción a los `uses` que le quedan.
 */
export function sellPrice(item: ItemDefinition, uses?: number): number {
  if (item.category === "fish") return item.price;
  const half = item.price * SELL_RATIO;
  const wear = isTool(item) && uses !== undefined ? Math.min(1, Math.max(0, uses / item.maxUses)) : 1;
  return Math.max(1, Math.floor(half * wear));
}
