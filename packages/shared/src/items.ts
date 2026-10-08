/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro), instrumentos (hacen falta para tocar en la calle en el
 * Centro; los mejores dejan más propina) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`apps/client/src/lib/avatar/clothing.ts`, `ItemIcon.tsx`).
 */

import { TRAVEL_FARE } from "./money";
import { fasterLabel } from "./odds";
import { WELCOME_LETTER_ID } from "./welcome";

export type ItemCategory = "clothing" | "fish" | "food" | "medicine" | "rod" | "cart" | "instrument" | "box" | "ticket" | "letter";

export const ITEM_SLOTS = ["hat", "top", "bottom", "shoes"] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

export const ITEM_SLOT_LABELS: Record<ItemSlot, string> = {
  hat: "Cabeza",
  top: "Torso",
  bottom: "Piernas",
  shoes: "Pies",
};

/**
 * Estilos de prenda de cada lugar del cuerpo. El cliente dibuja cada uno en el avatar
 * (`apps/client/src/lib/avatar/clothing.ts`) y en el ícono (`ItemIcon.tsx`): un estilo nuevo no compila
 * hasta tener los dos dibujos.
 */
export const ITEM_STYLES = {
  hat: ["cap", "beanie", "beret"],
  top: ["tshirt", "jersey", "hoodie", "tank", "vest"],
  bottom: ["jeans", "pants", "shorts"],
  shoes: ["sneakers", "boots", "flipflops"],
} as const satisfies Record<ItemSlot, readonly string[]>;

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
  /**
   * Calzado: cuánto más rápido se camina con él puesto (1,2 = 20 % más rápido; sin el campo, 1).
   * Lo aplican el server al mover (`walkSpeed`) y el cliente al animar.
   */
  speed?: number;
  /** Ropa de recién llegado (`NEWBIE_CLOTHING`): la trae el jugador nuevo y ninguna tienda la vende. */
  newbie?: boolean;
}

export type ClothingItem = { [S in ItemSlot]: ClothingOf<S> }[ItemSlot];

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

/** Nivel de un instrumento: 1 = armónica … 4 = tambor de candombe. */
export type InstrumentTier = 1 | 2 | 3 | 4;

/** Cómo se dibuja el instrumento en las manos del avatar y en el ícono. */
export type InstrumentKind = "harmonica" | "guitar" | "bandoneon" | "drum";

/**
 * Instrumento para tocar en la calle (el Centro: 18 de Julio y sus plazas). Hay que tener uno en la
 * mochila; se usa siempre el de mayor nivel. Los mejores dejan más propina, más seguido y más
 * rápido; y cuanta más gente escuchando alrededor, más dejan (ver `busking.ts`).
 */
export interface InstrumentItem extends ItemBase {
  category: "instrument";
  tier: InstrumentTier;
  kind: InstrumentKind;
  /** Lo que se toca, para el globo al empezar: "♪ Un candombe". */
  song: string;
  /** Lo que deja una propina, en pesos enteros (sin gente escuchando). */
  tipMin: number;
  tipMax: number;
  /** Probabilidad (0–1) de que nadie deje nada. */
  noTipChance: number;
  /** Multiplica la espera hasta la propina (menos de 1 = antes). */
  waitFactor: number;
  /** Temas que aguanta (cada uno gasta un uso, dejen o no); después se rompe. */
  maxUses: number;
}

/**
 * Herramientas: cañas, carritos e instrumentos. Se gastan con el uso (`maxUses`), no se apilan (cada
 * una ocupa su casillero y lleva sus `uses` restantes) y, como se rompen, hay que volver a
 * comprarlas: eso mantiene vivo el mercado.
 */
export type ToolItem = RodItem | CartItem | InstrumentItem;

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
export type FoodShape = "tortaFrita" | "alfajor" | "mate" | "pancho" | "chivito" | "fishPlate" | "coffee" | "beer" | "sparkling" | "liqueur" | "whisky";

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

/**
 * Carta: algo que hay que llevarle a alguien (el sobre de la bienvenida, `welcome.ts`). No se
 * intercambia (`untradable`); se puede vender en el Kiosco de la Plaza o tirar (`droppable`).
 */
export interface LetterItem extends ItemBase {
  category: "letter";
}

export type ItemDefinition = ClothingItem | FishItem | FoodItem | MedicineItem | RodItem | CartItem | InstrumentItem | BoxItem | TicketItem | LetterItem;

/** El ítem sin `category` (la pone el armador). Distributivo, para que la ropa siga atando `slot` y `style`. */
type CatalogEntry<T> = T extends unknown ? Omit<T, "category"> : never;

const clothing = (items: CatalogEntry<ClothingItem>[]): ClothingItem[] =>
  items.map((item) => ({ ...item, category: "clothing" }));
const fish = (items: CatalogEntry<FishItem>[]): FishItem[] => items.map((item) => ({ ...item, category: "fish" }));

export const CLOTHING: readonly ClothingItem[] = clothing([
  { id: "gorra-azul", name: "Gorra azul", slot: "hat", style: "cap", color: "#1d4fa0", price: 320 },
  // Era el regalo de la guía de bienvenida (ya no existe): ninguna tienda la vende.
  { id: "gorra-celeste", name: "Gorra celeste", slot: "hat", style: "cap", color: "#6cace4", price: 400 },
  { id: "gorro-lana", name: "Gorro de lana", slot: "hat", style: "beanie", color: "#b5651d", price: 280 },
  { id: "boina-negra", name: "Boina negra", slot: "hat", style: "beret", color: "#26262b", price: 400 },
  { id: "remera-blanca", name: "Remera blanca", slot: "top", style: "tshirt", color: "#f1f1f1", price: 320 },
  { id: "remera-roja", name: "Remera roja", slot: "top", style: "tshirt", color: "#e63946", price: 320 },
  { id: "remera-negra", name: "Remera negra", slot: "top", style: "tshirt", color: "#26262b", price: 320 },
  { id: "camiseta-celeste", name: "Camiseta celeste", slot: "top", style: "jersey", color: "#6cace4", price: 720 },
  { id: "buzo-gris", name: "Buzo gris", slot: "top", style: "hoodie", color: "#7a828c", price: 800 },
  { id: "musculosa-blanca", name: "Musculosa blanca", slot: "top", style: "tank", color: "#f1f1f1", price: 240 },
  { id: "jean", name: "Jean", slot: "bottom", style: "jeans", color: "#2b3a55", price: 640 },
  { id: "pantalon-beige", name: "Pantalón beige", slot: "bottom", style: "pants", color: "#c8b28a", price: 560 },
  { id: "short-verde", name: "Short verde", slot: "bottom", style: "shorts", color: "#3d6b4f", price: 240 },
  { id: "short-azul", name: "Short azul", slot: "bottom", style: "shorts", color: "#1d4fa0", price: 240 },
  { id: "championes-blancos", name: "Championes blancos", slot: "shoes", style: "sneakers", color: "#f0f0f0", price: 640 },
  { id: "championes-rojos", name: "Championes rojos", slot: "shoes", style: "sneakers", color: "#c0392b", price: 640 },
  { id: "botas-marrones", name: "Botas marrones", slot: "shoes", style: "boots", color: "#6b3e1e", price: 880 },
  { id: "chancletas", name: "Chancletas", slot: "shoes", style: "flipflops", color: "#2a9d8f", price: 120 },
]);

/**
 * Moda coreana: prendas que sólo se venden en el Barrio de los Judíos (los locales coreanos de la
 * calle Inca). Mismos estilos que el resto, otros colores; no están en `CLOTHING` para que las otras
 * roperías ("todo el catálogo") no las tengan.
 */
export const KOREAN_FASHION: readonly ClothingItem[] = clothing([
  { id: "buzo-lila", name: "Buzo lila", slot: "top", style: "hoodie", color: "#b39ddb", price: 880 },
  { id: "buzo-negro-oversize", name: "Buzo negro oversize", slot: "top", style: "hoodie", color: "#1f1f24", price: 960 },
  { id: "remera-rosa-pastel", name: "Remera rosa pastel", slot: "top", style: "tshirt", color: "#f4b6c2", price: 360 },
  { id: "gorra-negra", name: "Gorra negra", slot: "hat", style: "cap", color: "#1f1f24", price: 360 },
  { id: "jean-nevado", name: "Jean nevado", slot: "bottom", style: "jeans", color: "#8fb3d9", price: 720 },
  { id: "pantalon-cargo", name: "Pantalón cargo", slot: "bottom", style: "pants", color: "#6b6b3a", price: 640 },
  { id: "championes-negros", name: "Championes negros", slot: "shoes", style: "sneakers", color: "#2b2b30", price: 720 },
]);

/**
 * Ropa de vestir de London París, la gran tienda de 18 de Julio en el Centro: sólo se vende ahí. Más
 * cara que la del resto de las roperías (es "de tienda"); no está en `CLOTHING` por lo mismo que la
 * moda coreana.
 */
export const LONDON_PARIS_FASHION: readonly ClothingItem[] = clothing([
  { id: "boina-gris", name: "Boina gris", slot: "hat", style: "beret", color: "#7a7f87", price: 560 },
  { id: "buzo-bordo", name: "Buzo bordó", slot: "top", style: "hoodie", color: "#7b1e2b", price: 1040 },
  { id: "remera-azul-marino", name: "Remera azul marino", slot: "top", style: "tshirt", color: "#1b2a4a", price: 480 },
  { id: "pantalon-vestir-negro", name: "Pantalón de vestir negro", slot: "bottom", style: "pants", color: "#22232a", price: 960 },
  { id: "pantalon-vestir-gris", name: "Pantalón de vestir gris", slot: "bottom", style: "pants", color: "#6b6f78", price: 960 },
  { id: "botas-negras", name: "Botas negras", slot: "shoes", style: "boots", color: "#1d1d22", price: 1200 },
]);

/**
 * Calzado para caminar rápido: lo venden Calzados Sarandí (Ciudad Vieja) y Calzados 18 de Julio
 * (Centro). Cuanto más caro, más rápido se camina (`speed`). No están en `CLOTHING`, así las
 * roperías no los tienen.
 */
export const WALKING_SHOES: readonly ClothingItem[] = clothing([
  { id: "alpargatas", name: "Alpargatas", slot: "shoes", style: "flipflops", color: "#d8c3a5", price: 120 },
  { id: "championes-caminata", name: "Championes de caminata", slot: "shoes", style: "sneakers", color: "#8fa3ad", price: 800, speed: 1.1 },
  { id: "championes-deportivos", name: "Championes deportivos", slot: "shoes", style: "sneakers", color: "#2a9d8f", price: 2000, speed: 1.2 },
  { id: "championes-running", name: "Championes de running", slot: "shoes", style: "sneakers", color: "#f28c28", price: 4500, speed: 1.35 },
  { id: "championes-atleta", name: "Championes de atleta", slot: "shoes", style: "sneakers", color: "#e9b10a", price: 9000, speed: 1.5 },
]);

/**
 * Ropa de recién llegado: la musculosa y el short con los que aparece un jugador nuevo
 * (`STARTER_KIT`). Colores propios para que se note que es nuevo; ninguna tienda la vende (no está en
 * `CLOTHING`) y venderla da casi nada ($1 cada una, por `SELL_RATIO`).
 */
export const NEWBIE_CLOTHING: readonly ClothingItem[] = clothing([
  { id: "musculosa-novato", name: "Musculosa de recién llegado", slot: "top", style: "tank", color: "#f4d35e", price: 2, newbie: true },
  { id: "short-novato", name: "Short de recién llegado", slot: "bottom", style: "shorts", color: "#9aa3ad", price: 2, newbie: true },
]);

/**
 * Ropa de trabajo: la que da una profesión al elegirla (`PROFESSION_KIT`), como el chaleco flúo del
 * cuidacoches. Ninguna tienda la vende (no está en `CLOTHING`).
 */
export const SAFETY_VEST_ID = "chaleco-fluo";

export const WORK_CLOTHING: readonly ClothingItem[] = clothing([
  { id: SAFETY_VEST_ID, name: "Chaleco flúo", slot: "top", style: "vest", color: "#c6f432", price: 10 },
]);

/** "Ropa de recién llegado" para mostrar en la mochila (vacío si no lo es). */
export function newbiePerk(item: ClothingItem): string[] {
  return item.newbie ? ["🆕 Ropa de recién llegado: no se vende en tiendas"] : [];
}

/** Velocidad al caminar con el calzado `shoesId` puesto (1 si no tiene o no es de los rápidos). */
export function walkSpeed(shoesId: string | undefined): number {
  const item = shoesId ? ITEMS.find((candidate) => candidate.id === shoesId) : undefined;
  return item?.category === "clothing" && item.speed ? item.speed : 1;
}

/** "Caminás más rápido" (en palabras, ver `fasterLabel`) para mostrar en la tienda y la mochila (vacío si no da velocidad). */
export function speedPerk(item: ClothingItem): string[] {
  return item.speed && item.speed > 1 ? [`👟 Caminás ${fasterLabel(item.speed - 1)}`] : [];
}

/**
 * Peces del Río de la Plata que se sacan desde la Escollera Sarandí. Cuanto más difícil, menos
 * pica (`catchWeight`), más tarda en picar y más paga el Mercado del Puerto (`price`).
 */
export const FISH: readonly FishItem[] = fish([
  { id: "pejerrey", name: "Pejerrey", gender: "m", difficulty: 1, shape: "fish", color: "#b8c4cc", price: 6, catchWeight: 30 },
  { id: "lisa", name: "Lisa", gender: "f", difficulty: 1, shape: "fish", color: "#9aa7a0", price: 7, catchWeight: 24 },
  { id: "bagre", name: "Bagre", gender: "m", difficulty: 2, shape: "fish", color: "#6b5a4a", price: 10, catchWeight: 18 },
  { id: "burriqueta", name: "Burriqueta", gender: "f", difficulty: 2, shape: "fish", color: "#c9a66b", price: 13, catchWeight: 14 },
  { id: "pescadilla", name: "Pescadilla", gender: "f", difficulty: 3, shape: "fish", color: "#d9cbb0", price: 20, catchWeight: 10 },
  { id: "corvina-blanca", name: "Corvina blanca", gender: "f", difficulty: 3, shape: "fish", color: "#cfc6b8", price: 25, catchWeight: 9 },
  { id: "brotola", name: "Brótola", gender: "f", difficulty: 3, shape: "fish", color: "#a0614a", price: 22, catchWeight: 8 },
  { id: "lenguado", name: "Lenguado", gender: "m", difficulty: 4, shape: "flat", color: "#8a7a5c", price: 70, catchWeight: 4 },
  { id: "corvina-negra", name: "Corvina negra", gender: "f", difficulty: 5, shape: "fish", color: "#3e3a38", price: 150, catchWeight: 2 },
]);

const food = (items: CatalogEntry<FoodItem>[]): FoodItem[] => items.map((item) => ({ ...item, category: "food" }));

/**
 * Comidas. Las baratas llenan poco (o dan sobre todo energía, como el mate); las caras llenan
 * mucho. Ver el balance en `docs/finished/necesidades-del-personaje.md`.
 */
export const FOODS: readonly FoodItem[] = food([
  { id: "torta-frita", name: "Torta frita", shape: "tortaFrita", color: "#d9a35b", price: 10, hunger: 15, energy: 5, health: 0 },
  { id: "alfajor", name: "Alfajor", shape: "alfajor", color: "#6b3e1e", price: 15, hunger: 10, energy: 15, health: 0 },
  { id: "mate", name: "Mate", shape: "mate", color: "#7a9a3a", price: 20, hunger: 5, energy: 30, health: 0 },
  { id: "pancho", name: "Pancho", shape: "pancho", color: "#c0392b", price: 25, hunger: 30, energy: 5, health: 0 },
  { id: "pescado-plancha", name: "Pescado a la plancha", shape: "fishPlate", color: "#d9cbb0", price: 45, hunger: 45, energy: 10, health: 10 },
  { id: "chivito", name: "Chivito", shape: "chivito", color: "#e0a84a", price: 90, hunger: 70, energy: 10, health: 10 },
]);

/**
 * Tragos de la barra del casino: casi no llenan, dan sobre todo energía (ninguno rinde más que el
 * mate por peso). No entran en `FOODS`: no los vende el Mercado ni cuentan para "la comida más barata".
 */
export const DRINKS: readonly FoodItem[] = food([
  { id: "cafe", name: "Café", shape: "coffee", color: "#5b3a24", price: 20, hunger: 2, energy: 25, health: 0 },
  { id: "cerveza", name: "Cerveza", shape: "beer", color: "#e9b10a", price: 30, hunger: 5, energy: 12, health: 0 },
  { id: "grappamiel", name: "Grappamiel", shape: "liqueur", color: "#d98e1c", price: 35, hunger: 1, energy: 22, health: 0 },
  { id: "medio-y-medio", name: "Medio y medio", shape: "sparkling", color: "#f2e3a0", price: 45, hunger: 3, energy: 28, health: 0 },
  { id: "whisky", name: "Whisky", shape: "whisky", color: "#b5651d", price: 80, hunger: 1, energy: 45, health: 0 },
]);

const medicine = (items: CatalogEntry<MedicineItem>[]): MedicineItem[] =>
  items.map((item) => ({ ...item, category: "medicine" }));

/**
 * Remedios de la farmacia. Curan salud en el momento y se llevan en la mochila; por punto salen
 * algo más caros que la guardia del sanatorio ($1 por punto), que hay que ir hasta Tres Cruces.
 */
export const MEDICINES: readonly MedicineItem[] = medicine([
  { id: "curitas", name: "Curitas", shape: "bandage", color: "#e8b48a", price: 10, health: 5, energy: 0 },
  { id: "perifar", name: "Perifar", shape: "pills", color: "#d7263d", price: 25, health: 15, energy: 0 },
  { id: "vitaminas", name: "Vitaminas", shape: "vitamins", color: "#f2a541", price: 40, health: 10, energy: 20 },
  { id: "botiquin", name: "Botiquín", shape: "kit", color: "#2e9e5b", price: 120, health: 50, energy: 0 },
]);

/** Caña con la que arranca todo jugador nuevo (en la mochila). */
export const BASIC_ROD_ID = "cana-basica";

/** Cañas de pescar, de la básica a la profesional. Se compran en Pesca Sarandí. */
export const RODS: readonly RodItem[] = [
  { id: BASIC_ROD_ID, name: "Caña básica", category: "rod", tier: 1, color: "#8a6a45", price: 60, rareBoost: 0, nothingChance: 0.3, doubleChance: 0, waitFactor: 1, maxUses: 60 },
  { id: "cana-fibra", name: "Caña de fibra", category: "rod", tier: 2, color: "#2a9d8f", price: 500, rareBoost: 0.35, nothingChance: 0.2, doubleChance: 0.05, waitFactor: 0.9, maxUses: 100 },
  { id: "cana-carbono", name: "Caña de carbono", category: "rod", tier: 3, color: "#3a3f4c", price: 1300, rareBoost: 0.65, nothingChance: 0.14, doubleChance: 0.1, waitFactor: 0.8, maxUses: 150 },
  { id: "cana-profesional", name: "Caña profesional", category: "rod", tier: 4, color: "#c9a227", price: 3000, rareBoost: 1.05, nothingChance: 0.08, doubleChance: 0.18, waitFactor: 0.7, maxUses: 200 },
];

const cart = (items: CatalogEntry<CartItem>[]): CartItem[] => items.map((item) => ({ ...item, category: "cart" }));

/** Carritos de venta, de la conservadora a la parrillita. Se compran en el Kiosco del Parque. */
export const CARTS: readonly CartItem[] = cart([
  { id: "conservadora", name: "Conservadora", tier: 1, color: "#2a7bd1", price: 60, product: "un refresco", cry: "¡Refresco, refresquito frío!", saleMin: 10, saleMax: 16, noSaleChance: 0.25, giftChance: 0.004, waitFactor: 1, maxUses: 60 },
  { id: "carrito-garrapinada", name: "Carrito de garrapiñada", tier: 2, color: "#c1440e", price: 500, product: "una garrapiñada", cry: "¡Garrapiñada, garrapiñada!", saleMin: 18, saleMax: 26, noSaleChance: 0.2, giftChance: 0.006, waitFactor: 0.9, maxUses: 100 },
  { id: "carrito-panchos", name: "Carrito de panchos", tier: 3, color: "#e9b10a", price: 1300, product: "un pancho", cry: "¡Panchos, panchos calentitos!", saleMin: 28, saleMax: 38, noSaleChance: 0.15, giftChance: 0.009, waitFactor: 0.8, maxUses: 150 },
  { id: "parrillita-choripan", name: "Parrillita de choripán", tier: 4, color: "#7a2e1e", price: 3000, product: "un choripán", cry: "¡Choripán, choripán al pan!", saleMin: 40, saleMax: 54, noSaleChance: 0.1, giftChance: 0.014, waitFactor: 0.7, maxUses: 200 },
]);

const instrument = (items: CatalogEntry<InstrumentItem>[]): InstrumentItem[] => items.map((item) => ({ ...item, category: "instrument" }));

/** Instrumentos para tocar en la calle: los vende la Casa de Música del Centro. */
export const INSTRUMENTS: readonly InstrumentItem[] = instrument([
  { id: "armonica", name: "Armónica", tier: 1, kind: "harmonica", song: "♪ Un blues con la armónica", color: "#9aa3ad", price: 60, tipMin: 10, tipMax: 16, noTipChance: 0.25, waitFactor: 1, maxUses: 60 },
  { id: "guitarra", name: "Guitarra criolla", tier: 2, kind: "guitar", song: "♪ Una de Los Olimareños", color: "#b5651d", price: 500, tipMin: 18, tipMax: 26, noTipChance: 0.2, waitFactor: 0.9, maxUses: 100 },
  { id: "bandoneon", name: "Bandoneón", tier: 3, kind: "bandoneon", song: "♪ La Cumparsita", color: "#2b2b30", price: 1300, tipMin: 28, tipMax: 38, noTipChance: 0.15, waitFactor: 0.8, maxUses: 150 },
  { id: "tambor-candombe", name: "Tambor de candombe", tier: 4, kind: "drum", song: "♪ ¡Candombe! Chico, repique y piano", color: "#c0392b", price: 3000, tipMin: 40, tipMax: 54, noTipChance: 0.1, waitFactor: 0.7, maxUses: 200 },
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

/** El boleto de STM (`TicketItem`): lo que gasta viajar entre barrios. */
export const TICKET_ID = "boleto-stm";

export const TICKETS: readonly TicketItem[] = [
  { id: TICKET_ID, name: "Boleto STM", category: "ticket", color: "#1d6fb8", price: TRAVEL_FARE },
];

export const LETTERS: readonly LetterItem[] = [
  { id: WELCOME_LETTER_ID, name: "Sobre de bienvenida", category: "letter", color: "#e9dcc0", price: 10 },
];

export const ITEMS: readonly ItemDefinition[] = [...CLOTHING, ...KOREAN_FASHION, ...LONDON_PARIS_FASHION, ...WALKING_SHOES, ...NEWBIE_CLOTHING, ...WORK_CLOTHING, ...FISH, ...FOODS, ...DRINKS, ...MEDICINES, ...RODS, ...CARTS, ...INSTRUMENTS, ...BOXES, ...TICKETS, ...LETTERS];

/** Una tienda paga por una prenda usada esta fracción de su precio. */
export const SELL_RATIO = 0.5;

/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
export const FISH_BUY_MARKUP = 1.5;

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
  /** No se puede ofrecer en un intercambio. */
  untradable?: boolean;
  /** Se puede tirar desde la mochila (`inventory:drop`). */
  droppable?: boolean;
}

/**
 * Todas las categorías, en el orden en que se muestran (p. ej. en el maker). Para una nueva: sumarla
 * a `ItemCategory` y acá; TypeScript pide después su ícono (`ItemIcon.tsx`), su vista en la mochila
 * (`Backpack.tsx`) y qué hace en la barra rápida (`itemActions.ts`).
 */
export const ITEM_CATEGORIES: Record<ItemCategory, ItemCategoryInfo> = {
  clothing: {
    label: "ropa",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Por la ropa usada te pagan la mitad.",
    nothingToSell:
      "No tenés ropa en la mochila para vender. Lo que tenés puesto no se vende: sacátelo primero desde la mochila.",
  },
  fish: {
    label: "pescado",
    tool: false,
    buyMarkup: FISH_BUY_MARKUP,
    sellRatio: 1,
    sellNote: "El pescado se paga a precio completo.",
    buyNote: "Comprar pescado sale bastante más caro de lo que paga el mercado.",
    nothingToSell: "No tenés pescados en la mochila. Pescá en la Escollera Sarandí y volvé.",
  },
  food: {
    label: "comida",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "",
    buyNote: "La comida llena el hambre y da energía: se come desde la mochila o la barra rápida (1–9).",
    nothingToSell: "No tenés comida en la mochila.",
  },
  medicine: {
    label: "remedios",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "",
    buyNote: "Los remedios curan salud al momento: se toman desde la mochila o la barra rápida (1–9).",
    nothingToSell: "No tenés remedios en la mochila.",
  },
  rod: {
    label: "cañas",
    tool: true,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Por una caña te pagan la mitad de su precio, menos cuanto más gastada esté.",
    buyNote: "Pescás siempre con la mejor caña que tengas en la mochila; cada tirada la gasta y al final se rompe.",
    nothingToSell: "No tenés cañas en la mochila para vender.",
  },
  cart: {
    label: "carritos",
    tool: true,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Por un carrito te pagan la mitad de su precio, menos cuanto más gastado esté.",
    buyNote:
      "Vendés siempre con el mejor carrito de la mochila, parado en la Explanada del Centenario; cada intento lo gasta y al final se rompe.",
    nothingToSell: "No tenés carritos en la mochila para vender.",
  },
  instrument: {
    label: "instrumentos",
    tool: true,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Por un instrumento te pagan la mitad de su precio, menos cuanto más gastado esté.",
    buyNote:
      "Tocás siempre con el mejor instrumento de la mochila, sobre 18 de Julio o en las plazas del Centro; cada tema lo gasta y al final se rompe.",
    nothingToSell: "No tenés instrumentos en la mochila para vender.",
  },
  ticket: {
    label: "boletos",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Por un boleto sin usar te pagan la mitad.",
    buyNote: "Cada viaje en ómnibus a otro barrio usa un boleto. Se guardan en la mochila y se pueden intercambiar.",
    nothingToSell: "No tenés boletos en la mochila para vender.",
  },
  box: {
    label: "cajas",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "",
    nothingToSell: "No tenés cajas en la mochila para vender.",
  },
  letter: {
    label: "cartas",
    tool: false,
    buyMarkup: 1,
    sellRatio: SELL_RATIO,
    sellNote: "Ojo: si vendés el sobre de bienvenida, se termina la misión y te toca ser cuidacoches.",
    nothingToSell: "No tenés cartas en la mochila.",
    untradable: true,
    droppable: true,
  },
};

/** ¿Se puede ofrecer en un intercambio? (El sobre de la bienvenida, no.) */
export function isTradable(item: ItemDefinition | undefined): boolean {
  return item !== undefined && !ITEM_CATEGORIES[item.category].untradable;
}

export const ITEM_CATEGORY_IDS = Object.keys(ITEM_CATEGORIES) as ItemCategory[];

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

export function isInstrument(item: ItemDefinition | undefined): item is InstrumentItem {
  return item?.category === "instrument";
}

/** El instrumento de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguno. */
export function bestInstrument(itemIds: Iterable<string>): InstrumentItem | undefined {
  let best: InstrumentItem | undefined;
  for (const id of itemIds) {
    const item = getItem(id);
    if (isInstrument(item) && (!best || item.tier > best.tier)) best = item;
  }
  return best;
}

/** "★★☆☆" para mostrar el nivel de un instrumento. */
export function instrumentStars(tier: InstrumentTier): string {
  return "★".repeat(tier) + "☆".repeat(4 - tier);
}

export function isFood(item: ItemDefinition | undefined): item is FoodItem {
  return item?.category === "food";
}

/** Lo que da comer algo: saciedad, energía y salud (negativa: hace mal). */
export interface EdibleValue {
  hunger: number;
  energy: number;
  health: number;
  /** Pescado crudo: la salud que saca nunca la deja por debajo de `RAW_FISH_HEALTH_FLOOR` (`needs.ts`). */
  raw?: boolean;
}

/** Salud que saca un pescado crudo (lo mismo que `RAW_FISH_HEALTH` en `needs.ts`). */
const RAW_FISH_DAMAGE = 2;

/**
 * Qué da comerse (o tomarse, un remedio) este ítem, o undefined si no. La comida y los remedios, lo suyo; un pescado crudo llena
 * según su dificultad (pejerrey +10 … corvina negra +30), da la mitad de eso en energía y saca un
 * poco de salud.
 */
export function edibleValue(item: ItemDefinition | undefined): EdibleValue | undefined {
  if (isFood(item)) return { hunger: item.hunger, energy: item.energy, health: item.health };
  if (item?.category === "medicine") return { hunger: 0, energy: item.energy, health: item.health };
  if (item?.category === "fish") {
    const hunger = 5 + item.difficulty * 5;
    return { hunger, energy: Math.round(hunger / 2), health: -RAW_FISH_DAMAGE, raw: true };
  }
  return undefined;
}

/** "🍖 +30 · ⚡ +5 · ❤ +10" (o "❤ −2, crudo"): lo que da comerlo, para la mochila, la tienda y la barra rápida. */
export function edibleLabel(value: EdibleValue): string {
  const health = value.health > 0 ? `❤ +${value.health}` : value.health < 0 ? `❤ −${-value.health}${value.raw ? ", crudo" : ""}` : "";
  return [value.hunger > 0 && `🍖 +${value.hunger}`, value.energy > 0 && `⚡ +${value.energy}`, health].filter(Boolean).join(" · ");
}

export function isTicket(item: ItemDefinition | undefined): item is TicketItem {
  return item?.category === "ticket";
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

/** Lo que tiene en la mochila un jugador nuevo: una torta frita (arranca con hambre, `STARTING_HUNGER`). */
export const STARTER_INVENTORY: readonly string[] = ["torta-frita"];

/**
 * Kit con el que aparece un jugador nuevo, puesto: la ropa de recién llegado (`NEWBIE_CLOTHING`),
 * descalzo (y en la mochila, `STARTER_INVENTORY`). Si un lugar tiene varias opciones, se elige una al azar.
 */
export const STARTER_KIT: Readonly<Partial<Record<ItemSlot, readonly string[]>>> = {
  top: ["musculosa-novato"],
  bottom: ["short-novato"],
};

/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
export const INVENTORY_CAPACITY = 20;
export const MAX_STACK = 99;

/** Pila de prendas iguales en un casillero de la mochila. */
export interface InventoryStack {
  itemId: string;
  quantity: number;
  /** Sólo herramientas (cañas, carritos, instrumentos; siempre de a una): usos que le quedan. */
  uses?: number;
  /**
   * Casillero de la mochila (0 … capacidad − 1) donde está la pila: el jugador los reordena
   * (`inventory:move`) y puede haber huecos. Lo pone el server; una unidad suelta (lo que sale de
   * `Inventory.remove`, una oferta) no lo lleva.
   */
  slot?: number;
}

export function isTool(item: ItemDefinition | undefined): item is ToolItem {
  return item !== undefined && ITEM_CATEGORIES[item.category].tool;
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

/** Índice por id: `getItem` se llama en cada operación de mochila y tienda. */
const ITEMS_BY_ID = new Map<string, ItemDefinition>(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID.get(id);
}

export function isItemSlot(value: unknown): value is ItemSlot {
  return typeof value === "string" && (ITEM_SLOTS as readonly string[]).includes(value);
}

/**
 * Lo que cuesta comprar un ítem en una tienda: su precio por el recargo de su categoría (el pescado
 * sale más) y por el `priceFactor` de la tienda (los mayoristas venden más barato).
 */
export function buyPrice(item: ItemDefinition, priceFactor = 1): number {
  return Math.ceil(item.price * ITEM_CATEGORIES[item.category].buyMarkup * priceFactor);
}

/**
 * Lo que paga una tienda: el precio por el `sellRatio` de su categoría (la mitad por ropa usada, el
 * completo por pescado; mínimo $1). Una herramienta gastada vale en proporción a los `uses` que le quedan.
 */
export function sellPrice(item: ItemDefinition, uses?: number): number {
  const base = item.price * ITEM_CATEGORIES[item.category].sellRatio;
  const wear = isTool(item) && uses !== undefined ? Math.min(1, Math.max(0, uses / item.maxUses)) : 1;
  return Math.max(1, Math.floor(base * wear));
}
