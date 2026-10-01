import { Client, Room } from "colyseus.js";
import {
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
  ShopTradeMessage,
  WalletMessage,
} from "@montevideo-world/shared";
import type { GameState } from "@montevideo-world/shared/schema";
import { eventBus } from "./eventBus";

export type CityRoom = Room<GameState>;

/** Conexión activa: la sala y el barrio al que pertenece. */
export interface CitySession {
  room: CityRoom;
  cityId: string;
}

/** Next inlinea NEXT_PUBLIC_* en build: debe referenciarse de forma literal. */
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:2567";

let client: Client | null = null;

function getClient() {
  client ??= new Client(SERVER_URL);
  return client;
}

/** Entrar al juego: siempre se aparece en el barrio de spawn (Ciudad Vieja). */
export async function joinCity(name: string): Promise<CitySession> {
  const options: JoinOptions = { name, cityId: SPAWN_CITY_ID };
  const room = await getClient().joinOrCreate<GameState>(ROOM_NAME, options);
  return { room, cityId: options.cityId };
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

/** Tirar la línea (`cast`) o recogerla (`stop`). */
export function sendFishing(room: CityRoom, action: "cast" | "stop") {
  room.send(action === "cast" ? MessageType.FishCast : MessageType.FishStop);
}

/** Admin: mover el reloj del juego (el server ignora el pedido si no sos admin). */
export function sendAdminSetTime(room: CityRoom, minuteOfDay: number) {
  const message: AdminSetTimeMessage = { minuteOfDay };
  room.send(MessageType.AdminSetTime, message);
}
