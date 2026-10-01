import { Client, Room } from "colyseus.js";
import {
  Appearance,
  BoxOpenMessage,
  BoxOpenedMessage,
  TravelMessage,
  FishEatMessage,
  ChatBroadcastMessage,
  EquipMessage,
  FishResultMessage,
  FishStartedMessage,
  InventoryMessage,
  AdminSetTimeMessage,
  AnnouncementMessage,
  ItemSlot,
  NoticeMessage,
  JoinOptions,
  MessageType,
  ROOM_NAME,
  SPAWN_CITY_ID,
  ShopOpenMessage,
  ShopResultMessage,
  ShopHaggleMessage,
  ShopTradeMessage,
  TargetPlayerMessage,
  TradeClosedMessage,
  TradeInviteMessage,
  TradeOffer,
  TradeRespondMessage,
  TradeStateMessage,
  WalletMessage,
} from "@montevideo-world/shared";
import type { GameState } from "@montevideo-world/shared/schema";
import { eventBus } from "./eventBus";
import { getPlayerKey } from "./playerKey";

export type CityRoom = Room<GameState>;

/** Conexión activa: la sala y el barrio al que pertenece. */
export interface CitySession {
  room: CityRoom;
  cityId: string;
}

/** Next inlinea NEXT_PUBLIC_* en build: debe referenciarse de forma literal. */
const SERVER_URL_ENV = process.env.NEXT_PUBLIC_SERVER_URL;

/**
 * URL del servidor. Sin `NEXT_PUBLIC_SERVER_URL`, usa el mismo host que la página en el puerto
 * 2567: así entrar por `http://10.0.1.133:3000` desde otra compu de la red apunta a esa máquina.
 */
export function getServerUrl(): string {
  if (SERVER_URL_ENV) return SERVER_URL_ENV;
  if (typeof window === "undefined") return "ws://localhost:2567";
  return `ws://${window.location.hostname}:2567`;
}

let client: Client | null = null;

function getClient() {
  client ??= new Client(getServerUrl());
  return client;
}

/** Con qué nombre y aspecto se entró: al viajar a otro barrio se vuelve a entrar igual. */
let lastJoin: { name: string; appearance: Appearance } | null = null;

/** Entrar a un barrio con el aspecto elegido (al empezar, siempre al de spawn: Ciudad Vieja). */
export async function joinCity(name: string, appearance: Appearance, cityId: string = SPAWN_CITY_ID): Promise<CitySession> {
  lastJoin = { name, appearance };
  const options: JoinOptions = { name, cityId, appearance, playerKey: getPlayerKey() ?? undefined };
  const room = await getClient().joinOrCreate<GameState>(ROOM_NAME, options);
  return { room, cityId: options.cityId };
}

/** Pedir el boleto (`TRAVEL_FARE`) para viajar a `cityId`; si alcanza, llega `travel:approved`. */
export function sendTravelRequest(room: CityRoom, cityId: string) {
  const message: TravelMessage = { cityId };
  room.send(MessageType.TravelRequest, message);
}

/**
 * Viajar a otro barrio (con el boleto ya pagado): entrar a su sala con el mismo nombre, aspecto y clave. Hay que salir antes
 * de la sala actual (el server guarda la mochila al salir y la devuelve al entrar con la clave).
 */
export function travelTo(cityId: string): Promise<CitySession> {
  if (!lastJoin) return Promise.reject(new Error("Todavía no se entró al juego"));
  return joinCity(lastJoin.name, lastJoin.appearance, cityId);
}

/**
 * Único lugar donde se registran los mensajes de red (room.onMessage).
 * Se reemiten por el EventBus para que React y Phaser los consuman sin conocerse.
 * Devuelve una función para desregistrar (idempotente frente a StrictMode).
 */
export function bindRoomMessages(room: CityRoom): () => void {
  const unbindChat = room.onMessage(MessageType.Chat, (message: ChatBroadcastMessage) => {
    eventBus.emit("chat:message", message);
  });
  const unbindInventory = room.onMessage(MessageType.Inventory, (message: InventoryMessage) => {
    eventBus.emit("inventory:update", message);
  });
  const unbindWallet = room.onMessage(MessageType.Wallet, (message: WalletMessage) => {
    eventBus.emit("wallet:update", message);
  });
  const unbindShopOpen = room.onMessage(MessageType.ShopOpen, (message: ShopOpenMessage) => {
    eventBus.emit("shop:open", message);
  });
  const unbindShopResult = room.onMessage(MessageType.ShopResult, (message: ShopResultMessage) => {
    eventBus.emit("shop:result", message);
  });
  const unbindFishStarted = room.onMessage(MessageType.FishStarted, (message: FishStartedMessage) => {
    eventBus.emit("fishing:started", message);
  });
  const unbindFishResult = room.onMessage(MessageType.FishResult, (message: FishResultMessage) => {
    eventBus.emit("fishing:result", message);
  });
  const unbindNotice = room.onMessage(MessageType.Notice, (message: NoticeMessage) => {
    eventBus.emit("notice", message);
  });
  const unbindAnnouncement = room.onMessage(MessageType.Announcement, (message: AnnouncementMessage) => {
    eventBus.emit("announcement", message);
  });
  const unbindTravel = room.onMessage(MessageType.TravelApproved, (message: TravelMessage) => {
    eventBus.emit("travel:approved", message);
  });
  const unbindBoxOpened = room.onMessage(MessageType.BoxOpened, (message: BoxOpenedMessage) => {
    eventBus.emit("box:opened", message);
  });
  const unbindTradeInvite = room.onMessage(MessageType.TradeInvite, (message: TradeInviteMessage) => {
    eventBus.emit("trade:invite", message);
  });
  const unbindTradeState = room.onMessage(MessageType.TradeState, (message: TradeStateMessage) => {
    eventBus.emit("trade:state", message);
  });
  const unbindTradeClosed = room.onMessage(MessageType.TradeClosed, (message: TradeClosedMessage) => {
    eventBus.emit("trade:closed", message);
  });
  // Mochila y saldo se piden recién ahora: si el server los mandara en onJoin podrían llegar antes
  // de que existan los handlers y colyseus.js los descartaría.
  room.send(MessageType.RequestInventory);
  room.send(MessageType.RequestWallet);
  return () => {
    unbindChat();
    unbindInventory();
    unbindWallet();
    unbindShopOpen();
    unbindShopResult();
    unbindFishStarted();
    unbindFishResult();
    unbindNotice();
    unbindAnnouncement();
    unbindTravel();
    unbindBoxOpened();
    unbindTradeInvite();
    unbindTradeState();
    unbindTradeClosed();
  };
}

/** Pedir ponerse una prenda de la mochila (`itemId`) o guardar lo puesto en `slot` (`null`). */
export function sendEquip(room: CityRoom, slot: ItemSlot, itemId: string | null) {
  const message: EquipMessage = { slot, itemId };
  room.send(MessageType.Equip, message);
}

/** Comprar (`buy`) o vender (`sell`) una unidad de una prenda en una tienda. */
export function sendShopTrade(room: CityRoom, action: "buy" | "sell", shopId: string, itemId: string) {
  const message: ShopTradeMessage = { shopId, itemId };
  room.send(action === "buy" ? MessageType.ShopBuy : MessageType.ShopSell, message);
}

/** Vender regateando: pedir `price` por una unidad, todo o nada (ver `haggle.ts`). */
export function sendShopHaggle(room: CityRoom, shopId: string, itemId: string, price: number) {
  const message: ShopHaggleMessage = { shopId, itemId, price };
  room.send(MessageType.ShopHaggle, message);
}

/** Tirar la línea (`cast`) o recogerla (`stop`). */
export function sendFishing(room: CityRoom, action: "cast" | "stop") {
  room.send(action === "cast" ? MessageType.FishCast : MessageType.FishStop);
}

/** Comerse un pescado de la mochila (recupera energía). */
export function sendFishEat(room: CityRoom, itemId: string) {
  const message: FishEatMessage = { itemId };
  room.send(MessageType.FishEat, message);
}

/** Admin: mover el reloj del juego (el server ignora el pedido si no sos admin). */
export function sendAdminSetTime(room: CityRoom, minuteOfDay: number) {
  const message: AdminSetTimeMessage = { minuteOfDay };
  room.send(MessageType.AdminSetTime, message);
}

/** Saludar a otro jugador (sale en el chat como mensaje propio). */
export function sendGreet(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.Greet, message);
}

/** Invitar a otro jugador a intercambiar. */
export function sendTradeRequest(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.TradeRequest, message);
}

/** Aceptar o rechazar la invitación de `fromId`. */
export function sendTradeRespond(room: CityRoom, fromId: string, accept: boolean) {
  const message: TradeRespondMessage = { fromId, accept };
  room.send(MessageType.TradeRespond, message);
}

/** Reemplazar la oferta propia del intercambio en curso. */
export function sendTradeOffer(room: CityRoom, offer: TradeOffer) {
  room.send(MessageType.TradeOffer, offer);
}

export function sendTradeAccept(room: CityRoom) {
  room.send(MessageType.TradeAccept);
}

export function sendTradeCancel(room: CityRoom) {
  room.send(MessageType.TradeCancel);
}

/** Abrir una caja sorpresa de la mochila (el premio llega con `box:opened`). */
export function sendBoxOpen(room: CityRoom, itemId: string) {
  const message: BoxOpenMessage = { itemId };
  room.send(MessageType.BoxOpen, message);
}
