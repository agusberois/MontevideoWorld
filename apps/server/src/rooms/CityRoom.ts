import { Client, Delayed, Room } from "@colyseus/core";
import {
  Bench,
  CHAT_COOLDOWN_MS,
  ChatBroadcastMessage,
  ChatInputMessage,
  CityMap,
  EquipMessage,
  ITEM_SLOTS,
  InventoryMessage,
  JoinOptions,
  MAX_PLAYERS_PER_ROOM,
  MessageType,
  MoveMessage,
  randomAppearance,
  sanitizeAppearance,
  AdminSetTimeMessage,
  AnnouncementMessage,
  BoxOpenMessage,
  SPAWN_CITY_ID,
  TRAVEL_FARE,
  TRAVEL_TICKET_MS,
  TravelMessage,
  getCity,
  WEEVIL_BITE_STAMINA,
  WEEVIL_REWARD,
  WeevilKickMessage,
  STARTING_MONEY,
  isPlayerKey,
  FishEatMessage,
  MAX_MONEY,
  ShopHaggleMessage,
  haggleChance,
  isValidHagglePrice,
  maxHagglePrice,
  FishItem,
  MAX_STAMINA,
  fishStamina,
  STARTER_INVENTORY,
  bestRod,
  BoxOpenedMessage,
  isBox,
  rollLoot,
  STARTER_KIT,
  STEP_MS,
  Shop,
  ShopOpenMessage,
  ShopResultMessage,
  ShopTradeMessage,
  formatMoney,
  sellPrice,
  SitMessage,
  TilePoint,
  WalletMessage,
  getCityMap,
  EXHAUSTED_RECOVERY,
  FISH_STAMINA_COST,
  FishResultMessage,
  FishStartedMessage,
  IDLE_STAMINA_REGEN,
  NoticeMessage,
  SIT_STAMINA_REGEN,
  WALK_STAMINA_COST,
  ITEM_CATEGORY_LABELS,
  buyPrice,
  fishWithArticle,
  getClothing,
  formatClock,
  getItem,
  isValidMinuteOfDay,
  isItemSlot,
  sanitizeChat,
  sanitizeName,
  TRADE_INVITE_MS,
  TargetPlayerMessage,
  TradeClosedMessage,
  TradeInviteMessage,
  TradeRespondMessage,
  TradeStateMessage,
  normalizeTradeOffer,
} from "@montevideo-world/shared";
import { GameState, Player } from "@montevideo-world/shared/schema";
import { CommandHost, runCommand } from "../commands";
import { rollCatch } from "../fishing";
import { WeevilManager } from "../weevils";
import { SessionOwner, activeSessions, playerStore, travelTickets } from "../playerStore";
import { isAdminName } from "../env";
import { gameClock } from "../gameClock";
import { Inventory } from "../inventory";
import { Stamina } from "../stamina";
import { Trade, TradeManager, TradeParty, checkOffer, clampOffer, executeTrade, partnerOf } from "../trades";
import { Wallet } from "../wallet";

/**
 * Una sala por barrio: se registra con `filterBy(["cityId"])`, así cada `cityId` de las opciones
 * de join tiene sus propias salas.
 */
/** Cada cuánto se mueven los picudos (más seguido que los jugadores: se arrastran de a poco). */
const WEEVIL_TICK_MS = 100;

/** Cada cuánto se guarda el progreso de los jugadores conectados. */
const SAVE_INTERVAL_MS = 15_000;
/** Código de cierre para la sesión vieja cuando la misma clave entra de nuevo. */
const DUPLICATE_SESSION_CODE = 4001;

/** Canal de presence por el que viajan los anuncios del admin a todas las salas (todos los barrios). */
const ANNOUNCEMENT_TOPIC = "announcements";

export class CityRoom extends Room<GameState> implements SessionOwner {
  maxClients = MAX_PLAYERS_PER_ROOM;

  /** Estado sólo de servidor: no se sincroniza, por eso no vive en el Schema. */
  private paths = new Map<string, TilePoint[]>();
  /** Banco al que va cada jugador: se sienta cuando termina su camino. */
  private pendingSits = new Map<string, Bench>();
  private inventories = new Map<string, Inventory>();
  private wallets = new Map<string, Wallet>();
  private staminas = new Map<string, Stamina>();
  /** Tienda a la que va cada jugador: se le abre cuando llega. */
  private pendingShops = new Map<string, Shop>();
  /** Palmera a la que va cada jugador: la sacude al llegar. */
  private pendingPalms = new Map<string, TilePoint>();
  /** Picudos rojos de las palmeras (ver `weevils.ts`). */
  private weevils!: WeevilManager;
  /** Línea en el agua: el timer que resuelve la pesca de cada jugador. */
  private fishingTimers = new Map<string, Delayed>();
  private lastChatAt = new Map<string, number>();
  /** Clave secreta de cada sesión: con ella se guarda y se recupera su progreso (`playerStore`). */
  private playerKeys = new Map<string, string>();
  /** Invitaciones e intercambios entre jugadores de esta sala. */
  private trades = new TradeManager();
  private messageSeq = 0;
  private map!: CityMap;
  private spawnTiles: TilePoint[] = [];

  onCreate(options: Partial<JoinOptions> = {}) {
    const map = typeof options.cityId === "string" ? getCityMap(options.cityId) : undefined;
    if (!map) throw new Error(`Barrio desconocido: ${String(options.cityId)}`);
    this.map = map;
    this.spawnTiles = map.spawnTiles();

    this.state = new GameState();

    this.onMessage(MessageType.Move, (client, message: unknown) => this.handleMove(client, message));
    this.onMessage(MessageType.Chat, (client, message: unknown) => this.handleChat(client, message));
    this.onMessage(MessageType.Sit, (client, message: unknown) => this.handleSit(client, message));
    this.onMessage(MessageType.Equip, (client, message: unknown) => this.handleEquip(client, message));
    this.onMessage(MessageType.RequestInventory, (client) => this.sendInventory(client));
    this.onMessage(MessageType.RequestWallet, (client) => this.sendWallet(client));
    this.onMessage(MessageType.ShopVisit, (client, message: unknown) => this.handleShopVisit(client, message));
    this.onMessage(MessageType.ShopBuy, (client, message: unknown) => this.handleShopBuy(client, message));
    this.onMessage(MessageType.ShopSell, (client, message: unknown) => this.handleShopSell(client, message));
    this.onMessage(MessageType.ShopHaggle, (client, message: unknown) => this.handleShopHaggle(client, message));
    this.onMessage(MessageType.FishCast, (client) => this.handleFishCast(client));
    this.onMessage(MessageType.FishStop, (client) => this.stopFishing(client.sessionId));
    this.onMessage(MessageType.FishEat, (client, message: unknown) => this.handleFishEat(client, message));
    this.onMessage(MessageType.AdminSetTime, (client, message: unknown) => this.handleAdminSetTime(client, message));
    this.onMessage(MessageType.BoxOpen, (client, message: unknown) => this.handleBoxOpen(client, message));
    this.onMessage(MessageType.TravelRequest, (client, message: unknown) => this.handleTravelRequest(client, message));
    this.onMessage(MessageType.PalmShake, (client, message: unknown) => this.handlePalmShake(client, message));
    this.onMessage(MessageType.WeevilKick, (client, message: unknown) => this.handleWeevilKick(client, message));
    this.onMessage(MessageType.Greet, (client, message: unknown) => this.handleGreet(client, message));
    this.onMessage(MessageType.TradeRequest, (client, message: unknown) => this.handleTradeRequest(client, message));
    this.onMessage(MessageType.TradeRespond, (client, message: unknown) => this.handleTradeRespond(client, message));
    this.onMessage(MessageType.TradeOffer, (client, message: unknown) => this.handleTradeOffer(client, message));
    this.onMessage(MessageType.TradeAccept, (client) => this.handleTradeAccept(client));
    this.onMessage(MessageType.TradeCancel, (client) => this.cancelTrade(client.sessionId, "cancel"));
    this.presence.subscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);

    this.clock.setInterval(() => this.stepPlayers(), STEP_MS);
    this.weevils = new WeevilManager(this.state.weevils, {
      players: () => [...this.state.players].map(([id, player]) => [id, { x: player.x, y: player.y }] as [string, TilePoint]),
      bite: (sessionId) => this.staminas.get(sessionId)?.drain(WEEVIL_BITE_STAMINA),
    });
    this.clock.setInterval(() => this.weevils.tick(WEEVIL_TICK_MS, Date.now()), WEEVIL_TICK_MS);
    // Guardado periódico: si el proceso se corta, se pierde como mucho este intervalo.
    this.clock.setInterval(() => this.saveAllPlayers(), SAVE_INTERVAL_MS);
    // La hora del juego se copia al Schema una vez por segundo (avanza ~1 minuto del juego por segundo).
    this.syncClock();
    this.clock.setInterval(() => this.syncClock(), 1000);
  }

  onJoin(client: Client, options: Partial<JoinOptions> = {}) {
    const spawn = this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];

    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = sanitizeName(options.name) || `Invitado${Math.floor(1000 + Math.random() * 9000)}`;
    // Aspecto elegido en la pantalla de ingreso (validado); si no vino o es inválido, uno al azar.
    const look = sanitizeAppearance(options.appearance) ?? randomAppearance();
    player.color = look.color;
    player.gender = look.gender;
    player.skin = look.skin;
    player.hairColor = look.hairColor;
    player.hairStyle = look.hairStyle;
    player.admin = isAdminName(player.name);
    player.x = spawn.x;
    player.y = spawn.y;
    // Con clave: se recupera lo guardado (y si la clave ya estaba en uso, se cierra esa sesión).
    const key = isPlayerKey(options.playerKey) ? options.playerKey : null;
    // Fuera del barrio de spawn sólo se entra con boleto (se paga en la sala de origen).
    if (this.map.city.id !== SPAWN_CITY_ID) {
      const ticket = key ? travelTickets.get(key) : undefined;
      if (!ticket || ticket.cityId !== this.map.city.id || ticket.expiresAt < Date.now()) {
        throw new Error(`Para entrar a ${this.map.city.name} necesitás un boleto.`);
      }
      travelTickets.delete(key!);
    }
    if (key) {
      const previous = activeSessions.get(key);
      if (previous) previous.owner.evictDuplicate(previous.sessionId);
      activeSessions.set(key, { owner: this, sessionId: client.sessionId });
      this.playerKeys.set(client.sessionId, key);
    }
    const saved = key ? playerStore.get(key) : undefined;

    if (saved) {
      for (const slot of ITEM_SLOTS) {
        const item = getClothing(saved.outfit?.[slot] ?? "");
        player[slot] = item && item.slot === slot ? item.id : "";
      }
      this.inventories.set(client.sessionId, Inventory.restore(saved.inventory ?? []));
      const money = Number.isSafeInteger(saved.money) && saved.money >= 0 && saved.money <= MAX_MONEY ? saved.money : STARTING_MONEY;
      this.wallets.set(client.sessionId, new Wallet(money));
    } else {
      // Jugador nuevo: aparece con el kit inicial puesto y una caña básica en la mochila.
      for (const slot of ITEM_SLOTS) {
        const options = STARTER_KIT[slot];
        player[slot] = options ? options[Math.floor(Math.random() * options.length)] : "";
      }
      const inventory = new Inventory();
      for (const itemId of STARTER_INVENTORY) inventory.add(itemId);
      this.inventories.set(client.sessionId, inventory);
      this.wallets.set(client.sessionId, new Wallet());
    }
    this.staminas.set(client.sessionId, new Stamina());

    this.state.players.set(client.sessionId, player);
    this.broadcastSystem(`${player.name} llegó a ${this.map.city.name}`, client);
    console.log(`[CityRoom ${this.roomId} ${this.map.city.id}] join ${client.sessionId} (${player.name})`);
  }

  onLeave(client: Client) {
    this.stopFishing(client.sessionId);
    this.cancelTrade(client.sessionId, "leave");
    this.savePlayer(client.sessionId);
    const key = this.playerKeys.get(client.sessionId);
    if (key && activeSessions.get(key)?.sessionId === client.sessionId) activeSessions.delete(key);
    this.playerKeys.delete(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.paths.delete(client.sessionId);
    this.pendingSits.delete(client.sessionId);
    this.inventories.delete(client.sessionId);
    this.wallets.delete(client.sessionId);
    this.staminas.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);

    if (player) this.broadcastSystem(`${player.name} se fue de ${this.map.city.name}`);
    console.log(`[CityRoom ${this.roomId}] leave ${client.sessionId}`);
  }

  /** Guarda la mochila, la plata y la ropa del jugador bajo su clave (si entró con una). */
  private savePlayer(sessionId: string) {
    const key = this.playerKeys.get(sessionId);
    const player = this.state.players.get(sessionId);
    const inventory = this.inventories.get(sessionId);
    const wallet = this.wallets.get(sessionId);
    if (!key || !player || !inventory || !wallet) return;
    playerStore.set(key, {
      name: player.name,
      money: wallet.balance,
      inventory: inventory.snapshot(),
      outfit: { hat: player.hat, top: player.top, bottom: player.bottom, shoes: player.shoes },
    });
  }

  private saveAllPlayers() {
    for (const sessionId of this.playerKeys.keys()) this.savePlayer(sessionId);
  }

  /**
   * La misma clave entró de nuevo (otra pestaña): se guarda esta sesión y se cierra. Se le saca la
   * clave antes de cerrarla para que su `onLeave` no pise después lo que haga la sesión nueva.
   */
  evictDuplicate(sessionId: string) {
    this.stopFishing(sessionId);
    this.cancelTrade(sessionId, "leave");
    this.savePlayer(sessionId);
    this.playerKeys.delete(sessionId);
    const client = this.clients.getById(sessionId);
    if (!client) return;
    this.notice(client, "Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
    client.leave(DUPLICATE_SESSION_CODE);
  }

  onDispose() {
    this.presence.unsubscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
    console.log(`[CityRoom ${this.roomId}] disposed`);
  }

  private handleMove(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isMoveMessage(message)) return;
    if (!this.map.isWalkable(message.x, message.y)) return;
    if (!this.staminas.get(client.sessionId)?.has(WALK_STAMINA_COST)) return this.notifyExhausted(client);
    // Cualquier otra acción recoge la línea.
    this.stopFishing(client.sessionId);

    const path = this.map.findPath({ x: player.x, y: player.y }, { x: message.x, y: message.y });
    if (path.length === 0) {
      // Clic en el propio tile o destino inalcanzable: frena donde está.
      this.paths.delete(client.sessionId);
      this.pendingSits.delete(client.sessionId);
      this.pendingShops.delete(client.sessionId);
      this.pendingPalms.delete(client.sessionId);
      return;
    }

    // Caminar a otro lado cancela sentarse o ir a una tienda (y levanta al que estaba sentado).
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    player.sitting = false;
    this.paths.set(client.sessionId, path);
  }

  /** Clic en un banco: caminar hasta enfrente y sentarse al llegar (si sigue libre). */
  private handleSit(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isTileMessage(message)) return;
    const bench = this.map.benchAt(message.x, message.y);
    if (!bench || this.isBenchTaken(bench, client.sessionId)) return;
    this.stopFishing(client.sessionId);
    if (player.sitting && player.x === bench.x && player.y === bench.y) return;

    const approach = this.map.benchApproach(bench);
    if (!approach) return;
    const path = this.map.findPath({ x: player.x, y: player.y }, approach);
    const alreadyThere = player.x === approach.x && player.y === approach.y;
    if (path.length === 0 && !alreadyThere) return;

    player.sitting = false;
    if (path.length > 0) this.paths.set(client.sessionId, path);
    else this.paths.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    this.pendingSits.set(client.sessionId, bench);
  }

  /** Clic en una tienda: si ya está al lado se abre; si no, camina hasta ella y se abre al llegar. */
  private handleShopVisit(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isTileMessage(message)) return;
    const shop = this.map.shopAt(message.x, message.y);
    if (!shop) return;

    this.stopFishing(client.sessionId);
    this.pendingSits.delete(client.sessionId);
    if (this.map.isNearShop(shop, player.x, player.y)) {
      this.paths.delete(client.sessionId);
      this.pendingShops.delete(client.sessionId);
      this.pendingPalms.delete(client.sessionId);
      this.openShop(client, shop);
      return;
    }

    const approach = this.map.shopApproach(shop, { x: player.x, y: player.y });
    const path = approach ? this.map.findPath({ x: player.x, y: player.y }, approach) : [];
    if (path.length === 0) return;
    player.sitting = false;
    this.paths.set(client.sessionId, path);
    this.pendingShops.set(client.sessionId, shop);
  }

  private openShop(client: Client, shop: Shop) {
    const message: ShopOpenMessage = { shopId: shop.id };
    client.send(MessageType.ShopOpen, message);
  }

  /** Comprar una unidad: hay que estar al lado, que la tienda la venda, alcanzar la plata y tener lugar. */
  private handleShopBuy(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade) return;
    const { shop, item, wallet, inventory } = trade;

    if (!shop.stock.includes(item.id)) return this.shopResult(client, false, `${shop.name} no vende ${item.name}.`);
    const price = buyPrice(item);
    if (!wallet.canAfford(price)) return this.shopResult(client, false, `No te alcanza: ${item.name} cuesta ${formatMoney(price)}.`);
    if (!inventory.canAdd(item.id)) return this.shopResult(client, false, "No tenés lugar en la mochila.");

    wallet.debit(price);
    inventory.add(item.id);
    this.sendWallet(client);
    this.sendInventory(client);
    this.shopResult(client, true, `Compraste ${item.name} por ${formatMoney(price)}.`);
  }

  /** Vender una unidad de la mochila (lo puesto no se vende: primero hay que sacárselo). */
  private handleShopSell(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade) return;
    const { shop, item, wallet, inventory } = trade;
    const price = sellPrice(item);

    if (!shop.buys.includes(item.category)) {
      return this.shopResult(client, false, `En ${shop.name} no compran ${ITEM_CATEGORY_LABELS[item.category]}.`);
    }
    if (inventory.count(item.id) === 0) return this.shopResult(client, false, `No tenés ${item.name} en la mochila.`);
    if (!wallet.credit(price)) return this.shopResult(client, false, "No podés tener más plata.");

    inventory.remove(item.id);
    this.sendWallet(client);
    this.sendInventory(client);
    this.shopResult(client, true, `Vendiste ${item.name} por ${formatMoney(price)}.`);
  }

  /**
   * Vender regateando, todo o nada: con probabilidad `haggleChance` la tienda paga lo pedido; si no,
   * el ítem se pierde igual y no se cobra nada. Mismas reglas que vender (lo puesto no se vende).
   */
  private handleShopHaggle(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade || !isShopHaggleMessage(message)) return;
    const { shop, item, wallet, inventory } = trade;
    const base = sellPrice(item);

    if (!shop.buys.includes(item.category)) {
      return this.shopResult(client, false, `En ${shop.name} no compran ${ITEM_CATEGORY_LABELS[item.category]}.`);
    }
    if (inventory.count(item.id) === 0) return this.shopResult(client, false, `No tenés ${item.name} en la mochila.`);
    if (!isValidHagglePrice(base, message.price)) {
      return this.shopResult(client, false, `Podés pedir entre ${formatMoney(base + 1)} y ${formatMoney(maxHagglePrice(base))}.`);
    }
    // Antes de tirar los dados: si ganara y no le entrara la plata, ni se intenta.
    if (wallet.balance + message.price > MAX_MONEY) return this.shopResult(client, false, "No podés tener más plata.");

    const accepted = Math.random() < haggleChance(base, message.price);
    inventory.remove(item.id);
    if (accepted) wallet.credit(message.price);
    this.sendWallet(client);
    this.sendInventory(client);
    if (accepted) {
      this.shopResult(client, true, `🤝 ¡Aceptaron! Vendiste ${item.name} por ${formatMoney(message.price)}.`);
    } else {
      this.shopResult(client, false, `🙅 No aceptaron: te quedaste sin ${item.name} y sin cobrar nada.`);
    }
  }

  /** Lo común a comprar y vender: mensaje válido, tienda existente y el jugador al lado de ella. */
  private validateTrade(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const wallet = this.wallets.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !wallet || !inventory || !isShopTradeMessage(message)) return null;

    const shop = this.map.getShop(message.shopId);
    const item = getItem(message.itemId);
    if (!shop || !item) return null;
    if (!this.map.isNearShop(shop, player.x, player.y)) {
      this.shopResult(client, false, `Acercate a ${shop.name} para comprar o vender.`);
      return null;
    }
    return { shop, item, wallet, inventory };
  }

  private shopResult(client: Client, ok: boolean, text: string) {
    const message: ShopResultMessage = { ok, text };
    client.send(MessageType.ShopResult, message);
  }

  /**
   * Ponerse una prenda la saca de la mochila (y lo que estaba puesto en ese lugar vuelve a la
   * mochila); sacarse una prenda la guarda en la mochila, si hay lugar.
   */
  private handleEquip(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !inventory || !isEquipMessage(message)) return;

    const { slot, itemId } = message;
    const worn = player[slot];

    if (itemId === null) {
      if (!worn || !inventory.add(worn)) return;
      player[slot] = "";
    } else {
      const item = getClothing(itemId);
      if (!item || item.slot !== slot || inventory.count(itemId) === 0) return;
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

  private sendInventory(client: Client) {
    const inventory = this.inventories.get(client.sessionId);
    if (!inventory) return;
    const message: InventoryMessage = { stacks: inventory.snapshot(), capacity: inventory.capacity };
    client.send(MessageType.Inventory, message);
    this.revalidateTrade(client.sessionId);
  }

  /** Mandar el saldo al dueño. Llamarlo después de cada cobro o pago. */
  private sendWallet(client: Client) {
    const wallet = this.wallets.get(client.sessionId);
    if (!wallet) return;
    const message: WalletMessage = { balance: wallet.balance };
    client.send(MessageType.Wallet, message);
    this.revalidateTrade(client.sessionId);
  }

  /** Saludar a otro jugador: sale como mensaje propio en el chat (y en el globo). Usa el cooldown del chat. */
  private handleGreet(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const target = isTargetPlayerMessage(message) ? this.state.players.get(message.targetId) : undefined;
    if (!player || !target || target === player) return;

    const now = Date.now();
    if (now - (this.lastChatAt.get(client.sessionId) ?? 0) < CHAT_COOLDOWN_MS) return;
    this.lastChatAt.set(client.sessionId, now);
    this.broadcastChat({
      id: this.nextMessageId(),
      kind: "player",
      sessionId: client.sessionId,
      name: player.name,
      text: `👋 ¡Hola, ${target.name}!`,
      timestamp: now,
    });
  }

  /**
   * Invitar a intercambiar. Al invitado le llega `trade:invite`; si él ya te había invitado, el
   * intercambio arranca directo.
   */
  private handleTradeRequest(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isTargetPlayerMessage(message)) return;
    const target = this.state.players.get(message.targetId);
    const targetClient = this.clients.getById(message.targetId);
    if (!target || !targetClient || target === player) return;
    if (this.trades.get(client.sessionId)) return this.notice(client, "Ya estás en un intercambio.");
    if (this.trades.get(target.sessionId)) return this.notice(client, `${target.name} está en otro intercambio.`);

    const result = this.trades.invite(client.sessionId, target.sessionId, Date.now());
    if (result === "mutual") return this.startTrade(target.sessionId, client.sessionId);
    if (result === "pending") return this.notice(client, `Ya invitaste a ${target.name}: esperá que responda.`);

    const invite: TradeInviteMessage = { fromId: client.sessionId, fromName: player.name, expiresInMs: TRADE_INVITE_MS };
    targetClient.send(MessageType.TradeInvite, invite);
    this.notice(client, `Invitaste a ${target.name} a intercambiar.`);
  }

  private handleTradeRespond(client: Client, message: unknown) {
    if (!isTradeRespondMessage(message)) return;
    const inviter = this.state.players.get(message.fromId);
    const inviterClient = this.clients.getById(message.fromId);
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    if (!this.trades.takeInvite(message.fromId, client.sessionId, Date.now()) || !inviter || !inviterClient) {
      return this.notice(client, "Esa invitación ya venció.");
    }
    if (!message.accept) return this.notice(inviterClient, `${player.name} no quiso intercambiar.`);
    if (this.trades.get(client.sessionId)) return this.notice(client, "Ya estás en un intercambio.");
    if (this.trades.get(message.fromId)) return this.notice(client, `${inviter.name} está en otro intercambio.`);
    this.startTrade(message.fromId, client.sessionId);
  }

  private startTrade(a: string, b: string) {
    const trade = this.trades.start(a, b);
    this.sendTradeState(trade);
  }

  /** Reemplazar la oferta propia: sólo con lo que hay en la mochila y en la billetera. */
  private handleTradeOffer(client: Client, message: unknown) {
    const trade = this.trades.get(client.sessionId);
    const offer = normalizeTradeOffer(message);
    if (!trade || !offer) return;
    const party = this.tradeParty(client.sessionId);
    if (!party) return;
    const problem = checkOffer({ ...party, offer });
    if (problem) {
      this.notice(client, problem);
      return this.sendTradeState(trade);
    }
    this.trades.setOffer(trade, client.sessionId, offer);
    this.sendTradeState(trade);
  }

  /** Aceptar; cuando aceptan los dos se hace el intercambio (o se avisa por qué no se pudo). */
  private handleTradeAccept(client: Client) {
    const trade = this.trades.get(client.sessionId);
    if (!trade || !this.trades.accept(trade, client.sessionId)) {
      if (trade) this.sendTradeState(trade);
      return;
    }

    const a = this.tradeParty(trade.a, trade);
    const b = this.tradeParty(trade.b, trade);
    const problem = a && b ? executeTrade(a, b) : "El intercambio ya no es válido.";
    if (problem) {
      trade.accepted.clear();
      this.sendTradeState(trade);
      for (const id of [trade.a, trade.b]) {
        const c = this.clients.getById(id);
        if (c) this.notice(c, `No se pudo intercambiar: ${problem}`);
      }
      return;
    }

    this.trades.end(trade);
    for (const id of [trade.a, trade.b]) {
      const c = this.clients.getById(id);
      if (!c) continue;
      const partner = this.state.players.get(partnerOf(trade, id));
      this.closeTrade(c, true, `¡Listo! Intercambiaste con ${partner?.name ?? "el otro jugador"}.`);
      this.sendInventory(c);
      this.sendWallet(c);
    }
  }

  /** Cancelar (a mano o porque alguien se fue): les avisa a los dos y no se toca nada. */
  private cancelTrade(sessionId: string, reason: "cancel" | "leave") {
    const trade = reason === "leave" ? this.trades.removePlayer(sessionId) : this.trades.get(sessionId);
    if (!trade) return;
    this.trades.end(trade);
    const name = this.state.players.get(sessionId)?.name ?? "El otro jugador";
    const partner = this.clients.getById(partnerOf(trade, sessionId));
    if (partner) {
      this.closeTrade(partner, false, reason === "leave" ? `${name} se fue: se canceló el intercambio.` : `${name} canceló el intercambio.`);
    }
    const self = this.clients.getById(sessionId);
    if (self && reason === "cancel") this.closeTrade(self, false, "Cancelaste el intercambio.");
  }

  /**
   * Si con el intercambio abierto cambió la mochila o la plata (se puso algo, vendió, pescó…) y la
   * oferta ya no alcanza, se recorta a lo que hay. Eso anula las aceptaciones.
   */
  private revalidateTrade(sessionId: string) {
    const trade = this.trades.get(sessionId);
    const party = trade && this.tradeParty(sessionId, trade);
    const clamped = party && clampOffer(party);
    if (!trade || !clamped) return;
    this.trades.setOffer(trade, sessionId, clamped);
    this.sendTradeState(trade);
  }

  private tradeParty(sessionId: string, trade?: Trade): TradeParty | null {
    const player = this.state.players.get(sessionId);
    const inventory = this.inventories.get(sessionId);
    const wallet = this.wallets.get(sessionId);
    if (!player || !inventory || !wallet) return null;
    const offer = trade?.offers.get(sessionId) ?? { items: [], money: 0 };
    return { name: player.name, inventory, wallet, offer };
  }

  /** A cada uno le llega el intercambio desde su lado (`mine` / `theirs`). */
  private sendTradeState(trade: Trade) {
    for (const id of [trade.a, trade.b]) {
      const client = this.clients.getById(id);
      const partnerId = partnerOf(trade, id);
      if (!client) continue;
      const message: TradeStateMessage = {
        partnerId,
        partnerName: this.state.players.get(partnerId)?.name ?? "",
        mine: { offer: trade.offers.get(id)!, accepted: trade.accepted.has(id) },
        theirs: { offer: trade.offers.get(partnerId)!, accepted: trade.accepted.has(partnerId) },
      };
      client.send(MessageType.TradeState, message);
    }
  }

  private closeTrade(client: Client, ok: boolean, text: string) {
    const message: TradeClosedMessage = { ok, text };
    client.send(MessageType.TradeClosed, message);
  }

  /**
   * Tirar la línea: hay que estar parado (sin camino pendiente) en la escollera, no estar pescando y
   * tener una caña en la mochila (se usa la de mayor nivel). El resultado se sortea ahora con esa
   * caña y se resuelve en `durationMs`; moverse antes lo cancela.
   */
  private handleFishCast(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !inventory || player.fishing || this.paths.has(client.sessionId)) return;
    if (!this.map.canFishAt(player.x, player.y)) {
      return this.fishResult(client, false, "Para pescar tenés que estar parado en la Escollera Sarandí.");
    }
    const rod = bestRod(inventory.snapshot().map((stack) => stack.itemId));
    if (!rod) {
      return this.fishResult(client, false, "Necesitás una caña para pescar. Comprá una en Pesca Sarandí, la tienda frente a la escollera.");
    }

    if (!this.staminas.get(client.sessionId)?.spend(FISH_STAMINA_COST)) {
      return this.fishResult(client, false, "Estás muy cansado para pescar. Descansá un rato: sentarte en un banco ayuda.");
    }

    const { fish, durationMs } = rollCatch(rod);
    player.sitting = false;
    player.fishing = true;
    player.rod = rod.id;
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    const started: FishStartedMessage = { durationMs };
    client.send(MessageType.FishStarted, started);

    const timer = this.clock.setTimeout(() => {
      this.fishingTimers.delete(client.sessionId);
      player.fishing = false;
      player.rod = "";
      this.resolveCatch(client, player, fish);
    }, durationMs);
    this.fishingTimers.set(client.sessionId, timer);
  }

  /** Lo que picó va a la mochila (lo que no entra vuelve al río) y se le cuenta al jugador. */
  private resolveCatch(client: Client, player: Player, fish: FishItem[]) {
    if (fish.length === 0) return this.fishResult(client, false, "No picó nada. Probá de nuevo.");
    const inventory = this.inventories.get(client.sessionId);
    const kept = fish.filter((f) => inventory?.add(f.id));
    const lost = fish.length - kept.length;
    const names = (list: FishItem[]) => list.map(fishWithArticle).join(" y ");

    if (kept.length === 0) {
      const it = fish.length > 1 ? "los" : fish[0].gender === "f" ? "la" : "lo";
      return this.fishResult(client, false, `Picó ${names(fish)}, pero tenés la mochila llena: ${it} devolviste al río.`);
    }
    this.sendInventory(client);
    const total = kept.reduce((sum, f) => sum + f.price, 0);
    const prefix = fish.length > 1 ? "¡Doble! " : "";
    const full = lost > 0 ? " El otro no entraba en la mochila y volvió al río." : "";
    this.fishResult(
      client,
      true,
      `${prefix}¡Sacaste ${names(kept)}! En el Mercado del Puerto pagan ${formatMoney(total)}.${full}`,
      kept.map((f) => f.id),
    );
    const rare = kept.filter((f) => f.difficulty >= 4);
    if (rare.length > 0 || kept.length > 1) {
      this.broadcastSystem(`🎣 ${player.name} sacó ${names(kept)} en la Escollera Sarandí`);
    }
  }

  /** Comerse un pescado de la mochila: recupera `fishStamina(dificultad)` de energía. */
  private handleFishEat(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    const stamina = this.staminas.get(client.sessionId);
    if (!player || !inventory || !stamina || !isFishEatMessage(message)) return;
    const fish = getItem(message.itemId);
    if (fish?.category !== "fish" || inventory.count(fish.id) === 0) return;
    if (stamina.rounded >= MAX_STAMINA) return this.notice(client, "Ya tenés la energía llena: guardalo para después.");

    const gain = fishStamina(fish.difficulty);
    inventory.remove(fish.id);
    stamina.recover(gain);
    player.stamina = stamina.rounded;
    this.sendInventory(client);
    this.notice(client, `🍽️ Te comiste ${fishWithArticle(fish)}: +${gain} de energía.`);
  }

  /** Recoger la línea (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
  private stopFishing(sessionId: string) {
    this.fishingTimers.get(sessionId)?.clear();
    this.fishingTimers.delete(sessionId);
    const player = this.state.players.get(sessionId);
    if (player) {
      player.fishing = false;
      player.rod = "";
    }
  }

  private fishResult(client: Client, ok: boolean, text: string, itemIds?: string[]) {
    const message: FishResultMessage = { ok, text, itemIds };
    client.send(MessageType.FishResult, message);
  }

  private syncClock() {
    const minute = Math.floor(gameClock.minuteOfDay());
    if (this.state.minuteOfDay !== minute) this.state.minuteOfDay = minute;
  }

  /** Sólo un admin puede mover el reloj del juego; desde ahí sigue solo y lo ven todos (Schema). */
  private handleAdminSetTime(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.admin || !isAdminSetTimeMessage(message)) return;
    gameClock.set(message.minuteOfDay);
    this.syncClock();
    this.broadcastSystem(`🕒 ${player.name} movió el reloj a las ${formatClock(message.minuteOfDay)}`);
  }

  private isBenchTaken(bench: Bench, exceptSessionId: string) {
    for (const [sessionId, other] of this.state.players) {
      if (sessionId !== exceptSessionId && other.sitting && other.x === bench.x && other.y === bench.y) return true;
    }
    return false;
  }

  private handleChat(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isChatMessage(message)) return;

    const now = Date.now();
    const last = this.lastChatAt.get(client.sessionId) ?? 0;
    if (now - last < CHAT_COOLDOWN_MS) return;

    const text = sanitizeChat(message.text);
    if (!text) return;

    this.lastChatAt.set(client.sessionId, now);
    // "/algo" es un comando (ver `commands/`): no va al chat.
    if (runCommand(text, { client, player }, this.commandHost)) return;

    this.broadcastChat({
      id: this.nextMessageId(),
      kind: "player",
      sessionId: client.sessionId,
      name: player.name,
      text,
      timestamp: now,
    });
  }

  /** Lo que los comandos de chat pueden pedirle a la sala (ver `commands/types.ts`). */
  private commandHost: CommandHost = {
    notice: (client, text) => this.notice(client, text),
    giveItem: (client, itemId, quantity) => {
      const inventory = this.inventories.get(client.sessionId);
      let given = 0;
      while (inventory && given < quantity && inventory.add(itemId)) given += 1;
      if (given > 0) this.sendInventory(client);
      return given;
    },
    findPlayers: (name) => {
      const wanted = name.toLocaleLowerCase("es");
      const found: Array<{ client: Client; player: Player }> = [];
      for (const [sessionId, player] of this.state.players) {
        const client = this.clients.getById(sessionId);
        if (client && player.name.toLocaleLowerCase("es") === wanted) found.push({ client, player });
      }
      return found;
    },
    giveMoney: (client, amount) => {
      if (!this.wallets.get(client.sessionId)?.credit(amount)) return false;
      this.sendWallet(client);
      return true;
    },
    // Anuncio para todos los barrios: se publica en presence y cada sala lo reenvía.
    announce: (name, text) => {
      const announcement: AnnouncementMessage = { id: `${Date.now()}-${this.nextMessageId()}`, name, text };
      this.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
      console.log(`[Anuncio] ${name}: ${text}`);
    },
  };

  /**
   * Comprar el boleto para viajar: el barrio existe y no es éste, alcanza la plata y hay clave (sin
   * clave no se guarda la mochila y no se podría llevar al otro barrio). Se cobra, se guarda el
   * progreso ya cobrado y se emite el boleto; el cliente sale y entra al destino.
   */
  private handleTravelRequest(client: Client, message: unknown) {
    const key = this.playerKeys.get(client.sessionId);
    const wallet = this.wallets.get(client.sessionId);
    if (!wallet || !isTravelMessage(message)) return;
    const destination = getCity(message.cityId);
    if (!destination || destination.id === this.map.city.id) return;
    if (!key) return this.notice(client, "Para viajar, tu navegador tiene que permitir guardar datos del sitio.");
    if (!wallet.debit(TRAVEL_FARE)) {
      return this.notice(client, `No te alcanza para el boleto: sale ${formatMoney(TRAVEL_FARE)}.`);
    }
    this.sendWallet(client);
    this.savePlayer(client.sessionId);
    travelTickets.set(key, { cityId: destination.id, expiresAt: Date.now() + TRAVEL_TICKET_MS });
    const approved: TravelMessage = { cityId: destination.id };
    client.send(MessageType.TravelApproved, approved);
  }

  /** Clic en una palmera: si está al lado la sacude; si no, camina hasta ella y la sacude al llegar. */
  private handlePalmShake(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isTileMessage(message) || !this.map.isPalm(message.x, message.y)) return;
    const palm = { x: message.x, y: message.y };
    this.stopFishing(client.sessionId);
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    if (this.map.isNextTo(palm, player.x, player.y)) {
      this.paths.delete(client.sessionId);
      this.pendingPalms.delete(client.sessionId);
      return this.shakePalm(client, palm);
    }
    const approach = this.map.approachTile(palm, { x: player.x, y: player.y });
    const path = approach ? this.map.findPath({ x: player.x, y: player.y }, approach) : [];
    if (path.length === 0) return;
    player.sitting = false;
    this.paths.set(client.sessionId, path);
    this.pendingPalms.set(client.sessionId, palm);
  }

  private shakePalm(client: Client, palm: TilePoint) {
    if (this.weevils.shake(palm, Date.now()) === 0) {
      this.notice(client, "La palmera está tranquila por ahora: probá en un rato.");
    }
  }

  /** Patada a un picudo: hay que estar cerca. Aplastarlo paga `WEEVIL_REWARD`. */
  private handleWeevilKick(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isWeevilKickMessage(message)) return;
    const result = this.weevils.kick(message.id, { x: player.x, y: player.y }, Date.now());
    if (result === "far") return this.notice(client, "Está lejos: acercate para patearlo.");
    if (result !== "killed") return;
    player.kicks += 1;
    if (this.wallets.get(client.sessionId)?.credit(WEEVIL_REWARD)) this.sendWallet(client);
  }

  /**
   * Abrir una caja sorpresa de la mochila: se consume y su premio (sorteado por peso) va a la
   * mochila. Si no hay lugar para el premio, la caja queda cerrada.
   */
  private handleBoxOpen(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !inventory || !isBoxOpenMessage(message)) return;
    const box = getItem(message.itemId);
    if (!isBox(box) || inventory.count(box.id) === 0) return;

    const prize = rollLoot(box);
    const after = inventory.clone();
    after.remove(box.id);
    if (!after.canAdd(prize.id)) return this.notice(client, "No tenés lugar en la mochila para lo que hay adentro de la caja.");

    inventory.remove(box.id);
    inventory.add(prize.id);
    this.sendInventory(client);
    const prizeName = prize.category === "fish" ? fishWithArticle(prize) : prize.name;
    const opened: BoxOpenedMessage = { boxId: box.id, prizeId: prize.id, text: `¡Te salió ${prizeName}!` };
    client.send(MessageType.BoxOpened, opened);
    if (prize.category === "fish" && prize.difficulty >= 4) {
      this.broadcastSystem(`🎁 ${player.name} abrió ${box.name.toLowerCase()} y le salió ${prizeName}`);
    }
  }

  /** Lo llama presence en cada sala: reenvía el anuncio a sus jugadores. */
  private relayAnnouncement = (announcement: AnnouncementMessage) => {
    this.broadcast(MessageType.Announcement, announcement);
  };

  /** Avanza un tile a cada jugador que tenga camino pendiente; sienta a los que llegaron a su banco. */
  private stepPlayers() {
    // Primero los que ya llegaron (sin camino pendiente): se sientan un tick después de llegar,
    // así el avatar no salta dos tiles de golpe.
    for (const [sessionId, bench] of this.pendingSits) {
      if (this.paths.has(sessionId)) continue;
      this.pendingSits.delete(sessionId);
      const player = this.state.players.get(sessionId);
      if (!player || this.isBenchTaken(bench, sessionId)) continue;
      player.x = bench.x;
      player.y = bench.y;
      player.sitting = true;
    }

    // Llegaron a una palmera: la sacuden.
    for (const [sessionId, palm] of this.pendingPalms) {
      if (this.paths.has(sessionId)) continue;
      this.pendingPalms.delete(sessionId);
      const player = this.state.players.get(sessionId);
      const client = this.clients.getById(sessionId);
      if (player && client && this.map.isNextTo(palm, player.x, player.y)) this.shakePalm(client, palm);
    }

    // Llegaron a una tienda: se les abre el panel.
    for (const [sessionId, shop] of this.pendingShops) {
      if (this.paths.has(sessionId)) continue;
      this.pendingShops.delete(sessionId);
      const player = this.state.players.get(sessionId);
      const client = this.clients.getById(sessionId);
      if (player && client && this.map.isNearShop(shop, player.x, player.y)) this.openShop(client, shop);
    }

    for (const [sessionId, path] of this.paths) {
      const player = this.state.players.get(sessionId);
      if (!player || path.length === 0) {
        this.paths.delete(sessionId);
        continue;
      }
      // Cada paso gasta energía: agotado, se frena donde está (y no llega a banco ni tienda).
      if (!this.staminas.get(sessionId)?.spend(WALK_STAMINA_COST)) {
        this.paths.delete(sessionId);
        this.pendingSits.delete(sessionId);
        this.pendingShops.delete(sessionId);
        this.pendingPalms.delete(sessionId);
        const client = this.clients.getById(sessionId);
        if (client) this.notifyExhausted(client);
        continue;
      }
      const next = path.shift()!;
      player.x = next.x;
      player.y = next.y;
      if (path.length === 0) this.paths.delete(sessionId);
    }

    this.recoverStamina();
  }

  /** Quieto se recupera energía; sentado en un banco, mucho más rápido. Pescando, no. */
  private recoverStamina() {
    const seconds = STEP_MS / 1000;
    for (const [sessionId, player] of this.state.players) {
      const stamina = this.staminas.get(sessionId);
      if (!stamina) continue;
      if (!this.paths.has(sessionId) && !player.fishing) {
        stamina.recover((player.sitting ? SIT_STAMINA_REGEN : IDLE_STAMINA_REGEN) * seconds);
      }
      if (player.stamina !== stamina.rounded) player.stamina = stamina.rounded;
    }
  }

  private notifyExhausted(client: Client) {
    this.notice(
      client,
      `Estás agotado: descansá hasta recuperar ${EXHAUSTED_RECOVERY} de energía (sentado en un banco es mucho más rápido).`,
    );
  }

  private notice(client: Client, text: string) {
    const message: NoticeMessage = { text };
    client.send(MessageType.Notice, message);
  }

  private broadcastSystem(text: string, except?: Client) {
    this.broadcastChat(
      {
        id: this.nextMessageId(),
        kind: "system",
        sessionId: "",
        name: "Sistema",
        text,
        timestamp: Date.now(),
      },
      except,
    );
  }

  private broadcastChat(payload: ChatBroadcastMessage, except?: Client) {
    this.broadcast(MessageType.Chat, payload, except ? { except } : undefined);
  }

  private nextMessageId() {
    this.messageSeq += 1;
    return `${this.roomId}-${this.messageSeq}`;
  }
}

function isTileMessage(message: unknown): message is MoveMessage | SitMessage {
  if (typeof message !== "object" || message === null) return false;
  const { x, y } = message as Record<string, unknown>;
  return Number.isInteger(x) && Number.isInteger(y);
}

const isMoveMessage = isTileMessage;

function isTravelMessage(message: unknown): message is TravelMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).cityId === "string";
}

function isWeevilKickMessage(message: unknown): message is WeevilKickMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).id === "string";
}

function isFishEatMessage(message: unknown): message is FishEatMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).itemId === "string";
}

function isBoxOpenMessage(message: unknown): message is BoxOpenMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).itemId === "string";
}

function isAdminSetTimeMessage(message: unknown): message is AdminSetTimeMessage {
  return typeof message === "object" && message !== null && isValidMinuteOfDay((message as Record<string, unknown>).minuteOfDay);
}

function isShopHaggleMessage(message: unknown): message is ShopHaggleMessage {
  return isShopTradeMessage(message) && typeof (message as unknown as Record<string, unknown>).price === "number";
}

function isShopTradeMessage(message: unknown): message is ShopTradeMessage {
  if (typeof message !== "object" || message === null) return false;
  const { shopId, itemId } = message as Record<string, unknown>;
  return typeof shopId === "string" && typeof itemId === "string";
}

function isEquipMessage(message: unknown): message is EquipMessage {
  if (typeof message !== "object" || message === null) return false;
  const { slot, itemId } = message as Record<string, unknown>;
  return isItemSlot(slot) && (itemId === null || typeof itemId === "string");
}

function isTargetPlayerMessage(message: unknown): message is TargetPlayerMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).targetId === "string";
}

function isTradeRespondMessage(message: unknown): message is TradeRespondMessage {
  if (typeof message !== "object" || message === null) return false;
  const { fromId, accept } = message as Record<string, unknown>;
  return typeof fromId === "string" && typeof accept === "boolean";
}

function isChatMessage(message: unknown): message is ChatInputMessage {
  if (typeof message !== "object" || message === null) return false;
  return typeof (message as Record<string, unknown>).text === "string";
}
