import { Client, Delayed, Room, ServerError } from "@colyseus/core";
import {
  JAILED_JOIN_CODE,
  JAILED_KICK_CODE,
  JAIL_CITY_ID,
  JAIL_TRAVEL_GRACE_MS,
  formatJailLeft,
  Bench,
  CHAT_COOLDOWN_MS,
  ChatBroadcastMessage,
  ChatInputMessage,
  CityMap,
  EquipMessage,
  ITEM_SLOTS,
  InventoryMessage,
  InventoryMoveMessage,
  PetAdoptMessage,
  ShopCheckoutMessage,
  ItemDefinition,
  PetRenameMessage,
  getPet,
  sanitizePetName,
  JoinOptions,
  MAX_PLAYERS_PER_ROOM,
  MAX_ROUTE_LENGTH,
  MessageType,
  MoveMessage,
  randomAppearance,
  sanitizeAppearance,
  AdminSetTimeMessage,
  AnnouncementMessage,
  BoxOpenMessage,
  SPAWN_CITY_ID,
  TICKET_ID,
  whereToBuy,
  TRAVEL_TICKET_MS,
  TravelMessage,
  getCity,
  WEEVIL_BITE_ENERGY,
  WEEVIL_REWARD,
  WeevilKickMessage,
  STARTING_MONEY,
  isPlayerKey,
  FoodEatMessage,
  NeedsMessage,
  FaintMessage,
  HOSPITAL_CITY_ID,
  HOSPITAL_SHOP_ID,
  LOW_HEALTH,
  MAX_HEALTH,
  WEAK_ENERGY_CAP,
  WEEVIL_BITE_HEALTH,
  faintFee,
  hospitalPrice,
  edibleLabel,
  edibleValue,
  hungerLevel,
  FISH_HUNGER_COST,
  VEND_HUNGER_COST,
  WALK_HUNGER_COST,
  MAX_MONEY,
  ShopHaggleMessage,
  haggleChance,
  isValidHagglePrice,
  maxHagglePrice,
  FishItem,
  MAX_ENERGY,
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
  SHOP_MAX_QUANTITY,
  formatMoney,
  sellPrice,
  SitMessage,
  TilePoint,
  WalletMessage,
  getCityMap,
  EXHAUSTED_RECOVERY,
  FISH_ENERGY_COST,
  FishResultMessage,
  FishStartedMessage,
  NoticeMessage,
  WALK_ENERGY_COST,
  ITEM_CATEGORIES,
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
  VEND_ENERGY_COST,
  VendResultMessage,
  VendStartedMessage,
  bestCart,
  MATCH_MODES,
  AdminMatchMessage,
  CUSTOMER_LEAD_MS,
  CustomerState,
  ToolItem,
  TradeOffer,
  AdminGiveMessage,
  AdminNearbyMessage,
  MAKER_MAX_QUANTITY,
  MAKER_RANGE,
  MessageTypeName,
} from "@montevideo-world/shared";
import { GameState, Player } from "@montevideo-world/shared/schema";
import { CommandHost, runCommand } from "../commands";
import { rollCatch } from "../fishing";
import { rollSale } from "../vending";
import { WeevilManager, WeevilTarget } from "../weevils";
import { SessionOwner, activeSessions, issueTravelTicket, playerStore, travelTickets } from "../playerStore";
import { PrivateMailbox, playerDirectory } from "../directory";
import { bans } from "../bans";
import { isAdminName } from "../env";
import { gameClock } from "../gameClock";
import { Inventory } from "../inventory";
import { Needs } from "../needs";
import { Trade, TradeManager, TradeParty, checkOffer, clampOffer, executeTrade, partnerOf } from "../trades";
import { Wallet } from "../wallet";
import { RateLimiter, UNKNOWN_MESSAGE_TYPE } from "../rateLimit";
import { RoomStats, RoomStatsSource, liveRooms, tickMetrics } from "../metrics";

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
/** Código de cierre para un cliente que spamea mensajes de forma sostenida (ver `rateLimit.ts`). */
const RATE_LIMIT_CODE = 4002;

/** Canal de presence por el que viajan los anuncios del admin a todas las salas (todos los barrios). */
const ANNOUNCEMENT_TOPIC = "announcements";

/**
 * Copias abiertas de cada barrio (cityId → números en uso). Cada sala nueva toma el número libre más
 * bajo y lo devuelve al cerrarse. En memoria del proceso, como `playerDirectory`: una sola instancia.
 */
const openCopies = new Map<string, Set<number>>();

function takeCopyNumber(cityId: string): number {
  const used = openCopies.get(cityId) ?? new Set<number>();
  openCopies.set(cityId, used);
  let copy = 1;
  while (used.has(copy)) copy += 1;
  used.add(copy);
  return copy;
}

function releaseCopyNumber(cityId: string, copy: number) {
  openCopies.get(cityId)?.delete(copy);
}

export class CityRoom extends Room<GameState> implements SessionOwner, PrivateMailbox, RoomStatsSource {
  maxClients = MAX_PLAYERS_PER_ROOM;

  /** Estado sólo de servidor: no se sincroniza, por eso no vive en el Schema. */
  private paths = new Map<string, TilePoint[]>();
  /** Banco al que va cada jugador: se sienta cuando termina su camino. */
  private pendingSits = new Map<string, Bench>();
  private inventories = new Map<string, Inventory>();
  private wallets = new Map<string, Wallet>();
  private needs = new Map<string, Needs>();
  /** Lista de jugadores que se les pasa a los picudos en cada tick (reutilizada, ver `WeevilHost.players`). */
  private weevilTargets: WeevilTarget[] = [];
  /** Tienda a la que va cada jugador: se le abre cuando llega. */
  private pendingShops = new Map<string, Shop>();
  /** Palmera a la que va cada jugador: la sacude al llegar. */
  private pendingPalms = new Map<string, TilePoint>();
  /** Picudos rojos de las palmeras (ver `weevils.ts`). */
  private weevils!: WeevilManager;
  /** Línea en el agua: el timer que resuelve la pesca de cada jugador. */
  private fishingTimers = new Map<string, Delayed>();
  /** Vendiendo: el timer que resuelve la venta de cada jugador. */
  private vendingTimers = new Map<string, Delayed>();
  /** Vendiendo: el timer que hace salir al hincha hacia el carrito (`CUSTOMER_LEAD_MS` antes del resultado). */
  private customerTimers = new Map<string, Delayed>();
  /** Partido que se está jugando en el Centenario (sólo en el barrio con zona de venta), para anunciarlo. */
  private currentMatch: string | null = null;
  private lastChatAt = new Map<string, number>();
  /** Lo último que se le mandó a cada uno de sus necesidades privadas (para mandar sólo si cambió). */
  private sentNeeds = new Map<string, NeedsMessage>();
  /** Clave secreta de cada sesión: con ella se guarda y se recupera su progreso (`playerStore`). */
  private playerKeys = new Map<string, string>();
  /** Invitaciones e intercambios entre jugadores de esta sala. */
  private trades = new TradeManager();
  private messageSeq = 0;
  /** Límite de frecuencia por cliente y por tipo de mensaje: lo aplica `handle` a todos. */
  private rateLimiter = new RateLimiter();
  /** "barrio#copia (roomId)", para los avisos del log. */
  private label = "";
  private map!: CityMap;
  private spawnTiles: TilePoint[] = [];
  /** Cárcel: dónde aparecen los presos (el patio); vacío en los demás barrios. */
  private prisonTiles: TilePoint[] = [];

  onCreate(options: Partial<JoinOptions> = {}) {
    const map = typeof options.cityId === "string" ? getCityMap(options.cityId) : undefined;
    if (!map) throw new Error(`Barrio desconocido: ${String(options.cityId)}`);
    this.map = map;
    this.spawnTiles = map.spawnTiles();
    this.prisonTiles = map.prisonTiles();

    this.state = new GameState();
    this.state.copy = takeCopyNumber(map.city.id);
    this.label = `${map.city.id}#${this.state.copy} (${this.roomId})`;
    liveRooms.add(this);
    if (this.state.copy > 1) console.log(`[CityRoom ${this.roomId}] ${map.city.id} lleno: se abrió la copia ${this.state.copy}`);

    this.handle(MessageType.Move, (client, message) => this.handleMove(client, message));
    this.handle(MessageType.Chat, (client, message) => this.handleChat(client, message));
    this.handle(MessageType.Sit, (client, message) => this.handleSit(client, message));
    this.handle(MessageType.Equip, (client, message) => this.handleEquip(client, message));
    this.handle(MessageType.RequestInventory, (client) => this.sendInventory(client));
    this.handle(MessageType.InventoryMove, (client, message) => this.handleInventoryMove(client, message));
    this.handle(MessageType.RequestWallet, (client) => this.sendWallet(client));
    this.handle(MessageType.RequestNeeds, (client) => this.sendNeeds(client));
    this.handle(MessageType.HospitalHeal, (client, message) => this.handleHospitalHeal(client, message));
    this.handle(MessageType.ShopVisit, (client, message) => this.handleShopVisit(client, message));
    this.handle(MessageType.ShopBuy, (client, message) => this.handleShopBuy(client, message));
    this.handle(MessageType.ShopSell, (client, message) => this.handleShopSell(client, message));
    this.handle(MessageType.ShopHaggle, (client, message) => this.handleShopHaggle(client, message));
    this.handle(MessageType.FishCast, (client) => this.handleFishCast(client));
    this.handle(MessageType.FishStop, (client) => this.stopFishing(client.sessionId));
    this.handle(MessageType.FoodEat, (client, message) => this.handleFoodEat(client, message));
    this.handle(MessageType.VendStart, (client) => this.handleVendStart(client));
    this.handle(MessageType.VendStop, (client) => this.stopVending(client.sessionId));
    this.handle(MessageType.AdminSetTime, (client, message) => this.handleAdminSetTime(client, message));
    this.handle(MessageType.AdminNearbyRequest, (client) => this.sendNearby(client));
    this.handle(MessageType.AdminGive, (client, message) => this.handleAdminGive(client, message));
    this.handle(MessageType.AdminMatch, (client, message) => this.handleAdminMatch(client, message));
    this.handle(MessageType.BoxOpen, (client, message) => this.handleBoxOpen(client, message));
    this.handle(MessageType.TravelRequest, (client, message) => this.handleTravelRequest(client, message));
    this.handle(MessageType.PalmShake, (client, message) => this.handlePalmShake(client, message));
    this.handle(MessageType.WeevilKick, (client, message) => this.handleWeevilKick(client, message));
    this.handle(MessageType.Greet, (client, message) => this.handleGreet(client, message));
    this.handle(MessageType.ShopCheckout, (client, message) => this.handleShopCheckout(client, message));
    this.handle(MessageType.PetAdopt, (client, message) => this.handlePetAdopt(client, message));
    this.handle(MessageType.PetRename, (client, message) => this.handlePetRename(client, message));
    this.handle(MessageType.PetRelease, (client, message) => this.handlePetRelease(client, message));
    this.handle(MessageType.Taunt, (client, message) => this.handleTaunt(client, message));
    this.handle(MessageType.TradeRequest, (client, message) => this.handleTradeRequest(client, message));
    this.handle(MessageType.TradeRespond, (client, message) => this.handleTradeRespond(client, message));
    this.handle(MessageType.TradeOffer, (client, message) => this.handleTradeOffer(client, message));
    this.handle(MessageType.TradeAccept, (client) => this.handleTradeAccept(client));
    this.handle(MessageType.TradeCancel, (client) => this.cancelTrade(client.sessionId, "cancel"));
    // Tipos sin handler (cliente modificado): se cuentan contra el límite y se descartan sin loguear.
    this.onMessage(UNKNOWN_MESSAGE_TYPE, (client) => this.allowMessage(client, UNKNOWN_MESSAGE_TYPE));
    this.presence.subscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);

    this.clock.setInterval(() => {
      const started = performance.now();
      this.stepPlayers();
      tickMetrics.players.record(performance.now() - started, this.label);
    }, STEP_MS);
    this.weevils = new WeevilManager(this.state.weevils, {
      // Se reutiliza la misma lista (y los mismos objetos) en cada tick: no se crea basura 10 veces por segundo.
      players: () => {
        let i = 0;
        for (const [id, player] of this.state.players) {
          const target = (this.weevilTargets[i] ??= { id, tile: { x: 0, y: 0 } });
          target.id = id;
          target.tile.x = player.x;
          target.tile.y = player.y;
          i += 1;
        }
        this.weevilTargets.length = i;
        return this.weevilTargets;
      },
      bite: (sessionId) => {
        const needs = this.needs.get(sessionId);
        needs?.drainEnergy(WEEVIL_BITE_ENERGY);
        needs?.hurt(WEEVIL_BITE_HEALTH);
      },
    });
    this.clock.setInterval(() => {
      // Sin picudos no hay nada que simular (ni que medir).
      if (this.weevils.size === 0) return;
      const started = performance.now();
      this.weevils.tick(WEEVIL_TICK_MS, Date.now());
      tickMetrics.weevils.record(performance.now() - started, this.label);
    }, WEEVIL_TICK_MS);
    // Guardado periódico: si el proceso se corta, se pierde como mucho este intervalo.
    this.clock.setInterval(() => this.saveAllPlayers(), SAVE_INTERVAL_MS);
    // La hora del juego se copia al Schema una vez por segundo (avanza ~1 minuto del juego por segundo).
    // Si arranca con un partido en juego, no se anuncia (nadie estaba para oírlo).
    this.currentMatch = this.map.city.vending ? (gameClock.currentMatch()?.name ?? null) : null;
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
    // Fuera del barrio de spawn sólo se entra con boleto (se paga en la sala de origen). Al de spawn
    // también puede venir uno (de `/trace`): se consume igual, para aparecer al lado del jugador.
    const issued = key ? travelTickets.get(key) : undefined;
    const ticket = issued && issued.cityId === this.map.city.id && issued.expiresAt >= Date.now() ? issued : undefined;
    // Preso (`/ban`): sólo puede entrar al COMCAR, y ahí entra sin boleto. El cliente, al ver este
    // código, entra solo al COMCAR.
    const jailedUntil = bans.until(key, player.name);
    const inJail = this.map.city.id === JAIL_CITY_ID;
    if (jailedUntil && !inJail) {
      throw new ServerError(JAILED_JOIN_CODE, `Estás preso en el COMCAR: te quedan ${formatJailLeft((jailedUntil - Date.now()) / 1000)}.`);
    }
    if (this.map.city.id !== SPAWN_CITY_ID && !ticket && !(inJail && jailedUntil)) {
      throw new Error(`Para entrar a ${this.map.city.name} necesitás un boleto.`);
    }
    if (jailedUntil) {
      player.jailLeft = Math.ceil((jailedUntil - Date.now()) / 1000);
      // Preso: aparece adentro, en el patio (las visitas aparecen afuera, del otro lado de la reja).
      const cell = this.randomPrisonTile();
      if (cell) {
        player.x = cell.x;
        player.y = cell.y;
      }
    }
    if (ticket) {
      travelTickets.delete(key!);
      const at = ticket.at && this.map.isWalkable(ticket.at.x, ticket.at.y) ? ticket.at : undefined;
      const near = ticket.near ? this.tileNear(ticket.near) : at;
      if (near) {
        player.x = near.x;
        player.y = near.y;
      }
    }
    if (key) {
      const previous = activeSessions.get(key);
      if (previous) previous.owner.evictDuplicate(previous.sessionId);
      activeSessions.set(key, { owner: this, sessionId: client.sessionId });
      this.playerKeys.set(client.sessionId, key);
    }
    const saved = key ? playerStore.get(key) : undefined;

    if (saved) {
      player.donor = saved.donor === true;
      const pet = saved.pet && getPet(saved.pet.id);
      const petName = sanitizePetName(saved.pet?.name);
      if (pet && petName) {
        player.pet = pet.id;
        player.petName = petName;
      }
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
    // Necesidades guardadas (sin guardado, o uno viejo sin ellas: todo lleno).
    const needs = Needs.restore(saved?.needs);
    this.needs.set(client.sessionId, needs);
    player.energy = needs.energy;

    this.state.players.set(client.sessionId, player);
    playerDirectory.add({
      sessionId: client.sessionId,
      name: player.name,
      cityId: this.map.city.id,
      cityName: this.map.city.name,
      mailbox: this,
    });
    this.broadcastSystem(`${player.name} llegó a ${this.map.city.name}`, client);
    console.log(`[CityRoom ${this.roomId} ${this.map.city.id}] join ${client.sessionId} (${player.name})`);
  }

  onLeave(client: Client) {
    playerDirectory.remove(client.sessionId);
    this.stopActivities(client.sessionId);
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
    this.needs.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.sentNeeds.delete(client.sessionId);
    this.rateLimiter.forget(client.sessionId);

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
      donor: player.donor,
      jailedUntil: bans.savedUntil(key),
      pet: player.pet ? { id: player.pet, name: player.petName } : undefined,
      needs: this.needs.get(sessionId)?.snapshot(),
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
    this.stopActivities(sessionId);
    this.cancelTrade(sessionId, "leave");
    this.savePlayer(sessionId);
    this.playerKeys.delete(sessionId);
    const client = this.clients.getById(sessionId);
    if (!client) return;
    this.notice(client, "Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
    client.leave(DUPLICATE_SESSION_CODE);
  }

  onDispose() {
    liveRooms.delete(this);
    releaseCopyNumber(this.map.city.id, this.state.copy);
    this.presence.unsubscribe(ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
    console.log(`[CityRoom ${this.roomId}] disposed`);
  }

  /**
   * Registrar el handler de un mensaje del cliente pasando por el límite de frecuencia
   * (`rateLimit.ts`): lo que se pasa se descarta antes de llegar al handler. Todo mensaje nuevo se
   * registra con esto, no con `onMessage`.
   */
  private handle(type: MessageTypeName, handler: (client: Client, message: unknown) => void) {
    this.onMessage(type, (client, message: unknown) => {
      if (this.allowMessage(client, type)) handler(client, message);
    });
  }

  /** ¿Se procesa? Si el cliente abusa de forma sostenida, se lo desconecta (`RATE_LIMIT_CODE`). */
  private allowMessage(client: Client, type: string): boolean {
    const decision = this.rateLimiter.check(client.sessionId, type, Date.now());
    if (decision === "ok") return true;
    if (decision === "kick") {
      const name = this.state.players.get(client.sessionId)?.name ?? "?";
      console.warn(
        `[RateLimit] ${this.label}: se desconectó a ${client.sessionId} (${name}) por spam (${this.rateLimiter.droppedBy(client.sessionId)} mensajes descartados, el último "${type}")`,
      );
      this.rateLimiter.forget(client.sessionId);
      client.leave(RATE_LIMIT_CODE);
    }
    return false;
  }

  /** Para `/health`. */
  stats(): RoomStats {
    return {
      roomId: this.roomId,
      cityId: this.map.city.id,
      copy: this.state.copy,
      players: this.state.players.size,
      weevils: this.weevils.size,
      rateLimited: this.rateLimiter.droppedTotal,
      kicked: this.rateLimiter.kickedTotal,
    };
  }

  private handleMove(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isMoveMessage(message)) return;
    if (!this.map.isWalkable(message.x, message.y)) return;
    if (!this.needs.get(client.sessionId)?.hasEnergy(WALK_ENERGY_COST)) return this.notifyExhausted(client);
    // Cualquier otra acción recoge la línea (o deja de vender).
    this.stopActivities(client.sessionId);

    // El recorrido que propone el cliente (el que ya está mostrando), si arranca desde acá y es
    // válido paso a paso; si no, el camino más corto. Igual se avanza un tile por tick: no da ventaja.
    const from = { x: player.x, y: player.y };
    const target = { x: message.x, y: message.y };
    const route = message.path ? this.map.followRoute(from, message.path.slice(0, MAX_ROUTE_LENGTH)) : null;
    let path = route ?? this.map.findPath(from, target);
    // Si el recorrido no llega al destino (se cortó o se invalidó a mitad), el resto lo completa el server.
    const end = path[path.length - 1] ?? from;
    if (route && (end.x !== target.x || end.y !== target.y)) path = [...path, ...this.map.findPath(end, target)];
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
    this.stopActivities(client.sessionId);
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

    this.stopActivities(client.sessionId);
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

  /**
   * Comprar `quantity` unidades (1 si no viene): hay que estar al lado, que la tienda lo venda,
   * alcanzar la plata y tener lugar. Compra las que alcancen y entren (las herramientas van de a
   * una por casillero) y responde un solo resultado con lo que se compró de verdad.
   */
  private handleShopBuy(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade) return;
    const { shop, item, wallet, inventory, quantity } = trade;

    if (!shop.stock.includes(item.id)) return this.shopResult(client, false, `${shop.name} no vende ${item.name}.`);
    const price = buyPrice(item);
    if (!wallet.canAfford(price)) return this.shopResult(client, false, `No te alcanza: ${item.name} cuesta ${formatMoney(price)}.`);
    if (!inventory.canAdd(item.id)) return this.shopResult(client, false, "No tenés lugar en la mochila.");

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
    this.sendWallet(client);
    this.sendInventory(client);
    const total = formatMoney(price * bought);
    const what = bought > 1 ? `${bought} × ${item.name}` : item.name;
    const text = stop
      ? `Compraste ${bought} de ${quantity} × ${item.name} por ${total}: ${stop}.`
      : `Compraste ${what} por ${total}.`;
    this.shopResult(client, true, text, { action: "buy", itemId: item.id, quantity: bought });
  }

  /**
   * Vender `quantity` unidades de la mochila (lo puesto no se vende: primero hay que sacárselo). Las
   * herramientas gastadas valen menos: se venden de la más usada a la menos.
   */
  private handleShopSell(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade) return;
    const { shop, item, wallet, inventory, quantity } = trade;

    if (!shop.buys.includes(item.category)) {
      return this.shopResult(client, false, `En ${shop.name} no compran ${ITEM_CATEGORIES[item.category].label}.`);
    }
    if (inventory.count(item.id) === 0) return this.shopResult(client, false, `No tenés ${item.name} en la mochila.`);

    let sold = 0;
    let earned = 0;
    let stop = "";
    while (sold < quantity) {
      if (inventory.count(item.id) === 0) {
        stop = "no tenías más";
        break;
      }
      // Una herramienta gastada vale menos: se vende la más usada (la que sale primero).
      const price = sellPrice(item, inventory.nextUses(item.id)[0]);
      if (!wallet.credit(price)) {
        stop = "no podés tener más plata";
        break;
      }
      inventory.remove(item.id);
      sold += 1;
      earned += price;
    }
    if (sold === 0) return this.shopResult(client, false, "No podés tener más plata.");
    this.sendWallet(client);
    this.sendInventory(client);
    const what = sold > 1 ? `${sold} × ${item.name}` : item.name;
    const text = stop
      ? `Vendiste ${sold} de ${quantity} × ${item.name} por ${formatMoney(earned)}: ${stop}.`
      : `Vendiste ${what} por ${formatMoney(earned)}.`;
    this.shopResult(client, true, text, { action: "sell", itemId: item.id, quantity: sold });
  }

  /**
   * Vender regateando, todo o nada: con probabilidad `haggleChance` la tienda paga lo pedido; si no,
   * el ítem se pierde igual y no se cobra nada. Mismas reglas que vender (lo puesto no se vende).
   */
  private handleShopHaggle(client: Client, message: unknown) {
    const trade = this.validateTrade(client, message);
    if (!trade || !isShopHaggleMessage(message)) return;
    const { shop, item, wallet, inventory } = trade;
    const base = sellPrice(item, inventory.nextUses(item.id)[0]);

    if (!shop.buys.includes(item.category)) {
      return this.shopResult(client, false, `En ${shop.name} no compran ${ITEM_CATEGORIES[item.category].label}.`);
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

  /**
   * Comprar el carrito entero (todo o nada): hay que estar al lado, que la tienda venda todo, que
   * alcance la plata para el total y que todo entre en la mochila (se prueba con una copia). Si
   * algo falla no se compra nada y se dice por qué; si no, se cobra una vez y responde un solo resultado.
   */
  private handleShopCheckout(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const wallet = this.wallets.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !wallet || !inventory || !isShopCheckoutMessage(message)) return;
    const shop = this.map.getShop(message.shopId);
    if (!shop) return;
    if (!this.map.isNearShop(shop, player.x, player.y)) return this.shopResult(client, false, `Acercate a ${shop.name} para comprar.`);

    // Mismo ítem en dos líneas: se suman.
    const lines = new Map<string, number>();
    for (const { itemId, quantity } of message.items) lines.set(itemId, (lines.get(itemId) ?? 0) + quantity);
    const cart: Array<{ item: ItemDefinition; quantity: number }> = [];
    for (const [itemId, quantity] of lines) {
      const item = getItem(itemId);
      if (!item || !shop.stock.includes(item.id)) return this.shopResult(client, false, `${shop.name} no vende eso.`);
      if (quantity > SHOP_MAX_QUANTITY) return this.shopResult(client, false, `Como mucho ${SHOP_MAX_QUANTITY} de cada cosa.`);
      cart.push({ item, quantity });
    }
    if (cart.length === 0) return;

    const total = cart.reduce((sum, { item, quantity }) => sum + buyPrice(item) * quantity, 0);
    if (!wallet.canAfford(total)) {
      return this.shopResult(client, false, `No te alcanza: el carrito sale ${formatMoney(total)} y tenés ${formatMoney(wallet.balance)}.`);
    }
    const trial = inventory.clone();
    for (const { item, quantity } of cart) {
      for (let i = 0; i < quantity; i++) {
        if (!trial.add(item.id)) return this.shopResult(client, false, "No te entra todo en la mochila: sacá algo del carrito o hacé lugar.");
      }
    }

    wallet.debit(total);
    for (const { item, quantity } of cart) for (let i = 0; i < quantity; i++) inventory.add(item.id);
    this.sendWallet(client);
    this.sendInventory(client);
    const list = cart.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)).join(", ");
    this.shopResult(client, true, `Compraste ${list} por ${formatMoney(total)}.`, {
      action: "buy",
      itemId: cart.length === 1 ? cart[0].item.id : undefined,
      quantity: cart.length === 1 ? cart[0].quantity : undefined,
      bought: cart.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
    });
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
    return { shop, item, wallet, inventory, quantity: message.quantity ?? 1 };
  }

  /** `detail`: en compras y ventas, qué ítem y cuántas unidades (el panel resalta esa fila). */
  private shopResult(client: Client, ok: boolean, text: string, detail?: Pick<ShopResultMessage, "action" | "itemId" | "quantity" | "bought">) {
    const message: ShopResultMessage = { ok, text, ...detail };
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
  /** Las necesidades privadas (hambre) sólo al dueño, como la plata. */
  private sendNeeds(client: Client) {
    const needs = this.needs.get(client.sessionId);
    if (!needs) return;
    const message: NeedsMessage = { hunger: needs.hunger, health: needs.health };
    this.sentNeeds.set(client.sessionId, message);
    client.send(MessageType.Needs, message);
  }

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
   * Reordenar la mochila. Con un intercambio abierto no (la oferta se arma con lo que hay; mover no
   * la cambia, pero así la mochila no se mueve mientras el otro la mira).
   */
  private handleInventoryMove(client: Client, message: unknown) {
    const inventory = this.inventories.get(client.sessionId);
    if (!inventory || !isInventoryMoveMessage(message)) return;
    if (this.trades.get(client.sessionId)) return this.sendInventory(client);
    inventory.move(message.from, message.to);
    // Siempre se reenvía: si no cambió nada, el cliente vuelve a dibujar lo que hay de verdad.
    this.sendInventory(client);
  }

  /** La veterinaria donde está parado el jugador (pegado a ella), o null con el aviso de por qué no. */
  private petShop(client: Client, shopId: unknown): { player: Player; shop: Shop } | null {
    const player = this.state.players.get(client.sessionId);
    const shop = typeof shopId === "string" ? this.map.city.shops.find((candidate) => candidate.id === shopId) : undefined;
    if (!player || !shop?.pets) return null;
    if (!this.map.isNearShop(shop, player.x, player.y)) {
      this.shopResult(client, false, `Acercate a ${shop.name}.`);
      return null;
    }
    return { player, shop };
  }

  /** Adoptar: una mascota por jugador, se paga y queda con el nombre elegido (la ven todos). */
  private handlePetAdopt(client: Client, message: unknown) {
    if (!isPetAdoptMessage(message)) return;
    const context = this.petShop(client, message.shopId);
    if (!context) return;
    const { player, shop } = context;
    const pet = shop.pets?.includes(message.petId) ? getPet(message.petId) : undefined;
    const name = sanitizePetName(message.name);
    if (!pet) return;
    if (!name) return this.shopResult(client, false, "Ponele un nombre a tu mascota.");
    if (player.pet) return this.shopResult(client, false, `Ya tenés a ${player.petName}: una mascota por persona.`);
    if (!this.wallets.get(client.sessionId)?.debit(pet.price)) {
      return this.shopResult(client, false, `No te alcanza: adoptar un ${pet.name.toLowerCase()} cuesta ${formatMoney(pet.price)}.`);
    }
    player.pet = pet.id;
    player.petName = name;
    this.sendWallet(client);
    this.savePlayer(client.sessionId);
    this.shopResult(client, true, `🐾 ¡Adoptaste a ${name}! Te va a seguir a todos lados.`);
    this.broadcastSystem(`🐾 ${player.name} adoptó a ${name} (${pet.name.toLowerCase()})`);
  }

  private handlePetRename(client: Client, message: unknown) {
    if (!isPetRenameMessage(message)) return;
    const context = this.petShop(client, message.shopId);
    if (!context) return;
    const { player } = context;
    const name = sanitizePetName(message.name);
    if (!player.pet || !name) return;
    const previous = player.petName;
    player.petName = name;
    this.savePlayer(client.sessionId);
    this.shopResult(client, true, `${previous} ahora se llama ${name}.`);
  }

  /** Despedirse de la mascota: se queda en la veterinaria (no se devuelve la plata). */
  private handlePetRelease(client: Client, message: unknown) {
    const shopId = typeof message === "object" && message !== null ? (message as Record<string, unknown>).shopId : undefined;
    const context = this.petShop(client, shopId);
    if (!context?.player.pet) return;
    const { player } = context;
    const name = player.petName;
    player.pet = "";
    player.petName = "";
    this.savePlayer(client.sessionId);
    this.shopResult(client, true, `Te despediste de ${name}. En la veterinaria lo van a cuidar bien.`);
  }

  /**
   * Burlarse de un preso (sólo las visitas del COMCAR, que están libres): sale en el chat como si lo
   * hubiera escrito, con el mismo cooldown que el saludo.
   */
  private handleTaunt(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const target = isTargetPlayerMessage(message) ? this.state.players.get(message.targetId) : undefined;
    if (!player || !target || target === player || target.jailLeft === 0 || player.jailLeft > 0) return;

    const now = Date.now();
    if (now - (this.lastChatAt.get(client.sessionId) ?? 0) < CHAT_COOLDOWN_MS) return;
    this.lastChatAt.set(client.sessionId, now);
    const taunts = [
      `😜 ¡Ey, ${target.name}! Yo me tomo el bondi cuando quiero, ¿y vos?`,
      `🚌 ${target.name}, me voy a la rambla a tomar mate. Te mando una foto.`,
      `🔒 ¿Qué tal la vista desde ahí adentro, ${target.name}?`,
      `😂 ${target.name}, portate bien y capaz que te dejan salir al patio.`,
      `🌭 ${target.name}, ¿querés un pancho? Ah, no, no podés salir.`,
      `👋 Chau, ${target.name}, yo me voy. Vos quedate, ¿eh?`,
    ];
    this.broadcastChat({
      id: this.nextMessageId(),
      kind: "player",
      sessionId: client.sessionId,
      name: player.name,
      text: taunts[Math.floor(Math.random() * taunts.length)],
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
        mine: { offer: trade.offers.get(id)!, accepted: trade.accepted.has(id), uses: this.offerUses(id, trade.offers.get(id)!) },
        theirs: {
          offer: trade.offers.get(partnerId)!,
          accepted: trade.accepted.has(partnerId),
          uses: this.offerUses(partnerId, trade.offers.get(partnerId)!),
        },
      };
      client.send(MessageType.TradeState, message);
    }
  }

  /** Usos de cada herramienta ofrecida (las que se pasarían: las más gastadas primero). */
  private offerUses(sessionId: string, offer: TradeOffer): Record<string, number[]> {
    const inventory = this.inventories.get(sessionId);
    const uses: Record<string, number[]> = {};
    for (const { itemId, quantity } of offer.items) {
      const list = inventory?.nextUses(itemId, quantity) ?? [];
      if (list.length > 0) uses[itemId] = list;
    }
    return uses;
  }

  private closeTrade(client: Client, ok: boolean, text: string) {
    const message: TradeClosedMessage = { ok, text };
    client.send(MessageType.TradeClosed, message);
  }

  /**
   * Tirar la línea: hay que estar parado (sin camino pendiente) en la escollera, no estar pescando,
   * tener una caña en la mochila (se usa la de mayor nivel) y energía. El resultado se sortea ahora
   * con esa caña y se resuelve en `durationMs`; moverse antes lo cancela. La energía y el uso de la
   * caña se cobran recién al terminar (`finishAttempt`): si se corta, no se pierde nada.
   */
  private handleFishCast(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!player || !inventory || player.fishing || player.vending || this.paths.has(client.sessionId)) return;
    // Pescar gasta la caña: con un intercambio abierto cambiaría algo que quizás está ofrecido.
    if (this.trades.get(client.sessionId)) return this.fishResult(client, false, "Terminá el intercambio antes de pescar.");
    if (!this.map.canFishAt(player.x, player.y)) {
      return this.fishResult(client, false, "Para pescar tenés que estar parado en la Escollera Sarandí.");
    }
    const rod = bestRod(inventory.snapshot().map((stack) => stack.itemId));
    if (!rod) {
      return this.fishResult(client, false, "Necesitás una caña para pescar. Comprá una en Pesca Sarandí, la tienda frente a la escollera.");
    }

    if (!this.needs.get(client.sessionId)?.hasEnergy(FISH_ENERGY_COST)) {
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
      const finished = this.finishAttempt(client, rod, FISH_ENERGY_COST, FISH_HUNGER_COST, "En Pesca Sarandí, frente a la escollera, venden cañas nuevas.");
      if (finished) this.resolveCatch(client, player, fish);
      else this.fishResult(client, false, "Ya no tenés esa caña: la tirada no cuenta.");
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

  /** Comerse un pescado de la mochila: recupera `fishEnergy(dificultad)` de energía. */
  private handleFoodEat(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    const needs = this.needs.get(client.sessionId);
    if (!player || !inventory || !needs || !isFoodEatMessage(message)) return;
    const item = getItem(message.itemId);
    const value = edibleValue(item);
    if (!item || !value || inventory.count(item.id) === 0) return;
    if (!needs.canEat(value)) {
      return this.notice(client, item.category === "medicine" ? "Estás sano: guardalo para cuando lo necesites." : "Estás lleno: guardalo para después.");
    }

    inventory.remove(item.id);
    needs.eat(value);
    player.energy = needs.energy;
    this.sendInventory(client);
    this.sendNeeds(client);
    if (item.category === "medicine") return this.notice(client, `💊 Te tomaste ${item.name}: ${edibleLabel(value)}.`);
    const what = item.category === "fish" ? fishWithArticle(item) : item.name.toLowerCase();
    this.notice(client, `🍽️ Te comiste ${what}: ${edibleLabel(value)}.`);
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

  /**
   * Cobra una tirada / un intento que llegó al final: un uso de la herramienta (si se rompe, avisa
   * dónde comprar otra, `whereToBuy`) y la energía. Lo que se corta antes (moverse, salir…) no llega
   * acá y no cuesta nada. Devuelve false si la herramienta ya no está (se intercambió mientras tanto):
   * entonces no cuenta y tampoco se cobra.
   */
  private finishAttempt(client: Client, tool: ToolItem, energyCost: number, hungerCost: number, whereToBuy: string): boolean {
    const inventory = this.inventories.get(client.sessionId);
    const left = inventory?.wear(tool.id) ?? null;
    if (left === null) return false;
    this.needs.get(client.sessionId)?.drainEnergy(energyCost);
    this.needs.get(client.sessionId)?.drainHunger(hungerCost);
    this.sendInventory(client);
    if (left === 0) this.notice(client, `💥 Se rompió tu ${tool.name.toLowerCase()}: era su último uso. ${whereToBuy}`);
    return true;
  }

  /** Cortar lo que esté haciendo el jugador (pescar o vender): moverse, sentarse, ir a una tienda, salir. */
  private stopActivities(sessionId: string) {
    this.stopFishing(sessionId);
    this.stopVending(sessionId);
  }

  /**
   * Ofrecer la mercadería: hay que estar parado (sin camino pendiente) en la zona de venta, no estar
   * vendiendo ni pescando, tener un carrito en la mochila (se usa el de mayor nivel) y energía. La
   * venta se sortea ahora (con partido rinde más) y se resuelve en `durationMs`; moverse antes la
   * cancela. Como al pescar, energía y uso del carrito se cobran recién al terminar.
   */
  private handleVendStart(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    const zone = this.map.city.vending;
    if (!player || !inventory || player.vending || player.fishing || this.paths.has(client.sessionId)) return;
    // Vender gasta el carrito: con un intercambio abierto cambiaría algo que quizás está ofrecido.
    if (this.trades.get(client.sessionId)) return this.vendResult(client, false, "Terminá el intercambio antes de vender.");
    if (!zone || !this.map.canVendAt(player.x, player.y)) {
      return this.vendResult(client, false, "Para vender tenés que estar en la Explanada del Centenario, en Tres Cruces.");
    }
    const cart = bestCart(inventory.snapshot().map((stack) => stack.itemId));
    if (!cart) {
      return this.vendResult(client, false, "Necesitás un carrito para vender. Comprá uno en el Kiosco del Parque, al lado del estadio.");
    }
    if (!this.needs.get(client.sessionId)?.hasEnergy(VEND_ENERGY_COST)) {
      return this.vendResult(client, false, "Estás muy cansado para vender. Descansá un rato: sentarte en un banco ayuda.");
    }

    const match = gameClock.currentMatch();
    const sale = rollSale(cart, Boolean(match));
    player.sitting = false;
    player.vending = true;
    player.cart = cart.id;
    this.pendingSits.delete(client.sessionId);
    this.pendingShops.delete(client.sessionId);
    this.pendingPalms.delete(client.sessionId);
    const started: VendStartedMessage = { durationMs: sale.durationMs };
    client.send(MessageType.VendStarted, started);

    // El hincha sale a caminar un rato antes del resultado, así llega justo para comprar (o no).
    const customer = this.clock.setTimeout(() => {
      this.customerTimers.delete(client.sessionId);
      player.customer = CustomerState.Arriving;
    }, Math.max(0, sale.durationMs - CUSTOMER_LEAD_MS));
    this.customerTimers.set(client.sessionId, customer);

    const timer = this.clock.setTimeout(() => {
      this.vendingTimers.delete(client.sessionId);
      player.vending = false;
      player.cart = "";
      const finished = this.finishAttempt(client, cart, VEND_ENERGY_COST, VEND_HUNGER_COST, "En el Kiosco del Parque, al lado del estadio, venden carritos nuevos.");
      const sold = finished && this.resolveSale(client, player, cart.product, sale.earned, sale.giftId, Boolean(match));
      if (!finished) this.vendResult(client, false, "Ya no tenés ese carrito: el intento no cuenta.");
      player.customer = sold ? CustomerState.Bought : CustomerState.Passed;
    }, sale.durationMs);
    this.vendingTimers.set(client.sessionId, timer);
  }

  /**
   * Se cobra la venta y, si el hincha regaló algo y entra en la mochila, va ahí. Devuelve si el
   * hincha compró (para que todos lo vean comprar o seguir de largo).
   */
  private resolveSale(client: Client, player: Player, product: string, earned: number, giftId: string | undefined, match: boolean): boolean {
    if (earned === 0) {
      const misses = ["Un hincha miró, dudó y siguió de largo.", "Le preguntaste a uno y te dijo que hoy no.", "Pasó de largo: probá de nuevo."];
      this.vendResult(client, false, misses[Math.floor(Math.random() * misses.length)]);
      return false;
    }
    const wallet = this.wallets.get(client.sessionId);
    if (!wallet?.credit(earned)) {
      this.vendResult(client, false, "No podés tener más plata.");
      return false;
    }
    player.sales += 1;
    this.sendWallet(client);

    const gift = giftId ? getItem(giftId) : undefined;
    const kept = gift && this.inventories.get(client.sessionId)?.add(gift.id);
    if (kept) this.sendInventory(client);
    const extra = !gift
      ? ""
      : kept
        ? ` ¡Y de contento te regaló ${gift.name.toLowerCase()}!`
        : ` Te quería regalar ${gift.name.toLowerCase()}, pero no tenías lugar en la mochila.`;
    const bonus = match ? " (¡precio de partido!)" : "";
    this.vendResult(client, true, `Le vendiste ${product} a un hincha: +${formatMoney(earned)}${bonus}.${extra}`, earned, kept ? gift.id : undefined);
    if (kept) this.broadcastSystem(`🎁 Un hincha le regaló ${gift.name.toLowerCase()} a ${player.name} en el Centenario`);
    return true;
  }

  /** Dejar de vender (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
  private stopVending(sessionId: string) {
    this.vendingTimers.get(sessionId)?.clear();
    this.vendingTimers.delete(sessionId);
    this.customerTimers.get(sessionId)?.clear();
    this.customerTimers.delete(sessionId);
    const player = this.state.players.get(sessionId);
    if (player) {
      player.vending = false;
      player.cart = "";
      // Si el hincha estaba llegando, se va (si ya compró o pasó de largo, ya se está yendo).
      if (player.customer === CustomerState.Arriving) player.customer = CustomerState.None;
    }
  }

  private vendResult(client: Client, ok: boolean, text: string, earned = 0, giftId?: string) {
    const message: VendResultMessage = { ok, text, earned, giftId };
    client.send(MessageType.VendResult, message);
  }

  private fishResult(client: Client, ok: boolean, text: string, itemIds?: string[]) {
    const message: FishResultMessage = { ok, text, itemIds };
    client.send(MessageType.FishResult, message);
  }

  private syncClock() {
    const minute = Math.floor(gameClock.minuteOfDay());
    if (this.state.minuteOfDay !== minute) this.state.minuteOfDay = minute;
    const match = gameClock.currentMatch()?.name ?? "";
    if (this.state.match !== match) this.state.match = match;
    const mode = gameClock.getMatchMode();
    if (this.state.matchMode !== mode) this.state.matchMode = mode;
    this.announceMatch(match || null);
    this.updateJail();
  }

  /**
   * En el COMCAR, una vez por segundo: cuánto le queda a cada preso (`Player.jailLeft`, lo muestra
   * el cliente) y, al que cumplió (o liberó el admin), lo manda a Ciudad Vieja.
   */
  private updateJail() {
    if (this.map.city.id !== JAIL_CITY_ID) return;
    const now = Date.now();
    for (const [sessionId, player] of this.state.players) {
      const until = bans.until(this.playerKeys.get(sessionId) ?? null, player.name, now);
      const left = until ? Math.ceil((until - now) / 1000) : 0;
      if (left === player.jailLeft) continue;
      const wasJailed = player.jailLeft > 0;
      player.jailLeft = left;
      const client = this.clients.getById(sessionId);
      if (!wasJailed || left > 0 || !client) continue;
      this.notice(client, "🔓 ¡Quedaste libre! Te llevan a Ciudad Vieja. Portate bien, eh.");
      this.broadcastSystem(`🔓 ${player.name} cumplió su condena y salió del COMCAR`);
      const release: TravelMessage = { cityId: SPAWN_CITY_ID };
      client.send(MessageType.TravelApproved, release);
    }
  }

  private randomPrisonTile(): TilePoint | undefined {
    return this.prisonTiles[Math.floor(Math.random() * this.prisonTiles.length)];
  }

  /** ¿Está del lado de adentro de la cárcel? (camino posible hasta el patio). */
  private isInYard(player: Player): boolean {
    const yard = this.prisonTiles[0];
    if (!yard) return false;
    return (player.x === yard.x && player.y === yard.y) || this.map.findPath({ x: player.x, y: player.y }, yard).length > 0;
  }

  /**
   * Preso al COMCAR (`/ban`) hasta `until` (0 = liberarlo). Se anota por clave y por nombre. Si no
   * está en el COMCAR, el cliente viaja solo (`travel:ok`); si no lo hace en `JAIL_TRAVEL_GRACE_MS`,
   * se lo desconecta (al volver a entrar, el server lo manda al COMCAR). Liberarlo estando adentro
   * lo resuelve `updateJail` en el próximo segundo.
   */
  jail(sessionId: string, until: number) {
    const player = this.state.players.get(sessionId);
    const client = this.clients.getById(sessionId);
    if (!player || !client) return;
    bans.set(this.playerKeys.get(sessionId) ?? null, player.name, until);
    this.savePlayer(sessionId);
    if (this.map.city.id === JAIL_CITY_ID) {
      // Estaba de visita: lo meten adentro.
      const cell = until ? this.randomPrisonTile() : undefined;
      if (cell && !this.isInYard(player)) {
        this.teleport(sessionId, cell);
        this.broadcastSystem(`🚔 Se llevaron preso a ${player.name}: pasó de visita a estar adentro`);
      }
      this.updateJail();
      if (until) this.notice(client, `🚔 Cambió tu condena: te quedan ${formatJailLeft((until - Date.now()) / 1000)}.`);
      return;
    }
    if (!until) return;
    this.stopActivities(sessionId);
    this.cancelTrade(sessionId, "leave");
    this.notice(client, `🚔 ¡Quedaste preso! Te llevan al COMCAR por ${formatJailLeft((until - Date.now()) / 1000)}.`);
    this.broadcastSystem(`🚔 Se llevaron preso a ${player.name} al COMCAR`);
    const approved: TravelMessage = { cityId: JAIL_CITY_ID };
    client.send(MessageType.TravelApproved, approved);
    this.clock.setTimeout(() => {
      if (this.clients.getById(sessionId)) client.leave(JAILED_KICK_CODE);
    }, JAIL_TRAVEL_GRACE_MS);
  }

  /** En el barrio con zona de venta se avisa por el chat cuando empieza y termina un partido. */
  private announceMatch(match: string | null) {
    const zone = this.map.city.vending;
    if (!zone) return;
    if (match === this.currentMatch) return;
    if (match) {
      this.broadcastSystem(`⚽ ¡Arrancó ${match} en el Estadio Centenario! En la ${zone.name} se vende el doble.`);
    } else if (this.currentMatch) {
      this.broadcastSystem(`⚽ Terminó ${this.currentMatch}. Los hinchas se van del Centenario.`);
    }
    this.currentMatch = match;
  }

  /** Maker (sólo admin): los jugadores a `MAKER_RANGE` tiles o menos, del más cerca al más lejos. */
  private sendNearby(client: Client) {
    const admin = this.state.players.get(client.sessionId);
    if (!admin?.admin) return;
    const players: AdminNearbyMessage["players"] = [];
    for (const [sessionId, other] of this.state.players) {
      if (sessionId === client.sessionId) continue;
      const distance = Math.max(Math.abs(other.x - admin.x), Math.abs(other.y - admin.y));
      if (distance <= MAKER_RANGE) players.push({ sessionId, name: other.name, distance });
    }
    players.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "es"));
    const message: AdminNearbyMessage = { players };
    client.send(MessageType.AdminNearby, message);
  }

  /**
   * Maker (sólo admin): crea ítems del catálogo en la mochila propia o en la de un jugador cercano
   * (se vuelve a medir la distancia acá: la lista del cliente puede estar vieja). Las herramientas
   * salen nuevas; lo que no entra en la mochila no se crea. Queda en el log del server.
   */
  private handleAdminGive(client: Client, message: unknown) {
    const admin = this.state.players.get(client.sessionId);
    if (!admin?.admin || !isAdminGiveMessage(message)) return;
    const item = getItem(message.itemId);
    if (!item) return;

    const targetId = message.targetId ?? client.sessionId;
    const target = this.state.players.get(targetId);
    const targetClient = this.clients.getById(targetId);
    const inventory = this.inventories.get(targetId);
    if (!target || !targetClient || !inventory) return this.notice(client, "Ese jugador ya no está en el barrio.");
    if (Math.max(Math.abs(target.x - admin.x), Math.abs(target.y - admin.y)) > MAKER_RANGE) {
      this.sendNearby(client);
      return this.notice(client, `${target.name} se alejó: tiene que estar a ${MAKER_RANGE} tiles o menos.`);
    }

    let made = 0;
    while (made < message.quantity && inventory.add(item.id)) made += 1;
    if (made === 0) {
      return this.notice(client, targetId === client.sessionId ? "No tenés lugar en la mochila." : `${target.name} no tiene lugar en la mochila.`);
    }
    this.sendInventory(targetClient);
    console.log(`[Maker] ${admin.name} creó ${made} × ${item.id} para ${target.name}`);

    const what = `${made} × ${item.name}`;
    const full = made < message.quantity ? ` (${message.quantity - made} no entraron: mochila llena)` : "";
    if (targetId === client.sessionId) return this.notice(client, `🛠️ Creaste ${what}${full}.`);
    this.notice(client, `🛠️ Le creaste ${what} a ${target.name}${full}.`);
    this.notice(targetClient, `🎁 ${admin.name} te dio ${what}.`);
  }

  /** Sólo un admin puede mover el reloj del juego; desde ahí sigue solo y lo ven todos (Schema). */
  private handleAdminSetTime(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.admin || !isAdminSetTimeMessage(message)) return;
    gameClock.set(message.minuteOfDay);
    this.syncClock();
    this.broadcastSystem(`🕒 ${player.name} movió el reloj a las ${formatClock(message.minuteOfDay)}`);
  }

  /**
   * Forzar el partido (admin), para todos los barrios como el reloj. Cada sala lo copia al Schema en
   * su `syncClock` (a más tardar en un segundo); ésta, en el acto.
   */
  private handleAdminMatch(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.admin || !isAdminMatchMessage(message)) return;
    if (!gameClock.forceMatch(message.mode, message.name)) return;
    const text =
      message.mode === "on"
        ? `forzó el partido ${message.name}`
        : message.mode === "off"
          ? "suspendió los partidos"
          : "dejó los partidos según el horario";
    this.broadcastSystem(`⚽ ${player.name} ${text}`);
    this.syncClock();
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
    findOnline: (name) => playerDirectory.find(name),
    sendPrivate: (client, player, to, text) => {
      const message: ChatBroadcastMessage = {
        id: this.nextMessageId(),
        kind: "private",
        sessionId: client.sessionId,
        name: player.name,
        text,
        timestamp: Date.now(),
      };
      to.mailbox.deliverPrivate(to.sessionId, message);
      // Copia para quien lo mandó, con el destinatario (otro id: puede estar en el mismo barrio).
      client.send(MessageType.Chat, { ...message, id: this.nextMessageId(), to: to.name } satisfies ChatBroadcastMessage);
    },
    setDonor: (client, donor) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return false;
      player.donor = donor;
      this.savePlayer(client.sessionId);
      return this.playerKeys.has(client.sessionId);
    },
    giveMoney: (client, amount) => {
      if (!this.wallets.get(client.sessionId)?.credit(amount)) return false;
      this.sendWallet(client);
      return true;
    },
    healFully: (client) => {
      const needs = this.needs.get(client.sessionId);
      const player = this.state.players.get(client.sessionId);
      if (!needs || !player) return;
      needs.fill();
      player.energy = needs.energy;
      this.sendNeeds(client);
    },
    jail: (target, name, until) => {
      if (target) return target.mailbox.jail(target.sessionId, until);
      bans.set(null, name, until);
      for (const key of playerStore.keysByName(name)) {
        bans.set(key, name, until);
        playerStore.setJailedUntil(key, until);
      }
    },
    traceTo: (client, to) => {
      if (to.mailbox.roomId === this.roomId) {
        const tile = this.tileNear(to.sessionId, client.sessionId);
        if (!tile) return this.notice(client, `No hay lugar libre al lado de ${to.name}.`);
        this.teleport(client.sessionId, tile);
        return this.notice(client, `📍 Fuiste hasta ${to.name}.`);
      }
      const key = this.playerKeys.get(client.sessionId);
      if (!key) return this.notice(client, "Para ir a otro barrio, tu navegador tiene que permitir guardar datos del sitio.");
      this.savePlayer(client.sessionId);
      issueTravelTicket(key, to.cityId, Date.now() + TRAVEL_TICKET_MS, Date.now(), { near: to.sessionId });
      const approved: TravelMessage = { cityId: to.cityId, roomId: to.mailbox.roomId };
      client.send(MessageType.TravelApproved, approved);
      this.notice(client, `📍 Yendo hasta ${to.name} (${to.cityName}).`);
    },
    // Anuncio para todos los barrios: se publica en presence y cada sala lo reenvía.
    announce: (name, text) => {
      const announcement: AnnouncementMessage = { id: `${Date.now()}-${this.nextMessageId()}`, name, text };
      this.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
      console.log(`[Anuncio] ${name}: ${text}`);
    },
  };

  /**
   * Viajar: el barrio existe y no es éste, hay clave (sin clave no se guarda la mochila y no se
   * podría llevar al otro barrio) y un boleto STM en la mochila (`TICKET_ID`, se compra en la Agencia
   * STM). Se gasta el boleto, se guarda el progreso y se emite el pase; el cliente sale y entra al
   * destino.
   */
  private handleTravelRequest(client: Client, message: unknown) {
    const key = this.playerKeys.get(client.sessionId);
    const inventory = this.inventories.get(client.sessionId);
    if (!inventory || !isTravelMessage(message)) return;
    const destination = getCity(message.cityId);
    if (!destination || destination.id === this.map.city.id) return;
    const player = this.state.players.get(client.sessionId);
    const jailedUntil = player ? bans.until(key ?? null, player.name) : 0;
    if (jailedUntil) {
      return this.notice(client, `🚔 Estás preso: no podés ir a ningún lado. Te quedan ${formatJailLeft((jailedUntil - Date.now()) / 1000)}.`);
    }
    if (!key) return this.notice(client, "Para viajar, tu navegador tiene que permitir guardar datos del sitio.");
    if (!inventory.remove(TICKET_ID)) {
      return this.notice(client, `🚌 Necesitás un boleto STM para viajar. Se compran en ${whereToBuy(TICKET_ID)}.`);
    }
    this.sendInventory(client);
    this.savePlayer(client.sessionId);
    issueTravelTicket(key, destination.id, Date.now() + TRAVEL_TICKET_MS);
    const approved: TravelMessage = { cityId: destination.id };
    client.send(MessageType.TravelApproved, approved);
  }

  /** Clic en una palmera: si está al lado la sacude; si no, camina hasta ella y la sacude al llegar. */
  private handlePalmShake(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !isTileMessage(message) || !this.map.isPalm(message.x, message.y)) return;
    const palm = { x: message.x, y: message.y };
    this.stopActivities(client.sessionId);
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

  /** Mensaje privado (`/mensaje`) para un jugador de esta sala: sólo a él. */
  tileOf(sessionId: string): TilePoint | undefined {
    const player = this.state.players.get(sessionId);
    return player ? { x: player.x, y: player.y } : undefined;
  }

  /**
   * Tile caminable pegado al jugador `sessionId` (para `/trace`), el más cercano a `from` (otro
   * jugador de la sala) si viene. Si no hay ninguno libre, su propio tile si es caminable.
   */
  private tileNear(sessionId: string, from?: string): TilePoint | undefined {
    const target = this.tileOf(sessionId);
    if (!target) return undefined;
    const origin = (from ? this.tileOf(from) : undefined) ?? target;
    return this.map.approachTile(target, origin) ?? (this.map.isWalkable(target.x, target.y) ? target : undefined);
  }

  /** Lleva al jugador a `tile` de golpe: corta lo que estaba haciendo (caminar, sentarse, pescar…). */
  private teleport(sessionId: string, tile: TilePoint) {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    this.stopActivities(sessionId);
    this.paths.delete(sessionId);
    this.pendingSits.delete(sessionId);
    this.pendingShops.delete(sessionId);
    this.pendingPalms.delete(sessionId);
    player.sitting = false;
    player.x = tile.x;
    player.y = tile.y;
  }

  deliverPrivate(sessionId: string, message: ChatBroadcastMessage) {
    this.clients.getById(sessionId)?.send(MessageType.Chat, message);
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
      const needs = this.needs.get(sessionId);
      if (!needs?.spendEnergy(WALK_ENERGY_COST)) {
        this.paths.delete(sessionId);
        this.pendingSits.delete(sessionId);
        this.pendingShops.delete(sessionId);
        this.pendingPalms.delete(sessionId);
        const client = this.clients.getById(sessionId);
        if (client) this.notifyExhausted(client);
        continue;
      }
      needs.drainHunger(WALK_HUNGER_COST);
      const next = path.shift()!;
      player.x = next.x;
      player.y = next.y;
      if (path.length === 0) this.paths.delete(sessionId);
    }

    this.tickNeeds();
  }

  /**
   * Cada tick: baja el hambre (salvo preso) y, quieto (sin pescar ni vender), se recupera energía,
   * más rápido sentado y más lento con hambre (ver `Needs.tick`). La energía va al Schema; el hambre
   * al dueño si cambió, con un aviso al pasar a "tenés hambre" o "muerto de hambre".
   */
  private tickNeeds() {
    const seconds = STEP_MS / 1000;
    for (const [sessionId, player] of this.state.players) {
      const needs = this.needs.get(sessionId);
      if (!needs) continue;
      needs.tick(seconds, {
        resting: !this.paths.has(sessionId) && !player.fishing && !player.vending,
        sitting: player.sitting,
        jailed: player.jailLeft > 0,
      });
      if (player.energy !== needs.energy) player.energy = needs.energy;

      const client = this.clients.getById(sessionId);
      if (!client) continue;
      if (needs.fainted) {
        this.faint(client, player, needs);
        continue;
      }
      const sent = this.sentNeeds.get(sessionId);
      if (sent?.hunger === needs.hunger && sent.health === needs.health) continue;
      this.sendNeeds(client);
      if (sent) this.noticeNeedsChange(client, sent, needs);
    }
  }

  /** Avisos al cruzar un umbral para abajo: hambre, muerto de hambre, sin comida (daña) y débil. */
  private noticeNeedsChange(client: Client, before: NeedsMessage, needs: Needs) {
    const hungerBefore = hungerLevel(before.hunger);
    const hungerNow = hungerLevel(needs.hunger);
    if (hungerNow !== hungerBefore && hungerNow !== "full" && hungerBefore !== "starving") {
      this.notice(
        client,
        hungerNow === "hungry"
          ? "🍖 Tenés hambre: comé algo. Con hambre, descansar rinde la mitad."
          : "🍖 Estás muerto de hambre: descansar casi no rinde. ¡Comé algo ya!",
      );
    }
    if (before.hunger > 0 && needs.hunger === 0 && this.state.players.get(client.sessionId)?.jailLeft === 0) {
      this.notice(client, "❤ Sin nada en la panza, empezás a perder salud. ¡Comé algo!");
    }
    if (before.health >= LOW_HEALTH && needs.health < LOW_HEALTH) {
      this.notice(
        client,
        `❤ Estás débil: la energía no te pasa de ${WEAK_ENERGY_CAP}. Comé bien y descansá, o andá a la guardia del Sanatorio Americano (Tres Cruces).`,
      );
    }
  }

  /**
   * Desmayo (salud en 0): se corta todo, la ambulancia cobra (`faintFee`) y te despertás con poca
   * salud (`Needs.revive`). Preso, en el patio del penal; en Tres Cruces, en la puerta del
   * sanatorio; en otro barrio, la ambulancia te lleva gratis (pase de viaje a la puerta) y, sin
   * clave (no se puede viajar), te despertás en la plaza del barrio. Nunca se pierden ítems.
   */
  private faint(client: Client, player: Player, needs: Needs) {
    const sessionId = client.sessionId;
    this.stopActivities(sessionId);
    this.cancelTrade(sessionId, "leave");
    needs.revive();
    player.energy = needs.energy;
    const wallet = this.wallets.get(sessionId);
    const fee = wallet ? faintFee(wallet.balance) : 0;
    if (fee > 0) wallet?.debit(fee);
    this.sendWallet(client);
    this.sendNeeds(client);
    const paid = fee > 0 ? `La ambulancia te cobró ${formatMoney(fee)}.` : "La ambulancia no te cobró nada.";
    this.broadcastSystem(`🚑 ${player.name} se desmayó y se lo llevó la ambulancia`, client);

    const door = hospitalDoor();
    const key = this.playerKeys.get(sessionId);
    const jailed = player.jailLeft > 0 && this.map.city.id === JAIL_CITY_ID;
    let wakeUp: TilePoint | undefined;
    let text: string;
    if (jailed) {
      wakeUp = this.randomPrisonTile();
      text = `Te desmayaste… Te despertaste en la enfermería del penal. ${paid}`;
    } else if (this.map.city.id === HOSPITAL_CITY_ID && door) {
      wakeUp = door;
      text = `Te desmayaste… Te despertaste en la guardia del Sanatorio Americano. ${paid}`;
    } else if (key && door) {
      this.savePlayer(sessionId);
      issueTravelTicket(key, HOSPITAL_CITY_ID, Date.now() + TRAVEL_TICKET_MS, Date.now(), { at: door });
      const faintMessage: FaintMessage = { text: `Te desmayaste… La ambulancia te lleva al Sanatorio Americano. ${paid}` };
      client.send(MessageType.Faint, faintMessage);
      const ambulance: TravelMessage = { cityId: HOSPITAL_CITY_ID, ambulance: true };
      client.send(MessageType.TravelApproved, ambulance);
      return;
    } else {
      wakeUp = this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
      text = `Te desmayaste… Te despertaste en la plaza. ${paid}`;
    }
    if (wakeUp) this.teleport(sessionId, wakeUp);
    const faintMessage: FaintMessage = { text };
    client.send(MessageType.Faint, faintMessage);
  }

  /** Guardia del sanatorio: pagar la consulta (`hospitalPrice`) y quedar con la salud en 100. */
  private handleHospitalHeal(client: Client, message: unknown) {
    const shopId = typeof message === "object" && message !== null ? (message as Record<string, unknown>).shopId : undefined;
    const player = this.state.players.get(client.sessionId);
    const shop = typeof shopId === "string" ? this.map.city.shops.find((candidate) => candidate.id === shopId) : undefined;
    const needs = this.needs.get(client.sessionId);
    const wallet = this.wallets.get(client.sessionId);
    if (!player || !shop?.hospital || !needs || !wallet) return;
    if (!this.map.isNearShop(shop, player.x, player.y)) return this.shopResult(client, false, `Acercate a ${shop.name}.`);
    if (needs.health >= MAX_HEALTH) return this.shopResult(client, false, "Estás sano: no hace falta la consulta.");
    const price = hospitalPrice(needs.health);
    if (!wallet.debit(price)) return this.shopResult(client, false, `La consulta sale ${formatMoney(price)} y no te alcanza.`);
    needs.heal(MAX_HEALTH);
    this.sendWallet(client);
    this.sendNeeds(client);
    this.shopResult(client, true, `❤ Te atendieron en la guardia: salud al 100 por ${formatMoney(price)}.`);
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

/** Un tile (x, y enteros) y, si viene, un recorrido de tiles (se valida paso a paso en `followRoute`). */
function isMoveMessage(message: unknown): message is MoveMessage {
  if (!isTileMessage(message)) return false;
  const { path } = message as unknown as Record<string, unknown>;
  return path === undefined || (Array.isArray(path) && path.length <= MAX_ROUTE_LENGTH * 2 && path.every(isTileMessage));
}

function isTravelMessage(message: unknown): message is TravelMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).cityId === "string";
}

function isWeevilKickMessage(message: unknown): message is WeevilKickMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).id === "string";
}

/** Tile caminable pegado a la guardia del sanatorio, donde te deja la ambulancia (el mismo para todos). */
function hospitalDoor(): TilePoint | undefined {
  const map = getCityMap(HOSPITAL_CITY_ID);
  const shop = map?.city.shops.find((candidate) => candidate.id === HOSPITAL_SHOP_ID);
  if (!map || !shop) return undefined;
  // Del lado de la calle (sur-este del edificio), que es por donde se ve la entrada.
  return map.shopApproach(shop, { x: shop.area.x + shop.area.width, y: shop.area.y + shop.area.height + 1 });
}

function isFoodEatMessage(message: unknown): message is FoodEatMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).itemId === "string";
}

function isBoxOpenMessage(message: unknown): message is BoxOpenMessage {
  return typeof message === "object" && message !== null && typeof (message as Record<string, unknown>).itemId === "string";
}

function isAdminGiveMessage(message: unknown): message is AdminGiveMessage {
  if (typeof message !== "object" || message === null) return false;
  const { itemId, quantity, targetId } = message as Record<string, unknown>;
  return (
    typeof itemId === "string" &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= MAKER_MAX_QUANTITY &&
    (targetId === undefined || typeof targetId === "string")
  );
}

function isShopCheckoutMessage(message: unknown): message is ShopCheckoutMessage {
  if (typeof message !== "object" || message === null) return false;
  const { shopId, items } = message as Record<string, unknown>;
  return (
    typeof shopId === "string" &&
    Array.isArray(items) &&
    items.length <= 50 &&
    items.every((line: unknown) => {
      if (typeof line !== "object" || line === null) return false;
      const { itemId, quantity } = line as Record<string, unknown>;
      return typeof itemId === "string" && Number.isInteger(quantity) && (quantity as number) >= 1;
    })
  );
}

function isPetAdoptMessage(message: unknown): message is PetAdoptMessage {
  if (typeof message !== "object" || message === null) return false;
  const { shopId, petId, name } = message as Record<string, unknown>;
  return typeof shopId === "string" && typeof petId === "string" && typeof name === "string";
}

function isPetRenameMessage(message: unknown): message is PetRenameMessage {
  if (typeof message !== "object" || message === null) return false;
  const { shopId, name } = message as Record<string, unknown>;
  return typeof shopId === "string" && typeof name === "string";
}

function isInventoryMoveMessage(message: unknown): message is InventoryMoveMessage {
  if (typeof message !== "object" || message === null) return false;
  const { from, to } = message as Record<string, unknown>;
  return Number.isInteger(from) && Number.isInteger(to);
}

function isAdminMatchMessage(message: unknown): message is AdminMatchMessage {
  if (typeof message !== "object" || message === null) return false;
  const { mode, name } = message as Record<string, unknown>;
  return (MATCH_MODES as readonly unknown[]).includes(mode) && (name === undefined || typeof name === "string");
}

function isAdminSetTimeMessage(message: unknown): message is AdminSetTimeMessage {
  return typeof message === "object" && message !== null && isValidMinuteOfDay((message as Record<string, unknown>).minuteOfDay);
}

function isShopHaggleMessage(message: unknown): message is ShopHaggleMessage {
  return isShopTradeMessage(message) && typeof (message as unknown as Record<string, unknown>).price === "number";
}

function isShopTradeMessage(message: unknown): message is ShopTradeMessage {
  if (typeof message !== "object" || message === null) return false;
  const { shopId, itemId, quantity } = message as Record<string, unknown>;
  const validQuantity =
    quantity === undefined || (Number.isInteger(quantity) && (quantity as number) >= 1 && (quantity as number) <= SHOP_MAX_QUANTITY);
  return typeof shopId === "string" && typeof itemId === "string" && validQuantity;
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
