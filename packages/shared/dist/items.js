"use strict";
/**
 * Catálogo de ítems: ropa (se pone en el avatar) y pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`Avatar.ts`, `ItemIcon.tsx`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FISH_BUY_MARKUP = exports.SELL_RATIO = exports.MAX_STACK = exports.INVENTORY_CAPACITY = exports.STARTER_KIT = exports.ITEM_CATEGORY_LABELS = exports.ITEMS = exports.FISH = exports.CLOTHING = exports.ITEM_SLOT_LABELS = exports.ITEM_SLOTS = void 0;
exports.isClothing = isClothing;
exports.getClothing = getClothing;
exports.fishWithArticle = fishWithArticle;
exports.difficultyStars = difficultyStars;
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
exports.ITEMS = [...exports.CLOTHING, ...exports.FISH];
exports.ITEM_CATEGORY_LABELS = {
    clothing: "ropa",
    fish: "pescado",
};
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
/**
 * Kit con el que aparece un jugador nuevo: una remera, un short y chancletas, puestos, y la mochila
 * vacía. De cada lista se elige una opción al azar (para que no estén todos vestidos iguales).
 */
exports.STARTER_KIT = {
    top: ["remera-blanca", "remera-roja", "remera-negra"],
    bottom: ["short-verde", "short-azul"],
    shoes: ["chancletas"],
};
/** Casilleros de la mochila. Cada casillero guarda una pila de prendas iguales. */
exports.INVENTORY_CAPACITY = 20;
exports.MAX_STACK = 99;
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
/** Lo que paga una tienda: la mitad por ropa usada (mínimo $1), el precio completo por pescado. */
function sellPrice(item) {
    if (item.category === "fish")
        return item.price;
    return Math.max(1, Math.floor(item.price * exports.SELL_RATIO));
}
//# sourceMappingURL=items.js.map