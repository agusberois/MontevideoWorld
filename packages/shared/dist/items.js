"use strict";
/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`Avatar.ts`, `ItemIcon.tsx`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FISH_BUY_MARKUP = exports.SELL_RATIO = exports.LOW_USES = exports.MAX_STACK = exports.INVENTORY_CAPACITY = exports.STARTER_KIT = exports.STARTER_INVENTORY = exports.ITEM_CATEGORY_LABELS = exports.ITEMS = exports.BOXES = exports.MYSTERY_BOX_ID = exports.CARTS = exports.RODS = exports.BASIC_ROD_ID = exports.FISH = exports.CLOTHING = exports.ITEM_SLOT_LABELS = exports.ITEM_SLOTS = void 0;
exports.isRod = isRod;
exports.bestRod = bestRod;
exports.rodStars = rodStars;
exports.isCart = isCart;
exports.bestCart = bestCart;
exports.cartStars = cartStars;
exports.isBox = isBox;
exports.lootChances = lootChances;
exports.rollLoot = rollLoot;
exports.isClothing = isClothing;
exports.getClothing = getClothing;
exports.fishWithArticle = fishWithArticle;
exports.difficultyStars = difficultyStars;
exports.isTool = isTool;
exports.maxStack = maxStack;
exports.stackUses = stackUses;
exports.wornestStack = wornestStack;
exports.usesLabel = usesLabel;
exports.getItem = getItem;
exports.isItemSlot = isItemSlot;
exports.buyPrice = buyPrice;
exports.sellPrice = sellPrice;
exports.ITEM_SLOTS = ["hat", "top", "bottom", "shoes"];
exports.ITEM_SLOT_LABELS = {
    hat: "Cabeza",
    top: "Torso",
    bottom: "Piernas",
    shoes: "Pies",
};
const clothing = (items) => items.map((item) => ({ ...item, category: "clothing" }));
const fish = (items) => items.map((item) => ({ ...item, category: "fish" }));
exports.CLOTHING = clothing([
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
exports.FISH = fish([
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
exports.BASIC_ROD_ID = "cana-basica";
/** Cañas de pescar, de la básica a la profesional. Se compran en Pesca Sarandí. */
exports.RODS = [
    { id: exports.BASIC_ROD_ID, name: "Caña básica", category: "rod", tier: 1, color: "#8a6a45", price: 30, rareBoost: 0, nothingChance: 0.2, doubleChance: 0, waitFactor: 1, maxUses: 40 },
    { id: "cana-fibra", name: "Caña de fibra", category: "rod", tier: 2, color: "#2a9d8f", price: 150, rareBoost: 0.2, nothingChance: 0.15, doubleChance: 0.05, waitFactor: 0.9, maxUses: 80 },
    { id: "cana-carbono", name: "Caña de carbono", category: "rod", tier: 3, color: "#3a3f4c", price: 450, rareBoost: 0.4, nothingChance: 0.1, doubleChance: 0.12, waitFactor: 0.8, maxUses: 110 },
    { id: "cana-profesional", name: "Caña profesional", category: "rod", tier: 4, color: "#c9a227", price: 1200, rareBoost: 0.7, nothingChance: 0.06, doubleChance: 0.25, waitFactor: 0.7, maxUses: 150 },
];
const cart = (items) => items.map((item) => ({ ...item, category: "cart" }));
/** Carritos de venta, de la conservadora a la parrillita. Se compran en el Kiosco del Parque. */
exports.CARTS = cart([
    { id: "conservadora", name: "Conservadora", tier: 1, color: "#2a7bd1", price: 35, product: "un refresco", cry: "¡Refresco, refresquito frío!", saleMin: 3, saleMax: 6, noSaleChance: 0.25, giftChance: 0.01, waitFactor: 1, maxUses: 40 },
    { id: "carrito-garrapinada", name: "Carrito de garrapiñada", tier: 2, color: "#c1440e", price: 160, product: "una garrapiñada", cry: "¡Garrapiñada, garrapiñada!", saleMin: 6, saleMax: 10, noSaleChance: 0.2, giftChance: 0.02, waitFactor: 0.9, maxUses: 80 },
    { id: "carrito-panchos", name: "Carrito de panchos", tier: 3, color: "#e9b10a", price: 480, product: "un pancho", cry: "¡Panchos, panchos calentitos!", saleMin: 10, saleMax: 16, noSaleChance: 0.15, giftChance: 0.035, waitFactor: 0.8, maxUses: 110 },
    { id: "parrillita-choripan", name: "Parrillita de choripán", tier: 4, color: "#7a2e1e", price: 1250, product: "un choripán", cry: "¡Choripán, choripán al pan!", saleMin: 16, saleMax: 26, noSaleChance: 0.1, giftChance: 0.05, waitFactor: 0.7, maxUses: 150 },
]);
/** Caja que da el comando de admin `/box`. */
exports.MYSTERY_BOX_ID = "caja-sorpresa";
/**
 * Cajas sorpresa. No se compran ni se venden en tiendas: las reparte el admin y se pueden pasar por
 * intercambio. Los pesos de la caja de peces suman 100, así cada número es directamente el %.
 */
exports.BOXES = [
    {
        id: exports.MYSTERY_BOX_ID,
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
exports.ITEMS = [...exports.CLOTHING, ...exports.FISH, ...exports.RODS, ...exports.CARTS, ...exports.BOXES];
exports.ITEM_CATEGORY_LABELS = {
    clothing: "ropa",
    fish: "pescado",
    rod: "cañas",
    cart: "carritos",
    box: "cajas",
};
function isRod(item) {
    return item?.category === "rod";
}
/** La caña de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguna. */
function bestRod(itemIds) {
    let best;
    for (const id of itemIds) {
        const item = getItem(id);
        if (isRod(item) && (!best || item.tier > best.tier))
            best = item;
    }
    return best;
}
/** "★★☆☆" para mostrar el nivel de una caña. */
function rodStars(tier) {
    return "★".repeat(tier) + "☆".repeat(4 - tier);
}
function isCart(item) {
    return item?.category === "cart";
}
/** El carrito de mayor nivel entre estos ids (los de la mochila), o undefined si no hay ninguno. */
function bestCart(itemIds) {
    let best;
    for (const id of itemIds) {
        const item = getItem(id);
        if (isCart(item) && (!best || item.tier > best.tier))
            best = item;
    }
    return best;
}
/** "★★☆☆" para mostrar el nivel de un carrito. */
function cartStars(tier) {
    return "★".repeat(tier) + "☆".repeat(4 - tier);
}
function isBox(item) {
    return item?.category === "box";
}
/** Probabilidad (0–1) de cada premio de una caja, para mostrarla en la UI. */
function lootChances(box) {
    const total = box.loot.reduce((sum, entry) => sum + entry.weight, 0);
    return box.loot.flatMap((entry) => {
        const item = getItem(entry.itemId);
        return item ? [{ item, chance: entry.weight / total }] : [];
    });
}
/** Sortea el premio de una caja según los pesos de su `loot`. */
function rollLoot(box, random = Math.random) {
    const chances = lootChances(box);
    let roll = random();
    for (const { item, chance } of chances) {
        roll -= chance;
        if (roll < 0)
            return item;
    }
    return chances[chances.length - 1].item;
}
function isClothing(item) {
    return item?.category === "clothing";
}
/** La prenda `id` del catálogo, o undefined si no existe o no es ropa. */
function getClothing(id) {
    const item = getItem(id);
    return isClothing(item) ? item : undefined;
}
/** "un pejerrey", "una corvina blanca": para usar en medio de una oración. */
function fishWithArticle(fish) {
    return `${fish.gender === "f" ? "una" : "un"} ${fish.name.toLowerCase()}`;
}
/** "★★★☆☆" para mostrar la dificultad de un pescado. */
function difficultyStars(difficulty) {
    return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
}
/** Lo que tiene en la mochila un jugador nuevo: la caña básica para poder pescar. */
exports.STARTER_INVENTORY = [exports.BASIC_ROD_ID];
/**
 * Kit con el que aparece un jugador nuevo: una remera, un short y chancletas, puestos (y en la
 * mochila, `STARTER_INVENTORY`). De cada lista se elige una opción al azar (para que no estén todos vestidos iguales).
 */
exports.STARTER_KIT = {
    top: ["remera-blanca", "remera-roja", "remera-negra"],
    bottom: ["short-verde", "short-azul"],
    shoes: ["chancletas"],
};
/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
exports.INVENTORY_CAPACITY = 20;
exports.MAX_STACK = 99;
function isTool(item) {
    return item?.category === "rod" || item?.category === "cart";
}
/** Cuántas unidades entran en un casillero: las herramientas van de a una (cada una con su desgaste). */
function maxStack(item) {
    return isTool(item) ? 1 : exports.MAX_STACK;
}
/** Usos que le quedan a una pila (una herramienta sin `uses` está nueva). */
function stackUses(stack) {
    const item = getItem(stack.itemId);
    return isTool(item) ? (stack.uses ?? item.maxUses) : 0;
}
/**
 * La unidad de `itemId` que se gasta, se vende o se intercambia primero: la más usada. Así una
 * herramienta se termina antes de empezar la siguiente igual. Para lo que no es herramienta, la
 * primera pila.
 */
function wornestStack(stacks, itemId) {
    let found;
    for (const stack of stacks) {
        if (stack.itemId !== itemId)
            continue;
        if (!found || stackUses(stack) < stackUses(found))
            found = stack;
    }
    return found;
}
/** Con estos usos o menos, la UI avisa que la herramienta está por romperse. */
exports.LOW_USES = 5;
/** "32/40 usos" para mostrar el desgaste de una herramienta. */
function usesLabel(item, uses) {
    return `${uses}/${item.maxUses} usos`;
}
function getItem(id) {
    return exports.ITEMS.find((item) => item.id === id);
}
function isItemSlot(value) {
    return typeof value === "string" && exports.ITEM_SLOTS.includes(value);
}
/** Una tienda paga por una prenda usada esta fracción de su precio. */
exports.SELL_RATIO = 0.5;
/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
exports.FISH_BUY_MARKUP = 1.5;
/** Lo que cuesta comprar un ítem en una tienda: la ropa a su precio, el pescado con recargo. */
function buyPrice(item) {
    if (item.category === "fish")
        return Math.ceil(item.price * exports.FISH_BUY_MARKUP);
    return item.price;
}
/**
 * Lo que paga una tienda: la mitad por ropa usada (mínimo $1), el precio completo por pescado. Una
 * herramienta gastada vale en proporción a los `uses` que le quedan.
 */
function sellPrice(item, uses) {
    if (item.category === "fish")
        return item.price;
    const half = item.price * exports.SELL_RATIO;
    const wear = isTool(item) && uses !== undefined ? Math.min(1, Math.max(0, uses / item.maxUses)) : 1;
    return Math.max(1, Math.floor(half * wear));
}
//# sourceMappingURL=items.js.map