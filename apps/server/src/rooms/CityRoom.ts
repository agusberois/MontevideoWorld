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
  PLAYER_COLORS,
  AdminSetTimeMessage,
  AnnouncementMessage,
  POST_COMMAND,
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
} from "@montevideo-world/shared";
import { GameState, Player } from "@montevideo-world/shared/schema";
import { rollCatch } from "../fishing";
import { isAdminName } from "../env";
import { gameClock } from "../gameClock";
import { Inventory } from "../inventory";
import { Stamina } from "../stamina";
import { Wallet } from "../wallet";

/**
 * Una sala por barrio: se registra con `filterBy(["cityId"])`, así cada `cityId` de las opciones
 * de join tiene sus propias salas.
 */
/** Canal de presence por el que viajan los anuncios del admin a todas las salas (todos los barrios). */
const ANNOUNCEMENT_TOPIC = "announcements";

export class CityRoom extends Room<GameState> {
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
  /** Línea en el agua: el timer que resuelve la pesca de cada jugador. */
  private fishingTimers = new Map<string, Delayed>();
  private lastChatAt = new Map<string, number>();
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
    this.onMessage(MessageType.FishCast, (client) => this.handleFishCast(client));
    this.onMessage(MessageType.FishStop, (client) => this.stopFishing(client.sessionId));
    this.onMessage(MessageType.AdminSetTime, (client, message: unknown) => this.handleAdminSetTime(client, message));
    this.presence.subscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);

    this.clock.setInterval(() => this.stepPlayers(), STEP_MS);
    // La hora del juego se copia al Schema una vez por segundo (avanza ~1 minuto del juego por segundo).
    this.syncClock();
    this.clock.setInterval(() => this.syncClock(), 1000);
  }

  onJoin(client: Client, options: Partial<JoinOptions> = {}) {
    const spawn = this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];

    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = sanitizeName(options.name) || `Invitado${Math.floor(1000 + Math.random() * 9000)}`;
    player.color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    player.admin = isAdminName(player.name);
    player.x = spawn.x;
    player.y = spawn.y;
    // Jugador nuevo: aparece con el kit inicial puesto y la mochila vacía.
    for (const slot of ITEM_SLOTS) {
      const options = STARTER_KIT[slot];
      player[slot] = options ? options[Math.floor(Math.random() * options.length)] : "";
    }
    this.inventories.set(client.sessionId, new Inventory());
    this.wallets.set(client.sessionId, new Wallet());
    this.staminas.set(client.sessionId, new Stamina());

    this.state.players.set(client.sessionId, player);
    this.broadcastSystem(`${player.name} llegó a ${this.map.city.name}`, client);
    console.log(`[CityRoom ${this.roomId} ${this.map.city.id}] join ${client.sessionId} (${player.name})`);
  }

  onLeave(client: Client) {
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

    if (player) this.broadcastSystem(`${player.name} se fue de ${this.map.city.name}`);
    console.log(`[CityRoom ${this.roomId}] leave ${client.sessionId}`);
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
      return;
    }

    // Caminar a otro lado cancela sentarse o ir a una tienda (y levanta al que estaba sentado).
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
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
  }

  /** Mandar el saldo al dueño. Llamarlo después de cada cobro o pago. */
  private sendWallet(client: Client) {
    const wallet = this.wallets.get(client.sessionId);
    if (!wallet) return;
    const message: WalletMessage = { balance: wallet.balance };
    client.send(MessageType.Wallet, message);
  }

  /**
   * Tirar la línea: hay que estar parado (sin camino pendiente) en la escollera y no estar pescando.
   * El resultado se sortea ahora y se resuelve en `durationMs`; moverse antes lo cancela.
   */
  private handleFishCast(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.fishing || this.paths.has(client.sessionId)) return;
    if (!this.map.canFishAt(player.x, player.y)) {
      return this.fishResult(client, false, "Para pescar tenés que estar parado en la Escollera Sarandí.");
    }

    if (!this.staminas.get(client.sessionId)?.spend(FISH_STAMINA_COST)) {
      return this.fishResult(client, false, "Estás muy cansado para pescar. Descansá un rato: sentarte en un banco ayuda.");
    }

    const { fish, durationMs } = rollCatch();
    player.sitting = false;
    player.fishing = true;
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    const started: FishStartedMessage = { durationMs };
    client.send(MessageType.FishStarted, started);

    const timer = this.clock.setTimeout(() => {
      this.fishingTimers.delete(client.sessionId);
      player.fishing = false;
      const inventory = this.inventories.get(client.sessionId);
      if (!fish) return this.fishResult(client, false, "No picó nada. Probá de nuevo.");
      const caught = fishWithArticle(fish);
      const it = fish.gender === "f" ? "la" : "lo";
      if (!inventory?.add(fish.id)) {
        return this.fishResult(client, false, `Picó ${caught}, pero tenés la mochila llena: ${it} devolviste al río.`);
      }
      this.sendInventory(client);
      this.fishResult(client, true, `¡Sacaste ${caught}! En el Mercado del Puerto ${it} pagan ${formatMoney(fish.price)}.`, fish.id);
      if (fish.difficulty >= 4) {
        this.broadcastSystem(`🎣 ${player.name} sacó ${caught} en la Escollera Sarandí`);
      }
    }, durationMs);
    this.fishingTimers.set(client.sessionId, timer);
  }

  /** Recoger la línea (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
  private stopFishing(sessionId: string) {
    this.fishingTimers.get(sessionId)?.clear();
    this.fishingTimers.delete(sessionId);
    const player = this.state.players.get(sessionId);
    if (player) player.fishing = false;
  }

  private fishResult(client: Client, ok: boolean, text: string, itemId?: string) {
    const message: FishResultMessage = { ok, text, itemId };
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
    if (isCommand(text, POST_COMMAND)) return this.handlePostCommand(client, player.name, player.admin, text);

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
  private handlePostCommand(client: Client, name: string, isAdmin: boolean, text: string) {
    if (!isAdmin) return this.notice(client, `El comando ${POST_COMMAND} es sólo para el admin.`);
    const body = text.slice(POST_COMMAND.length).trim();
    if (!body) return this.notice(client, `Usá: ${POST_COMMAND} <mensaje>`);

    const announcement: AnnouncementMessage = { id: `${Date.now()}-${this.nextMessageId()}`, name, text: body };
    this.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
    console.log(`[Anuncio] ${name}: ${body}`);
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

/** "/post hola" o "/post" (no "/postre"): el comando, sin importar mayúsculas. */
function isCommand(text: string, command: string): boolean {
  const lower = text.toLowerCase();
  return lower === command || lower.startsWith(`${command} `);
}

function isAdminSetTimeMessage(message: unknown): message is AdminSetTimeMessage {
  return typeof message === "object" && message !== null && isValidMinuteOfDay((message as Record<string, unknown>).minuteOfDay);
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

function isChatMessage(message: unknown): message is ChatInputMessage {
  if (typeof message !== "object" || message === null) return false;
  return typeof (message as Record<string, unknown>).text === "string";
}
