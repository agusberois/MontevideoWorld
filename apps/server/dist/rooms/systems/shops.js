"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopRoutes = shopRoutes;
exports.openShop = openShop;
const shared_1 = require("@montevideo-world/shared");
const session_1 = require("../session");
const activities_1 = require("./activities");
/** Tiendas (comprar, vender, regatear, carrito), ropa, mochila, cajas sorpresa, veterinaria y guardia. */
function shopRoutes(room) {
    return {
        [shared_1.MessageType.RequestInventory]: (session) => room.markInventory(session),
        [shared_1.MessageType.RequestWallet]: (session) => room.markWallet(session),
        /** Clic en una tienda: si ya está al lado se abre; si no, camina hasta ella y se abre al llegar. */
        [shared_1.MessageType.ShopVisit]: (0, session_1.oncePerTick)(shared_1.MessageType.ShopVisit, (session, message) => {
            const { player } = session;
            const shop = room.map.shopAt(message.x, message.y);
            if (!shop)
                return;
            (0, activities_1.stopActivities)(session);
            if (room.map.isNearShop(shop, player.x, player.y)) {
                (0, session_1.halt)(session);
                return openShop(room, session, shop);
            }
            const approach = room.map.shopApproach(shop, { x: player.x, y: player.y });
            const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
            if (path.length === 0)
                return;
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "shop", shop };
        }),
        /**
         * Comprar `quantity` unidades (1 si no viene): hay que estar al lado, que la tienda lo venda,
         * alcanzar la plata y tener lugar. Compra las que alcancen y entren (las herramientas van de a
         * una por casillero) y responde un solo resultado con lo que se compró de verdad.
         */
        [shared_1.MessageType.ShopBuy]: (session, message) => {
            const trade = validateTrade(room, session, message);
            if (!trade)
                return;
            const { shop, item, quantity } = trade;
            const { wallet, inventory } = session;
            if (!shop.stock.includes(item.id))
                return shopResult(room, session, false, `${shop.name} no vende ${item.name}.`);
            const price = (0, shared_1.buyPrice)(item, shop.priceFactor);
            if (!wallet.canAfford(price))
                return shopResult(room, session, false, `No te alcanza: ${item.name} cuesta ${(0, shared_1.formatMoney)(price)}.`);
            if (!inventory.canAdd(item.id))
                return shopResult(room, session, false, "No tenés lugar en la mochila.");
            let bought = 0;
            let stop = "";
            while (bought < quantity) {
                if (!wallet.canAfford(price)) {
                    stop = "no te alcanzó la plata";
                    break;
                }
                if (!inventory.canAdd(item.id)) {
                    stop = "no había más lugar en la mochila";
                    break;
                }
                wallet.debit(price);
                inventory.add(item.id);
                bought += 1;
            }
            room.markWallet(session);
            room.markInventory(session);
            const total = (0, shared_1.formatMoney)(price * bought);
            const what = bought > 1 ? `${bought} × ${item.name}` : item.name;
            const text = stop ? `Compraste ${bought} de ${quantity} × ${item.name} por ${total}: ${stop}.` : `Compraste ${what} por ${total}.`;
            shopResult(room, session, true, text, { action: "buy", itemId: item.id, quantity: bought });
        },
        /**
         * Vender `quantity` unidades de la mochila (lo puesto no se vende: primero hay que sacárselo). Las
         * herramientas gastadas valen menos: se venden de la más usada a la menos.
         */
        [shared_1.MessageType.ShopSell]: (session, message) => {
            const trade = validateTrade(room, session, message);
            if (!trade)
                return;
            const { shop, item, quantity } = trade;
            const { wallet, inventory } = session;
            if (!shop.buys.includes(item.category)) {
                return shopResult(room, session, false, `En ${shop.name} no compran ${shared_1.ITEM_CATEGORIES[item.category].label}.`);
            }
            if (inventory.count(item.id) === 0)
                return shopResult(room, session, false, `No tenés ${item.name} en la mochila.`);
            let sold = 0;
            let earned = 0;
            let stop = "";
            while (sold < quantity) {
                if (inventory.count(item.id) === 0) {
                    stop = "no tenías más";
                    break;
                }
                // Una herramienta gastada vale menos: se vende la más usada (la que sale primero).
                const price = (0, shared_1.sellPrice)(item, inventory.nextUses(item.id)[0]);
                if (!wallet.credit(price)) {
                    stop = "no podés tener más plata";
                    break;
                }
                inventory.remove(item.id);
                sold += 1;
                earned += price;
            }
            if (sold === 0)
                return shopResult(room, session, false, "No podés tener más plata.");
            room.markWallet(session);
            room.markInventory(session);
            const what = sold > 1 ? `${sold} × ${item.name}` : item.name;
            const text = stop
                ? `Vendiste ${sold} de ${quantity} × ${item.name} por ${(0, shared_1.formatMoney)(earned)}: ${stop}.`
                : `Vendiste ${what} por ${(0, shared_1.formatMoney)(earned)}.`;
            shopResult(room, session, true, text, { action: "sell", itemId: item.id, quantity: sold });
        },
        /**
         * Vender regateando, todo o nada: con probabilidad `haggleChance` la tienda paga lo pedido; si no,
         * el ítem se pierde igual y no se cobra nada. Mismas reglas que vender (lo puesto no se vende).
         */
        [shared_1.MessageType.ShopHaggle]: (session, message) => {
            const trade = validateTrade(room, session, message);
            if (!trade)
                return;
            const { shop, item } = trade;
            const { wallet, inventory } = session;
            const base = (0, shared_1.sellPrice)(item, inventory.nextUses(item.id)[0]);
            if (!shop.buys.includes(item.category)) {
                return shopResult(room, session, false, `En ${shop.name} no compran ${shared_1.ITEM_CATEGORIES[item.category].label}.`);
            }
            if (inventory.count(item.id) === 0)
                return shopResult(room, session, false, `No tenés ${item.name} en la mochila.`);
            if (!(0, shared_1.isValidHagglePrice)(base, message.price)) {
                return shopResult(room, session, false, `Podés pedir entre ${(0, shared_1.formatMoney)(base + 1)} y ${(0, shared_1.formatMoney)((0, shared_1.maxHagglePrice)(base))}.`);
            }
            // Antes de tirar los dados: si ganara y no le entrara la plata, ni se intenta.
            if (wallet.balance + message.price > shared_1.MAX_MONEY)
                return shopResult(room, session, false, "No podés tener más plata.");
            const accepted = Math.random() < (0, shared_1.haggleChance)(base, message.price);
            inventory.remove(item.id);
            if (accepted)
                wallet.credit(message.price);
            room.markWallet(session);
            room.markInventory(session);
            if (accepted) {
                shopResult(room, session, true, `🤝 ¡Aceptaron! Vendiste ${item.name} por ${(0, shared_1.formatMoney)(message.price)}.`);
            }
            else {
                shopResult(room, session, false, `🙅 No aceptaron: te quedaste sin ${item.name} y sin cobrar nada.`);
            }
        },
        /**
         * Vender de una todo lo elegido (como el carrito al comprar): todo o nada. Cada herramienta paga
         * según su desgaste (se venden de la más gastada a la menos, como de a una).
         */
        [shared_1.MessageType.ShopSellMany]: (session, message) => {
            const quote = saleQuote(room, session, message);
            if (!quote)
                return;
            const { shop, lines, total } = quote;
            if (!session.wallet.credit(total))
                return shopResult(room, session, false, "No podés tener más plata.");
            for (const { item, quantity } of lines)
                for (let i = 0; i < quantity; i++)
                    session.inventory.remove(item.id);
            room.markWallet(session);
            room.markInventory(session);
            shopResult(room, session, true, `Vendiste ${saleList(lines)} por ${(0, shared_1.formatMoney)(total)}.`, { action: "sell", sold: soldLines(lines) });
        },
        /**
         * Regatear el lote entero: un precio por todo, todo o nada (`haggleChance` sobre lo que pagarían
         * vendiendo normal). Si aceptan se cobra lo pedido; si no, se pierde todo lo elegido sin cobrar.
         */
        [shared_1.MessageType.ShopHaggleMany]: (session, message) => {
            const quote = saleQuote(room, session, message);
            if (!quote)
                return;
            const { shop, lines, total } = quote;
            const { wallet, inventory } = session;
            if (!(0, shared_1.isValidHagglePrice)(total, message.price)) {
                return shopResult(room, session, false, `Podés pedir entre ${(0, shared_1.formatMoney)(total + 1)} y ${(0, shared_1.formatMoney)((0, shared_1.maxHagglePrice)(total))}.`);
            }
            if (wallet.balance + message.price > shared_1.MAX_MONEY)
                return shopResult(room, session, false, "No podés tener más plata.");
            const accepted = Math.random() < (0, shared_1.haggleChance)(total, message.price);
            for (const { item, quantity } of lines)
                for (let i = 0; i < quantity; i++)
                    inventory.remove(item.id);
            if (accepted)
                wallet.credit(message.price);
            room.markWallet(session);
            room.markInventory(session);
            if (accepted) {
                shopResult(room, session, true, `🤝 ¡Aceptaron! Vendiste ${saleList(lines)} por ${(0, shared_1.formatMoney)(message.price)}.`, { action: "sell", sold: soldLines(lines) });
            }
            else {
                shopResult(room, session, false, `🙅 No aceptaron: te quedaste sin ${saleList(lines)} y sin cobrar nada.`, { action: "sell" });
            }
        },
        /**
         * Comprar el carrito entero (todo o nada): hay que estar al lado, que la tienda venda todo, que
         * alcance la plata para el total y que todo entre en la mochila (se prueba con una copia). Si
         * algo falla no se compra nada y se dice por qué; si no, se cobra una vez y responde un solo resultado.
         */
        [shared_1.MessageType.ShopCheckout]: (session, message) => {
            const { player, wallet, inventory } = session;
            const shop = room.map.getShop(message.shopId);
            if (!shop)
                return;
            if (!room.map.isNearShop(shop, player.x, player.y))
                return shopResult(room, session, false, `Acercate a ${shop.name} para comprar.`);
            // Mismo ítem en dos líneas: se suman.
            const lines = new Map();
            for (const { itemId, quantity } of message.items)
                lines.set(itemId, (lines.get(itemId) ?? 0) + quantity);
            const cart = [];
            for (const [itemId, quantity] of lines) {
                const item = (0, shared_1.getItem)(itemId);
                if (!item || !shop.stock.includes(item.id))
                    return shopResult(room, session, false, `${shop.name} no vende eso.`);
                if (quantity > shared_1.SHOP_MAX_QUANTITY)
                    return shopResult(room, session, false, `Como mucho ${shared_1.SHOP_MAX_QUANTITY} de cada cosa.`);
                cart.push({ item, quantity });
            }
            if (cart.length === 0)
                return;
            const total = cart.reduce((sum, { item, quantity }) => sum + (0, shared_1.buyPrice)(item, shop.priceFactor) * quantity, 0);
            if (!wallet.canAfford(total)) {
                return shopResult(room, session, false, `No te alcanza: el carrito sale ${(0, shared_1.formatMoney)(total)} y tenés ${(0, shared_1.formatMoney)(wallet.balance)}.`);
            }
            const trial = inventory.clone();
            for (const { item, quantity } of cart) {
                for (let i = 0; i < quantity; i++) {
                    if (!trial.add(item.id))
                        return shopResult(room, session, false, "No te entra todo en la mochila: sacá algo del carrito o hacé lugar.");
                }
            }
            wallet.debit(total);
            for (const { item, quantity } of cart)
                for (let i = 0; i < quantity; i++)
                    inventory.add(item.id);
            room.markWallet(session);
            room.markInventory(session);
            const list = cart.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)).join(", ");
            shopResult(room, session, true, `Compraste ${list} por ${(0, shared_1.formatMoney)(total)}.`, {
                action: "buy",
                itemId: cart.length === 1 ? cart[0].item.id : undefined,
                quantity: cart.length === 1 ? cart[0].quantity : undefined,
                bought: cart.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
            });
        },
        /**
         * Ponerse una prenda la saca de la mochila (y lo que estaba puesto en ese lugar vuelve a la
         * mochila); sacarse una prenda la guarda en la mochila, si hay lugar.
         */
        [shared_1.MessageType.Equip]: (session, message) => {
            const { player, inventory } = session;
            const { slot, itemId } = message;
            const worn = player[slot];
            if (itemId === null) {
                if (!worn || !inventory.add(worn))
                    return;
                player[slot] = "";
            }
            else {
                const item = (0, shared_1.getClothing)(itemId);
                if (!item || item.slot !== slot || inventory.count(itemId) === 0)
                    return;
                inventory.remove(itemId);
                // Con la mochila llena puede no haber lugar para lo que estaba puesto: se deshace el cambio.
                if (worn && !inventory.add(worn)) {
                    inventory.add(itemId);
                    return;
                }
                player[slot] = itemId;
            }
            room.markInventory(session);
        },
        /**
         * Reordenar la mochila. Con un intercambio abierto no (la oferta se arma con lo que hay; mover no
         * la cambia, pero así la mochila no se mueve mientras el otro la mira).
         */
        [shared_1.MessageType.InventoryMove]: (session, message) => {
            if (!room.trades.get(session.client.sessionId))
                session.inventory.move(message.from, message.to);
            // Siempre se reenvía: si no cambió nada, el cliente vuelve a dibujar lo que hay de verdad.
            room.markInventory(session);
        },
        /**
         * Cocinar en la Parrilla del Mercado: los pescados elegidos se cambian por pescado a la plancha
         * (`grillYield` porciones cada uno: más cuanto más difícil el pez), y cada porción se puede quemar
         * (`GRILL_BURN_CHANCE`). Gratis y todo o nada: si no entra lo que salió en la mochila (probado en
         * `inventory.clone()`), no se cocina nada.
         */
        [shared_1.MessageType.GrillCook]: (session, message) => {
            const { player, inventory } = session;
            const shop = room.map.getShop(message.shopId);
            if (!shop?.grill)
                return;
            if (!room.map.isNearShop(shop, player.x, player.y))
                return shopResult(room, session, false, `Acercate a ${shop.name} para cocinar.`);
            if (room.trades.get(session.client.sessionId))
                return shopResult(room, session, false, "Terminá el intercambio antes de cocinar.");
            const lines = new Map();
            for (const { itemId, quantity } of message.items)
                lines.set(itemId, (lines.get(itemId) ?? 0) + quantity);
            const batch = [];
            for (const [itemId, quantity] of lines) {
                const fish = (0, shared_1.getItem)(itemId);
                if (fish?.category !== "fish")
                    return shopResult(room, session, false, "En la parrilla sólo se cocinan pescados.");
                if (inventory.count(fish.id) < quantity)
                    return shopResult(room, session, false, `No tenés ${quantity} × ${fish.name} en la mochila.`);
                batch.push({ fish, quantity });
            }
            if (batch.length === 0)
                return;
            const total = batch.reduce((sum, { fish, quantity }) => sum + (0, shared_1.grillYield)(fish) * quantity, 0);
            let burnt = 0;
            for (let i = 0; i < total; i++)
                if (Math.random() < shared_1.GRILL_BURN_CHANCE)
                    burnt += 1;
            const portions = total - burnt;
            const trial = inventory.clone();
            for (const { fish, quantity } of batch)
                for (let i = 0; i < quantity; i++)
                    trial.remove(fish.id);
            for (let i = 0; i < portions; i++) {
                if (!trial.add(shared_1.GRILLED_FISH_ID))
                    return shopResult(room, session, false, "No te entra todo en la mochila: cociná menos o hacé lugar.");
            }
            for (const { fish, quantity } of batch)
                for (let i = 0; i < quantity; i++)
                    inventory.remove(fish.id);
            for (let i = 0; i < portions; i++)
                inventory.add(shared_1.GRILLED_FISH_ID);
            room.markInventory(session);
            const list = batch.map(({ fish, quantity }) => (quantity > 1 ? `${quantity} × ${fish.name}` : fish.name)).join(", ");
            const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
            const outcome = burnt === 0
                ? `salieron ${plural(portions, "porción", "porciones")} a la plancha, ¡sin quemar ninguna!`
                : portions === 0
                    ? `se te quemó todo (${plural(burnt, "porción", "porciones")}). ¡Mala suerte!`
                    : `salieron ${total} porciones, pero se te ${burnt === 1 ? "quemó 1" : `quemaron ${burnt}`}: te quedan ${plural(portions, "pescado", "pescados")} a la plancha.`;
            shopResult(room, session, portions > 0, `🔥 Cocinaste ${list}: ${outcome}`, {
                action: "sell",
                sold: batch.map(({ fish, quantity }) => ({ itemId: fish.id, quantity })),
            });
        },
        /** Tirar una unidad de algo que se puede tirar (`ItemCategoryInfo.droppable`: el sobre de la bienvenida). */
        [shared_1.MessageType.InventoryDrop]: (session, message) => {
            const item = (0, shared_1.getItem)(message.itemId);
            if (!item || !shared_1.ITEM_CATEGORIES[item.category].droppable || room.trades.get(session.client.sessionId))
                return;
            if (!session.inventory.remove(item.id))
                return;
            room.notice(session, `🗑️ Tiraste el ${item.name.toLowerCase()}.`);
            room.markInventory(session);
        },
        /**
         * Abrir una caja sorpresa de la mochila: se consume y su premio (sorteado por peso) va a la
         * mochila. Si no hay lugar para el premio, la caja queda cerrada.
         */
        [shared_1.MessageType.BoxOpen]: (session, message) => {
            const { player, inventory } = session;
            const box = (0, shared_1.getItem)(message.itemId);
            if (!(0, shared_1.isBox)(box) || inventory.count(box.id) === 0)
                return;
            const prize = (0, shared_1.rollLoot)(box);
            const after = inventory.clone();
            after.remove(box.id);
            if (!after.canAdd(prize.id))
                return room.notice(session, "No tenés lugar en la mochila para lo que hay adentro de la caja.");
            inventory.remove(box.id);
            inventory.add(prize.id);
            room.markInventory(session);
            const prizeName = prize.category === "fish" ? (0, shared_1.fishWithArticle)(prize) : prize.name;
            room.sendTo(session, shared_1.MessageType.BoxOpened, { boxId: box.id, prizeId: prize.id, text: `¡Te salió ${prizeName}!` });
            if (prize.category === "fish" && prize.difficulty >= 4) {
                room.broadcastSystem(`🎁 ${player.name} abrió ${box.name.toLowerCase()} y le salió ${prizeName}`);
            }
        },
        /** Adoptar: una mascota por jugador, se paga y queda con el nombre elegido (la ven todos). */
        [shared_1.MessageType.PetAdopt]: (session, message) => {
            const shop = petShop(room, session, message.shopId);
            if (!shop)
                return;
            const { player } = session;
            const pet = shop.pets?.includes(message.petId) ? (0, shared_1.getPet)(message.petId) : undefined;
            const name = (0, shared_1.sanitizePetName)(message.name);
            if (!pet)
                return;
            if (!name)
                return shopResult(room, session, false, "Ponele un nombre a tu mascota.");
            if (player.pet)
                return shopResult(room, session, false, `Ya tenés a ${player.petName}: una mascota por persona.`);
            if (!session.wallet.debit(pet.price)) {
                return shopResult(room, session, false, `No te alcanza: adoptar un ${pet.name.toLowerCase()} cuesta ${(0, shared_1.formatMoney)(pet.price)}.`);
            }
            player.pet = pet.id;
            player.petName = name;
            room.markWallet(session);
            room.savePlayer(session);
            shopResult(room, session, true, `🐾 ¡Adoptaste a ${name}! Te va a seguir a todos lados.`);
            room.broadcastSystem(`🐾 ${player.name} adoptó a ${name} (${pet.name.toLowerCase()})`);
        },
        [shared_1.MessageType.PetRename]: (session, message) => {
            if (!petShop(room, session, message.shopId))
                return;
            const { player } = session;
            const name = (0, shared_1.sanitizePetName)(message.name);
            if (!player.pet || !name)
                return;
            const previous = player.petName;
            player.petName = name;
            room.savePlayer(session);
            shopResult(room, session, true, `${previous} ahora se llama ${name}.`);
        },
        /** Despedirse de la mascota: se queda en la veterinaria (no se devuelve la plata). */
        [shared_1.MessageType.PetRelease]: (session, message) => {
            const { player } = session;
            if (!petShop(room, session, message.shopId) || !player.pet)
                return;
            const name = player.petName;
            player.pet = "";
            player.petName = "";
            room.savePlayer(session);
            shopResult(room, session, true, `Te despediste de ${name}. En la veterinaria lo van a cuidar bien.`);
        },
        /** Guardia del sanatorio: pagar la consulta (`hospitalPrice`) y quedar con la salud en 100. */
        [shared_1.MessageType.HospitalHeal]: (session, message) => {
            const { player, needs, wallet } = session;
            const shop = room.map.getShop(message.shopId);
            if (!shop?.hospital)
                return;
            if (!room.map.isNearShop(shop, player.x, player.y))
                return shopResult(room, session, false, `Acercate a ${shop.name}.`);
            if (needs.health >= shared_1.MAX_HEALTH)
                return shopResult(room, session, false, "Estás sano: no hace falta la consulta.");
            const price = (0, shared_1.hospitalPrice)(needs.health);
            if (!wallet.debit(price))
                return shopResult(room, session, false, `La consulta sale ${(0, shared_1.formatMoney)(price)} y no te alcanza.`);
            needs.heal(shared_1.MAX_HEALTH);
            room.markWallet(session);
            room.sendNeeds(session);
            shopResult(room, session, true, `❤ Te atendieron en la guardia: salud al 100 por ${(0, shared_1.formatMoney)(price)}.`);
        },
    };
}
function openShop(room, session, shop) {
    room.sendTo(session, shared_1.MessageType.ShopOpen, { shopId: shop.id });
}
/** Lo común a comprar y vender: tienda e ítem existentes y el jugador al lado de la tienda. */
function validateTrade(room, session, message) {
    const shop = room.map.getShop(message.shopId);
    const item = (0, shared_1.getItem)(message.itemId);
    if (!shop || !item)
        return null;
    if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
        shopResult(room, session, false, `Acercate a ${shop.name} para comprar o vender.`);
        return null;
    }
    return { shop, item, quantity: message.quantity ?? 1 };
}
/**
 * Lo común a vender lo elegido y a regatearlo: tienda al lado, que compre cada cosa, que esté todo en
 * la mochila y cuánto pagarían vendiendo normal (cada herramienta según su desgaste, de la más gastada
 * a la menos, probado sobre una copia de la mochila). null con el aviso de por qué no.
 */
function saleQuote(room, session, message) {
    const shop = room.map.getShop(message.shopId);
    if (!shop)
        return null;
    if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
        shopResult(room, session, false, `Acercate a ${shop.name} para vender.`);
        return null;
    }
    const merged = new Map();
    for (const { itemId, quantity } of message.items)
        merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
    const lines = [];
    const trial = session.inventory.clone();
    let total = 0;
    for (const [itemId, quantity] of merged) {
        const item = (0, shared_1.getItem)(itemId);
        if (!item)
            return null;
        if (!shop.buys.includes(item.category)) {
            shopResult(room, session, false, `En ${shop.name} no compran ${shared_1.ITEM_CATEGORIES[item.category].label}.`);
            return null;
        }
        if (trial.count(item.id) < quantity) {
            shopResult(room, session, false, `No tenés tantas unidades de ${item.name} en la mochila.`);
            return null;
        }
        for (let i = 0; i < quantity; i++) {
            total += (0, shared_1.sellPrice)(item, trial.nextUses(item.id)[0]);
            trial.remove(item.id);
        }
        lines.push({ item, quantity });
    }
    if (lines.length === 0)
        return null;
    return { shop, lines, total };
}
/** "3 × Pejerrey, Corvina": lo que se vende, para los avisos. */
function saleList(lines) {
    return lines.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)).join(", ");
}
function soldLines(lines) {
    return lines.map(({ item, quantity }) => ({ itemId: item.id, quantity }));
}
/** La veterinaria donde está parado el jugador (pegado a ella), o null con el aviso de por qué no. */
function petShop(room, session, shopId) {
    const shop = room.map.getShop(shopId);
    if (!shop?.pets)
        return null;
    if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
        shopResult(room, session, false, `Acercate a ${shop.name}.`);
        return null;
    }
    return shop;
}
/** `detail`: en compras y ventas, qué ítem y cuántas unidades (el panel resalta esa fila). */
function shopResult(room, session, ok, text, detail) {
    room.sendTo(session, shared_1.MessageType.ShopResult, { ok, text, ...detail });
}
//# sourceMappingURL=shops.js.map