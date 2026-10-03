"use strict";
/**
 * Catálogo de ítems: ropa (se pone en el avatar), pescados (se sacan en la Escollera Sarandí y se
 * venden en el Mercado del Puerto), cañas de pescar (hacen falta para pescar; las mejores
 * mejoran la pesca), carritos de venta (hacen falta para vender en la explanada del Estadio
 * Centenario; los mejores venden más caro) y cajas sorpresa (se abren y dan un ítem al azar). Cliente y servidor lo comparten: el server valida y el cliente
 * dibuja cada prenda según su `style` (`game/objects/clothing/`, `ItemIcon.tsx`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOW_USES = exports.MAX_STACK = exports.INVENTORY_CAPACITY = exports.STARTER_KIT = exports.STARTER_INVENTORY = exports.ITEM_CATEGORY_IDS = exports.ITEM_CATEGORIES = exports.FISH_BUY_MARKUP = exports.SELL_RATIO = exports.ITEMS = exports.TICKETS = exports.TICKET_ID = exports.BOXES = exports.MYSTERY_BOX_ID = exports.CARTS = exports.RODS = exports.BASIC_ROD_ID = exports.MEDICINES = exports.FOODS = exports.FISH = exports.KOREAN_FASHION = exports.CLOTHING = exports.ITEM_STYLES = exports.ITEM_SLOT_LABELS = exports.ITEM_SLOTS = void 0;
exports.isRod = isRod;
exports.bestRod = bestRod;
exports.rodStars = rodStars;
exports.isCart = isCart;
exports.bestCart = bestCart;
exports.cartStars = cartStars;
exports.isFood = isFood;
exports.edibleValue = edibleValue;
exports.edibleLabel = edibleLabel;
exports.isTicket = isTicket;
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
const money_1 = require("./money");
exports.ITEM_SLOTS = ["hat", "top", "bottom", "shoes"];
exports.ITEM_SLOT_LABELS = {
    hat: "Cabeza",
    top: "Torso",
    bottom: "Piernas",
    shoes: "Pies",
};
/**
 * Estilos de prenda de cada lugar del cuerpo. El cliente dibuja cada uno en el avatar
 * (`game/objects/clothing/<lugar>.ts`) y en el ícono (`ItemIcon.tsx`): un estilo nuevo no compila
 * hasta tener los dos dibujos.
 */
exports.ITEM_STYLES = {
    hat: ["cap", "beanie", "beret"],
    top: ["tshirt", "jersey", "hoodie", "tank"],
    bottom: ["jeans", "pants", "shorts"],
    shoes: ["sneakers", "boots", "flipflops"],
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
 * Moda coreana: prendas que sólo se venden en el Barrio de los Judíos (los locales coreanos de la
 * calle Inca). Mismos estilos que el resto, otros colores; no están en `CLOTHING` para que las otras
 * roperías ("todo el catálogo") no las tengan.
 */
exports.KOREAN_FASHION = clothing([
    { id: "buzo-lila", name: "Buzo lila", slot: "top", style: "hoodie", color: "#b39ddb", price: 55 },
    { id: "buzo-negro-oversize", name: "Buzo negro oversize", slot: "top", style: "hoodie", color: "#1f1f24", price: 60 },
    { id: "remera-rosa-pastel", name: "Remera rosa pastel", slot: "top", style: "tshirt", color: "#f4b6c2", price: 22 },
    { id: "gorra-negra", name: "Gorra negra", slot: "hat", style: "cap", color: "#1f1f24", price: 22 },
    { id: "jean-nevado", name: "Jean nevado", slot: "bottom", style: "jeans", color: "#8fb3d9", price: 45 },
    { id: "pantalon-cargo", name: "Pantalón cargo", slot: "bottom", style: "pants", color: "#6b6b3a", price: 40 },
    { id: "championes-negros", name: "Championes negros", slot: "shoes", style: "sneakers", color: "#2b2b30", price: 45 },
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
const food = (items) => items.map((item) => ({ ...item, category: "food" }));
/**
 * Comidas. Las baratas llenan poco (o dan sobre todo energía, como el mate); las caras llenan
 * mucho. Ver el balance en `docs/finished/necesidades-del-personaje.md`.
 */
exports.FOODS = food([
    { id: "torta-frita", name: "Torta frita", shape: "tortaFrita", color: "#d9a35b", price: 10, hunger: 15, energy: 5, health: 0 },
    { id: "alfajor", name: "Alfajor", shape: "alfajor", color: "#6b3e1e", price: 15, hunger: 10, energy: 15, health: 0 },
    { id: "mate", name: "Mate", shape: "mate", color: "#7a9a3a", price: 20, hunger: 5, energy: 30, health: 0 },
    { id: "pancho", name: "Pancho", shape: "pancho", color: "#c0392b", price: 25, hunger: 30, energy: 5, health: 0 },
    { id: "pescado-plancha", name: "Pescado a la plancha", shape: "fishPlate", color: "#d9cbb0", price: 45, hunger: 45, energy: 10, health: 10 },
    { id: "chivito", name: "Chivito", shape: "chivito", color: "#e0a84a", price: 90, hunger: 70, energy: 10, health: 10 },
]);
const medicine = (items) => items.map((item) => ({ ...item, category: "medicine" }));
/**
 * Remedios de la farmacia. Curan salud en el momento y se llevan en la mochila; por punto salen
 * algo más caros que la guardia del sanatorio ($1 por punto), que hay que ir hasta Tres Cruces.
 */
exports.MEDICINES = medicine([
    { id: "curitas", name: "Curitas", shape: "bandage", color: "#e8b48a", price: 10, health: 5, energy: 0 },
    { id: "perifar", name: "Perifar", shape: "pills", color: "#d7263d", price: 25, health: 15, energy: 0 },
    { id: "vitaminas", name: "Vitaminas", shape: "vitamins", color: "#f2a541", price: 40, health: 10, energy: 20 },
    { id: "botiquin", name: "Botiquín", shape: "kit", color: "#2e9e5b", price: 120, health: 50, energy: 0 },
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
/** El boleto de STM (`TicketItem`): lo que gasta viajar entre barrios. */
exports.TICKET_ID = "boleto-stm";
exports.TICKETS = [
    { id: exports.TICKET_ID, name: "Boleto STM", category: "ticket", color: "#1d6fb8", price: money_1.TRAVEL_FARE },
];
exports.ITEMS = [...exports.CLOTHING, ...exports.KOREAN_FASHION, ...exports.FISH, ...exports.FOODS, ...exports.MEDICINES, ...exports.RODS, ...exports.CARTS, ...exports.BOXES, ...exports.TICKETS];
/** Una tienda paga por una prenda usada esta fracción de su precio. */
exports.SELL_RATIO = 0.5;
/**
 * Recargo de la pescadería al vender pescado: sale más caro que lo que paga por él, así comprar
 * para revender nunca conviene y pescar sigue siendo la forma de ganar plata.
 */
exports.FISH_BUY_MARKUP = 1.5;
/**
 * Todas las categorías, en el orden en que se muestran (p. ej. en el maker). Para una nueva: sumarla
 * a `ItemCategory` y acá; TypeScript pide después su ícono (`ItemIcon.tsx`), su vista en la mochila
 * (`Backpack.tsx`) y qué hace en la barra rápida (`itemActions.ts`).
 */
exports.ITEM_CATEGORIES = {
    clothing: {
        label: "ropa",
        tool: false,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "Por la ropa usada te pagan la mitad.",
        nothingToSell: "No tenés ropa en la mochila para vender. Lo que tenés puesto no se vende: sacátelo primero desde la mochila.",
    },
    fish: {
        label: "pescado",
        tool: false,
        buyMarkup: exports.FISH_BUY_MARKUP,
        sellRatio: 1,
        sellNote: "El pescado se paga a precio completo.",
        buyNote: `Comprar pescado sale ${Math.round((exports.FISH_BUY_MARKUP - 1) * 100)} % más de lo que paga el mercado.`,
        nothingToSell: "No tenés pescados en la mochila. Pescá en la Escollera Sarandí y volvé.",
    },
    food: {
        label: "comida",
        tool: false,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "",
        buyNote: "La comida llena el hambre y da energía: se come desde la mochila o la barra rápida (1–9).",
        nothingToSell: "No tenés comida en la mochila.",
    },
    medicine: {
        label: "remedios",
        tool: false,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "",
        buyNote: "Los remedios curan salud al momento: se toman desde la mochila o la barra rápida (1–9).",
        nothingToSell: "No tenés remedios en la mochila.",
    },
    rod: {
        label: "cañas",
        tool: true,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "Por una caña te pagan la mitad de su precio, menos cuanto más gastada esté.",
        buyNote: "Pescás siempre con la mejor caña que tengas en la mochila; cada tirada la gasta y al final se rompe.",
        nothingToSell: "No tenés cañas en la mochila para vender.",
    },
    cart: {
        label: "carritos",
        tool: true,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "Por un carrito te pagan la mitad de su precio, menos cuanto más gastado esté.",
        buyNote: "Vendés siempre con el mejor carrito de la mochila, parado en la Explanada del Centenario; cada intento lo gasta y al final se rompe.",
        nothingToSell: "No tenés carritos en la mochila para vender.",
    },
    ticket: {
        label: "boletos",
        tool: false,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "Por un boleto sin usar te pagan la mitad.",
        buyNote: "Cada viaje en ómnibus a otro barrio usa un boleto. Se guardan en la mochila y se pueden intercambiar.",
        nothingToSell: "No tenés boletos en la mochila para vender.",
    },
    box: {
        label: "cajas",
        tool: false,
        buyMarkup: 1,
        sellRatio: exports.SELL_RATIO,
        sellNote: "",
        nothingToSell: "No tenés cajas en la mochila para vender.",
    },
};
exports.ITEM_CATEGORY_IDS = Object.keys(exports.ITEM_CATEGORIES);
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
function isFood(item) {
    return item?.category === "food";
}
/** Salud que saca un pescado crudo (lo mismo que `RAW_FISH_HEALTH` en `needs.ts`). */
const RAW_FISH_DAMAGE = 2;
/**
 * Qué da comerse (o tomarse, un remedio) este ítem, o undefined si no. La comida y los remedios, lo suyo; un pescado crudo llena
 * según su dificultad (pejerrey +10 … corvina negra +30), da la mitad de eso en energía y saca un
 * poco de salud.
 */
function edibleValue(item) {
    if (isFood(item))
        return { hunger: item.hunger, energy: item.energy, health: item.health };
    if (item?.category === "medicine")
        return { hunger: 0, energy: item.energy, health: item.health };
    if (item?.category === "fish") {
        const hunger = 5 + item.difficulty * 5;
        return { hunger, energy: Math.round(hunger / 2), health: -RAW_FISH_DAMAGE, raw: true };
    }
    return undefined;
}
/** "🍖 +30 · ⚡ +5 · ❤ +10" (o "❤ −2, crudo"): lo que da comerlo, para la mochila, la tienda y la barra rápida. */
function edibleLabel(value) {
    const health = value.health > 0 ? `❤ +${value.health}` : value.health < 0 ? `❤ −${-value.health}${value.raw ? ", crudo" : ""}` : "";
    return [value.hunger > 0 && `🍖 +${value.hunger}`, value.energy > 0 && `⚡ +${value.energy}`, health].filter(Boolean).join(" · ");
}
function isTicket(item) {
    return item?.category === "ticket";
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
    return item !== undefined && exports.ITEM_CATEGORIES[item.category].tool;
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
/** Índice por id: `getItem` se llama en cada operación de mochila y tienda. */
const ITEMS_BY_ID = new Map(exports.ITEMS.map((item) => [item.id, item]));
function getItem(id) {
    return ITEMS_BY_ID.get(id);
}
function isItemSlot(value) {
    return typeof value === "string" && exports.ITEM_SLOTS.includes(value);
}
/**
 * Lo que cuesta comprar un ítem en una tienda: su precio por el recargo de su categoría (el pescado
 * sale más) y por el `priceFactor` de la tienda (los mayoristas venden más barato).
 */
function buyPrice(item, priceFactor = 1) {
    return Math.ceil(item.price * exports.ITEM_CATEGORIES[item.category].buyMarkup * priceFactor);
}
/**
 * Lo que paga una tienda: el precio por el `sellRatio` de su categoría (la mitad por ropa usada, el
 * completo por pescado; mínimo $1). Una herramienta gastada vale en proporción a los `uses` que le quedan.
 */
function sellPrice(item, uses) {
    const base = item.price * exports.ITEM_CATEGORIES[item.category].sellRatio;
    const wear = isTool(item) && uses !== undefined ? Math.min(1, Math.max(0, uses / item.maxUses)) : 1;
    return Math.max(1, Math.floor(base * wear));
}
//# sourceMappingURL=items.js.map