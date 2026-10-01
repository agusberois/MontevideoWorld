"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityRoom = void 0;
const core_1 = require("@colyseus/core");
const shared_1 = require("@montevideo-world/shared");
const schema_1 = require("@montevideo-world/shared/schema");
const fishing_1 = require("../fishing");
const env_1 = require("../env");
const gameClock_1 = require("../gameClock");
const inventory_1 = require("../inventory");
const stamina_1 = require("../stamina");
const wallet_1 = require("../wallet");
/**
 * Una sala por barrio: se registra con `filterBy(["cityId"])`, así cada `cityId` de las opciones
 * de join tiene sus propias salas.
 */
/** Canal de presence por el que viajan los anuncios del admin a todas las salas (todos los barrios). */
const ANNOUNCEMENT_TOPIC = "announcements";
class CityRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = shared_1.MAX_PLAYERS_PER_ROOM;
        /** Estado sólo de servidor: no se sincroniza, por eso no vive en el Schema. */
        this.paths = new Map();
        /** Banco al que va cada jugador: se sienta cuando termina su camino. */
        this.pendingSits = new Map();
        this.inventories = new Map();
        this.wallets = new Map();
        this.staminas = new Map();
        /** Tienda a la que va cada jugador: se le abre cuando llega. */
        this.pendingShops = new Map();
        /** Línea en el agua: el timer que resuelve la pesca de cada jugador. */
        this.fishingTimers = new Map();
        this.lastChatAt = new Map();
        this.messageSeq = 0;
        this.spawnTiles = [];
        /** Lo llama presence en cada sala: reenvía el anuncio a sus jugadores. */
        this.relayAnnouncement = (announcement) => {
            this.broadcast(shared_1.MessageType.Announcement, announcement);
        };
    }
    onCreate(options = {}) {
        const map = typeof options.cityId === "string" ? (0, shared_1.getCityMap)(options.cityId) : undefined;
        if (!map)
            throw new Error(`Barrio desconocido: ${String(options.cityId)}`);
        this.map = map;
        this.spawnTiles = map.spawnTiles();
        this.state = new schema_1.GameState();
        this.onMessage(shared_1.MessageType.Move, (client, message) => this.handleMove(client, message));
        this.onMessage(shared_1.MessageType.Chat, (client, message) => this.handleChat(client, message));
        this.onMessage(shared_1.MessageType.Sit, (client, message) => this.handleSit(client, message));
        this.onMessage(shared_1.MessageType.Equip, (client, message) => this.handleEquip(client, message));
        this.onMessage(shared_1.MessageType.RequestInventory, (client) => this.sendInventory(client));
        this.onMessage(shared_1.MessageType.RequestWallet, (client) => this.sendWallet(client));
        this.onMessage(shared_1.MessageType.ShopVisit, (client, message) => this.handleShopVisit(client, message));
        this.onMessage(shared_1.MessageType.ShopBuy, (client, message) => this.handleShopBuy(client, message));
        this.onMessage(shared_1.MessageType.ShopSell, (client, message) => this.handleShopSell(client, message));
        this.onMessage(shared_1.MessageType.FishCast, (client) => this.handleFishCast(client));
        this.onMessage(shared_1.MessageType.FishStop, (client) => this.stopFishing(client.sessionId));
        this.onMessage(shared_1.MessageType.AdminSetTime, (client, message) => this.handleAdminSetTime(client, message));
        this.presence.subscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
        this.clock.setInterval(() => this.stepPlayers(), shared_1.STEP_MS);
        // La hora del juego se copia al Schema una vez por segundo (avanza ~1 minuto del juego por segundo).
        this.syncClock();
        this.clock.setInterval(() => this.syncClock(), 1000);
    }
    onJoin(client, options = {}) {
        const spawn = this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
        const player = new schema_1.Player();
        player.sessionId = client.sessionId;
        player.name = (0, shared_1.sanitizeName)(options.name) || `Invitado${Math.floor(1000 + Math.random() * 9000)}`;
        player.color = shared_1.PLAYER_COLORS[Math.floor(Math.random() * shared_1.PLAYER_COLORS.length)];
        player.admin = (0, env_1.isAdminName)(player.name);
        player.x = spawn.x;
        player.y = spawn.y;
        // Jugador nuevo: aparece con el kit inicial puesto y la mochila vacía.
        for (const slot of shared_1.ITEM_SLOTS) {
            const options = shared_1.STARTER_KIT[slot];
            player[slot] = options ? options[Math.floor(Math.random() * options.length)] : "";
        }
        this.inventories.set(client.sessionId, new inventory_1.Inventory());
        this.wallets.set(client.sessionId, new wallet_1.Wallet());
        this.staminas.set(client.sessionId, new stamina_1.Stamina());
        this.state.players.set(client.sessionId, player);
        this.broadcastSystem(`${player.name} llegó a ${this.map.city.name}`, client);
        console.log(`[CityRoom ${this.roomId} ${this.map.city.id}] join ${client.sessionId} (${player.name})`);
    }
    onLeave(client) {
        this.stopFishing(client.sessionId);
        const player = this.state.players.get(client.sessionId);
        this.state.players.delete(client.sessionId);
        this.paths.delete(client.sessionId);
        this.pendingSits.delete(client.sessionId);
        this.inventories.delete(client.sessionId);
        this.wallets.delete(client.sessionId);
        this.staminas.delete(client.sessionId);
        this.pendingShops.delete(client.sessionId);
        this.lastChatAt.delete(client.sessionId);
        if (player)
            this.broadcastSystem(`${player.name} se fue de ${this.map.city.name}`);
        console.log(`[CityRoom ${this.roomId}] leave ${client.sessionId}`);
    }
    onDispose() {
        this.presence.unsubscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
        console.log(`[CityRoom ${this.roomId}] disposed`);
    }
    handleMove(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !isMoveMessage(message))
            return;
        if (!this.map.isWalkable(message.x, message.y))
            return;
        if (!this.staminas.get(client.sessionId)?.has(shared_1.WALK_STAMINA_COST))
            return this.notifyExhausted(client);
        // Cualquier otra acción recoge la línea.
        this.stopFishing(client.sessionId);
        const path = this.map.findPath({ x: player.x, y: player.y }, { x: message.x, y: message.y });
        if (path.length === 0) {
            // Clic en el propio tile o destino inalcanzable: frena donde está.
            this.paths.delete(client.sessionId);
            this.pendingSits.delete(client.sessionId);
            this.pendingShops.delete(client.sessionId);
            return;
        }
        // Caminar a otro lado cancela sentarse o ir a una tienda (y levanta al que estaba sentado).
        this.pendingSits.delete(client.sessionId);
        this.pendingShops.delete(client.sessionId);
        player.sitting = false;
        this.paths.set(client.sessionId, path);
    }
    /** Clic en un banco: caminar hasta enfrente y sentarse al llegar (si sigue libre). */
    handleSit(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !isTileMessage(message))
            return;
        const bench = this.map.benchAt(message.x, message.y);
        if (!bench || this.isBenchTaken(bench, client.sessionId))
            return;
        this.stopFishing(client.sessionId);
        if (player.sitting && player.x === bench.x && player.y === bench.y)
            return;
        const approach = this.map.benchApproach(bench);
        if (!approach)
            return;
        const path = this.map.findPath({ x: player.x, y: player.y }, approach);
        const alreadyThere = player.x === approach.x && player.y === approach.y;
        if (path.length === 0 && !alreadyThere)
            return;
        player.sitting = false;
        if (path.length > 0)
            this.paths.set(client.sessionId, path);
        else
            this.paths.delete(client.sessionId);
        this.pendingShops.delete(client.sessionId);
        this.pendingSits.set(client.sessionId, bench);
    }
    /** Clic en una tienda: si ya está al lado se abre; si no, camina hasta ella y se abre al llegar. */
    handleShopVisit(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !isTileMessage(message))
            return;
        const shop = this.map.shopAt(message.x, message.y);
        if (!shop)
            return;
        this.stopFishing(client.sessionId);
        this.pendingSits.delete(client.sessionId);
        if (this.map.isNearShop(shop, player.x, player.y)) {
            this.paths.delete(client.sessionId);
            this.pendingShops.delete(client.sessionId);
            this.openShop(client, shop);
            return;
        }
        const approach = this.map.shopApproach(shop, { x: player.x, y: player.y });
        const path = approach ? this.map.findPath({ x: player.x, y: player.y }, approach) : [];
        if (path.length === 0)
            return;
        player.sitting = false;
        this.paths.set(client.sessionId, path);
        this.pendingShops.set(client.sessionId, shop);
    }
    openShop(client, shop) {
        const message = { shopId: shop.id };
        client.send(shared_1.MessageType.ShopOpen, message);
    }
    /** Comprar una unidad: hay que estar al lado, que la tienda la venda, alcanzar la plata y tener lugar. */
    handleShopBuy(client, message) {
        const trade = this.validateTrade(client, message);
        if (!trade)
            return;
        const { shop, item, wallet, inventory } = trade;
        if (!shop.stock.includes(item.id))
            return this.shopResult(client, false, `${shop.name} no vende ${item.name}.`);
        const price = (0, shared_1.buyPrice)(item);
        if (!wallet.canAfford(price))
            return this.shopResult(client, false, `No te alcanza: ${item.name} cuesta ${(0, shared_1.formatMoney)(price)}.`);
        if (!inventory.canAdd(item.id))
            return this.shopResult(client, false, "No tenés lugar en la mochila.");
        wallet.debit(price);
        inventory.add(item.id);
        this.sendWallet(client);
        this.sendInventory(client);
        this.shopResult(client, true, `Compraste ${item.name} por ${(0, shared_1.formatMoney)(price)}.`);
    }
    /** Vender una unidad de la mochila (lo puesto no se vende: primero hay que sacárselo). */
    handleShopSell(client, message) {
        const trade = this.validateTrade(client, message);
        if (!trade)
            return;
        const { shop, item, wallet, inventory } = trade;
        const price = (0, shared_1.sellPrice)(item);
        if (!shop.buys.includes(item.category)) {
            return this.shopResult(client, false, `En ${shop.name} no compran ${shared_1.ITEM_CATEGORY_LABELS[item.category]}.`);
        }
        if (inventory.count(item.id) === 0)
            return this.shopResult(client, false, `No tenés ${item.name} en la mochila.`);
        if (!wallet.credit(price))
            return this.shopResult(client, false, "No podés tener más plata.");
        inventory.remove(item.id);
        this.sendWallet(client);
        this.sendInventory(client);
        this.shopResult(client, true, `Vendiste ${item.name} por ${(0, shared_1.formatMoney)(price)}.`);
    }
    /** Lo común a comprar y vender: mensaje válido, tienda existente y el jugador al lado de ella. */
    validateTrade(client, message) {
        const player = this.state.players.get(client.sessionId);
        const wallet = this.wallets.get(client.sessionId);
        const inventory = this.inventories.get(client.sessionId);
        if (!player || !wallet || !inventory || !isShopTradeMessage(message))
            return null;
        const shop = this.map.getShop(message.shopId);
        const item = (0, shared_1.getItem)(message.itemId);
        if (!shop || !item)
            return null;
        if (!this.map.isNearShop(shop, player.x, player.y)) {
            this.shopResult(client, false, `Acercate a ${shop.name} para comprar o vender.`);
            return null;
        }
        return { shop, item, wallet, inventory };
    }
    shopResult(client, ok, text) {
        const message = { ok, text };
        client.send(shared_1.MessageType.ShopResult, message);
    }
    /**
     * Ponerse una prenda la saca de la mochila (y lo que estaba puesto en ese lugar vuelve a la
     * mochila); sacarse una prenda la guarda en la mochila, si hay lugar.
     */
    handleEquip(client, message) {
        const player = this.state.players.get(client.sessionId);
        const inventory = this.inventories.get(client.sessionId);
        if (!player || !inventory || !isEquipMessage(message))
            return;
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
        this.sendInventory(client);
    }
    sendInventory(client) {
        const inventory = this.inventories.get(client.sessionId);
        if (!inventory)
            return;
        const message = { stacks: inventory.snapshot(), capacity: inventory.capacity };
        client.send(shared_1.MessageType.Inventory, message);
    }
    /** Mandar el saldo al dueño. Llamarlo después de cada cobro o pago. */
    sendWallet(client) {
        const wallet = this.wallets.get(client.sessionId);
        if (!wallet)
            return;
        const message = { balance: wallet.balance };
        client.send(shared_1.MessageType.Wallet, message);
    }
    /**
     * Tirar la línea: hay que estar parado (sin camino pendiente) en la escollera y no estar pescando.
     * El resultado se sortea ahora y se resuelve en `durationMs`; moverse antes lo cancela.
     */
    handleFishCast(client) {
        const player = this.state.players.get(client.sessionId);
        if (!player || player.fishing || this.paths.has(client.sessionId))
            return;
        if (!this.map.canFishAt(player.x, player.y)) {
            return this.fishResult(client, false, "Para pescar tenés que estar parado en la Escollera Sarandí.");
        }
        if (!this.staminas.get(client.sessionId)?.spend(shared_1.FISH_STAMINA_COST)) {
            return this.fishResult(client, false, "Estás muy cansado para pescar. Descansá un rato: sentarte en un banco ayuda.");
        }
        const { fish, durationMs } = (0, fishing_1.rollCatch)();
        player.sitting = false;
        player.fishing = true;
        this.pendingSits.delete(client.sessionId);
        this.pendingShops.delete(client.sessionId);
        const started = { durationMs };
        client.send(shared_1.MessageType.FishStarted, started);
        const timer = this.clock.setTimeout(() => {
            this.fishingTimers.delete(client.sessionId);
            player.fishing = false;
            const inventory = this.inventories.get(client.sessionId);
            if (!fish)
                return this.fishResult(client, false, "No picó nada. Probá de nuevo.");
            const caught = (0, shared_1.fishWithArticle)(fish);
            const it = fish.gender === "f" ? "la" : "lo";
            if (!inventory?.add(fish.id)) {
                return this.fishResult(client, false, `Picó ${caught}, pero tenés la mochila llena: ${it} devolviste al río.`);
            }
            this.sendInventory(client);
            this.fishResult(client, true, `¡Sacaste ${caught}! En el Mercado del Puerto ${it} pagan ${(0, shared_1.formatMoney)(fish.price)}.`, fish.id);
            if (fish.difficulty >= 4) {
                this.broadcastSystem(`🎣 ${player.name} sacó ${caught} en la Escollera Sarandí`);
            }
        }, durationMs);
        this.fishingTimers.set(client.sessionId, timer);
    }
    /** Recoger la línea (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
    stopFishing(sessionId) {
        this.fishingTimers.get(sessionId)?.clear();
        this.fishingTimers.delete(sessionId);
        const player = this.state.players.get(sessionId);
        if (player)
            player.fishing = false;
    }
    fishResult(client, ok, text, itemId) {
        const message = { ok, text, itemId };
        client.send(shared_1.MessageType.FishResult, message);
    }
    syncClock() {
        const minute = Math.floor(gameClock_1.gameClock.minuteOfDay());
        if (this.state.minuteOfDay !== minute)
            this.state.minuteOfDay = minute;
    }
    /** Sólo un admin puede mover el reloj del juego; desde ahí sigue solo y lo ven todos (Schema). */
    handleAdminSetTime(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player?.admin || !isAdminSetTimeMessage(message))
            return;
        gameClock_1.gameClock.set(message.minuteOfDay);
        this.syncClock();
        this.broadcastSystem(`🕒 ${player.name} movió el reloj a las ${(0, shared_1.formatClock)(message.minuteOfDay)}`);
    }
    isBenchTaken(bench, exceptSessionId) {
        for (const [sessionId, other] of this.state.players) {
            if (sessionId !== exceptSessionId && other.sitting && other.x === bench.x && other.y === bench.y)
                return true;
        }
        return false;
    }
    handleChat(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !isChatMessage(message))
            return;
        const now = Date.now();
        const last = this.lastChatAt.get(client.sessionId) ?? 0;
        if (now - last < shared_1.CHAT_COOLDOWN_MS)
            return;
        const text = (0, shared_1.sanitizeChat)(message.text);
        if (!text)
            return;
        this.lastChatAt.set(client.sessionId, now);
        if (isCommand(text, shared_1.POST_COMMAND))
            return this.handlePostCommand(client, player.name, player.admin, text);
        this.broadcastChat({
            id: this.nextMessageId(),
            kind: "player",
            sessionId: client.sessionId,
            name: player.name,
            text,
            timestamp: now,
        });
    }
    /**
     * "/post <mensaje>" (sólo admin): anuncio en el medio de la pantalla para todos los jugadores de
     * todos los barrios. No pasa por el chat. Se publica en presence y cada sala lo reenvía.
     */
    handlePostCommand(client, name, isAdmin, text) {
        if (!isAdmin)
            return this.notice(client, `El comando ${shared_1.POST_COMMAND} es sólo para el admin.`);
        const body = text.slice(shared_1.POST_COMMAND.length).trim();
        if (!body)
            return this.notice(client, `Usá: ${shared_1.POST_COMMAND} <mensaje>`);
        const announcement = { id: `${Date.now()}-${this.nextMessageId()}`, name, text: body };
        this.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
        console.log(`[Anuncio] ${name}: ${body}`);
    }
    /** Avanza un tile a cada jugador que tenga camino pendiente; sienta a los que llegaron a su banco. */
    stepPlayers() {
        // Primero los que ya llegaron (sin camino pendiente): se sientan un tick después de llegar,
        // así el avatar no salta dos tiles de golpe.
        for (const [sessionId, bench] of this.pendingSits) {
            if (this.paths.has(sessionId))
                continue;
            this.pendingSits.delete(sessionId);
            const player = this.state.players.get(sessionId);
            if (!player || this.isBenchTaken(bench, sessionId))
                continue;
            player.x = bench.x;
            player.y = bench.y;
            player.sitting = true;
        }
        // Llegaron a una tienda: se les abre el panel.
        for (const [sessionId, shop] of this.pendingShops) {
            if (this.paths.has(sessionId))
                continue;
            this.pendingShops.delete(sessionId);
            const player = this.state.players.get(sessionId);
            const client = this.clients.getById(sessionId);
            if (player && client && this.map.isNearShop(shop, player.x, player.y))
                this.openShop(client, shop);
        }
        for (const [sessionId, path] of this.paths) {
            const player = this.state.players.get(sessionId);
            if (!player || path.length === 0) {
                this.paths.delete(sessionId);
                continue;
            }
            // Cada paso gasta energía: agotado, se frena donde está (y no llega a banco ni tienda).
            if (!this.staminas.get(sessionId)?.spend(shared_1.WALK_STAMINA_COST)) {
                this.paths.delete(sessionId);
                this.pendingSits.delete(sessionId);
                this.pendingShops.delete(sessionId);
                const client = this.clients.getById(sessionId);
                if (client)
                    this.notifyExhausted(client);
                continue;
            }
            const next = path.shift();
            player.x = next.x;
            player.y = next.y;
            if (path.length === 0)
                this.paths.delete(sessionId);
        }
        this.recoverStamina();
    }
    /** Quieto se recupera energía; sentado en un banco, mucho más rápido. Pescando, no. */
    recoverStamina() {
        const seconds = shared_1.STEP_MS / 1000;
        for (const [sessionId, player] of this.state.players) {
            const stamina = this.staminas.get(sessionId);
            if (!stamina)
                continue;
            if (!this.paths.has(sessionId) && !player.fishing) {
                stamina.recover((player.sitting ? shared_1.SIT_STAMINA_REGEN : shared_1.IDLE_STAMINA_REGEN) * seconds);
            }
            if (player.stamina !== stamina.rounded)
                player.stamina = stamina.rounded;
        }
    }
    notifyExhausted(client) {
        this.notice(client, `Estás agotado: descansá hasta recuperar ${shared_1.EXHAUSTED_RECOVERY} de energía (sentado en un banco es mucho más rápido).`);
    }
    notice(client, text) {
        const message = { text };
        client.send(shared_1.MessageType.Notice, message);
    }
    broadcastSystem(text, except) {
        this.broadcastChat({
            id: this.nextMessageId(),
            kind: "system",
            sessionId: "",
            name: "Sistema",
            text,
            timestamp: Date.now(),
        }, except);
    }
    broadcastChat(payload, except) {
        this.broadcast(shared_1.MessageType.Chat, payload, except ? { except } : undefined);
    }
    nextMessageId() {
        this.messageSeq += 1;
        return `${this.roomId}-${this.messageSeq}`;
    }
}
exports.CityRoom = CityRoom;
function isTileMessage(message) {
    if (typeof message !== "object" || message === null)
        return false;
    const { x, y } = message;
    return Number.isInteger(x) && Number.isInteger(y);
}
const isMoveMessage = isTileMessage;
/** "/post hola" o "/post" (no "/postre"): el comando, sin importar mayúsculas. */
function isCommand(text, command) {
    const lower = text.toLowerCase();
    return lower === command || lower.startsWith(`${command} `);
}
function isAdminSetTimeMessage(message) {
    return typeof message === "object" && message !== null && (0, shared_1.isValidMinuteOfDay)(message.minuteOfDay);
}
function isShopTradeMessage(message) {
    if (typeof message !== "object" || message === null)
        return false;
    const { shopId, itemId } = message;
    return typeof shopId === "string" && typeof itemId === "string";
}
function isEquipMessage(message) {
    if (typeof message !== "object" || message === null)
        return false;
    const { slot, itemId } = message;
    return (0, shared_1.isItemSlot)(slot) && (itemId === null || typeof itemId === "string");
}
function isChatMessage(message) {
    if (typeof message !== "object" || message === null)
        return false;
    return typeof message.text === "string";
}
//# sourceMappingURL=CityRoom.js.map