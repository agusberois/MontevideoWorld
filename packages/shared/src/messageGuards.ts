import { isItemSlot } from "./items";
import { isWeatherMode } from "./weather";
import {
  AdminGiveMessage,
  AdminMatchMessage,
  AdminWeatherMessage,
  AdminSetTimeMessage,
  BoxOpenMessage,
  ChatInputMessage,
  ClientToServerMessages,
  EquipMessage,
  FoodEatMessage,
  InventoryMoveMessage,
  MAKER_MAX_QUANTITY,
  MAX_ROUTE_LENGTH,
  MessageType,
  MoveMessage,
  PetAdoptMessage,
  PetRenameMessage,
  SHOP_MAX_QUANTITY,
  ShopCheckoutMessage,
  ShopHaggleMessage,
  ShopTradeMessage,
  SitMessage,
  TargetPlayerMessage,
  TradeRespondMessage,
  TravelMessage,
  WeevilKickMessage,
} from "./messages";
import { isValidMinuteOfDay } from "./time";
import { TradeOffer, normalizeTradeOffer } from "./trade";
import { MATCH_MODES } from "./vending";

/**
 * Type guards de los mensajes cliente → servidor. Los payloads llegan como `unknown` y el server sólo
 * llama al handler si pasan el guard de su tipo (`MESSAGE_GUARDS`). Viven en shared, junto a los DTOs,
 * así el cliente (o un test) puede usarlos también.
 */

type Fields = Record<string, unknown>;

function isObject(message: unknown): message is Fields {
  return typeof message === "object" && message !== null;
}

/** Un tile (x, y enteros): mover, sentarse, visitar una tienda, sacudir una palmera. */
export function isTileMessage(message: unknown): message is SitMessage {
  return isObject(message) && Number.isInteger(message.x) && Number.isInteger(message.y);
}

/** Un tile y, si viene, un recorrido de tiles (se valida paso a paso en `followRoute`). */
export function isMoveMessage(message: unknown): message is MoveMessage {
  if (!isTileMessage(message)) return false;
  const { path } = message as unknown as Fields;
  return path === undefined || (Array.isArray(path) && path.length <= MAX_ROUTE_LENGTH * 2 && path.every(isTileMessage));
}

export function isChatMessage(message: unknown): message is ChatInputMessage {
  return isObject(message) && typeof message.text === "string";
}

export function isEquipMessage(message: unknown): message is EquipMessage {
  return isObject(message) && isItemSlot(message.slot) && (message.itemId === null || typeof message.itemId === "string");
}

export function isInventoryMoveMessage(message: unknown): message is InventoryMoveMessage {
  return isObject(message) && Number.isInteger(message.from) && Number.isInteger(message.to);
}

/** `{ shopId }`: guardia del sanatorio, despedirse de la mascota. */
export function isShopIdMessage(message: unknown): message is { shopId: string } {
  return isObject(message) && typeof message.shopId === "string";
}

export function isShopTradeMessage(message: unknown): message is ShopTradeMessage {
  if (!isObject(message)) return false;
  const { shopId, itemId, quantity } = message;
  const validQuantity =
    quantity === undefined || (Number.isInteger(quantity) && (quantity as number) >= 1 && (quantity as number) <= SHOP_MAX_QUANTITY);
  return typeof shopId === "string" && typeof itemId === "string" && validQuantity;
}

export function isShopHaggleMessage(message: unknown): message is ShopHaggleMessage {
  return isShopTradeMessage(message) && typeof (message as unknown as Fields).price === "number";
}

export function isShopCheckoutMessage(message: unknown): message is ShopCheckoutMessage {
  if (!isObject(message)) return false;
  const { shopId, items } = message;
  return (
    typeof shopId === "string" &&
    Array.isArray(items) &&
    items.length <= 50 &&
    items.every((line: unknown) => isObject(line) && typeof line.itemId === "string" && Number.isInteger(line.quantity) && (line.quantity as number) >= 1)
  );
}

/** `{ itemId }`: comer algo, abrir una caja. */
export function isItemIdMessage(message: unknown): message is FoodEatMessage & BoxOpenMessage {
  return isObject(message) && typeof message.itemId === "string";
}

export function isAdminSetTimeMessage(message: unknown): message is AdminSetTimeMessage {
  return isObject(message) && isValidMinuteOfDay(message.minuteOfDay);
}

export function isAdminGiveMessage(message: unknown): message is AdminGiveMessage {
  if (!isObject(message)) return false;
  const { itemId, quantity, targetId } = message;
  return (
    typeof itemId === "string" &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= MAKER_MAX_QUANTITY &&
    (targetId === undefined || typeof targetId === "string")
  );
}

export function isAdminMatchMessage(message: unknown): message is AdminMatchMessage {
  return isObject(message) && (MATCH_MODES as readonly unknown[]).includes(message.mode) && (message.name === undefined || typeof message.name === "string");
}

export function isAdminWeatherMessage(message: unknown): message is AdminWeatherMessage {
  return isObject(message) && isWeatherMode(message.mode);
}

export function isTravelMessage(message: unknown): message is TravelMessage {
  return isObject(message) && typeof message.cityId === "string";
}

export function isWeevilKickMessage(message: unknown): message is WeevilKickMessage {
  return isObject(message) && typeof message.id === "string";
}

export function isTargetPlayerMessage(message: unknown): message is TargetPlayerMessage {
  return isObject(message) && typeof message.targetId === "string";
}

export function isPetAdoptMessage(message: unknown): message is PetAdoptMessage {
  return isObject(message) && typeof message.shopId === "string" && typeof message.petId === "string" && typeof message.name === "string";
}

export function isPetRenameMessage(message: unknown): message is PetRenameMessage {
  return isObject(message) && typeof message.shopId === "string" && typeof message.name === "string";
}

export function isTradeRespondMessage(message: unknown): message is TradeRespondMessage {
  return isObject(message) && typeof message.fromId === "string" && typeof message.accept === "boolean";
}

/** Una oferta que se puede normalizar (`normalizeTradeOffer`); el handler usa la normalizada. */
export function isTradeOfferMessage(message: unknown): message is TradeOffer {
  return normalizeTradeOffer(message) !== null;
}

/** Mensajes sin datos (pedir la mochila, tirar la línea…): cualquier payload sirve, no se lee. */
function noPayload(_message: unknown): _message is undefined {
  return true;
}

export type MessageGuard<T> = (message: unknown) => message is T;

/** El guard de cada mensaje cliente → servidor. No compila si falta uno. */
export const MESSAGE_GUARDS: { [K in keyof ClientToServerMessages]: MessageGuard<ClientToServerMessages[K]> } = {
  [MessageType.Move]: isMoveMessage,
  [MessageType.Chat]: isChatMessage,
  [MessageType.Sit]: isTileMessage,
  [MessageType.Equip]: isEquipMessage,
  [MessageType.RequestInventory]: noPayload,
  [MessageType.InventoryMove]: isInventoryMoveMessage,
  [MessageType.RequestWallet]: noPayload,
  [MessageType.RequestNeeds]: noPayload,
  [MessageType.RequestTutorial]: noPayload,
  [MessageType.TutorialSkip]: noPayload,
  [MessageType.HospitalHeal]: isShopIdMessage,
  [MessageType.ShopVisit]: isTileMessage,
  [MessageType.ShopBuy]: isShopTradeMessage,
  [MessageType.ShopCheckout]: isShopCheckoutMessage,
  [MessageType.ShopSell]: isShopTradeMessage,
  [MessageType.ShopHaggle]: isShopHaggleMessage,
  [MessageType.FishCast]: noPayload,
  [MessageType.FishStop]: noPayload,
  [MessageType.FoodEat]: isItemIdMessage,
  [MessageType.VendStart]: noPayload,
  [MessageType.VendStop]: noPayload,
  [MessageType.AdminSetTime]: isAdminSetTimeMessage,
  [MessageType.AdminNearbyRequest]: noPayload,
  [MessageType.AdminGive]: isAdminGiveMessage,
  [MessageType.AdminMatch]: isAdminMatchMessage,
  [MessageType.AdminWeather]: isAdminWeatherMessage,
  [MessageType.BoxOpen]: isItemIdMessage,
  [MessageType.TravelRequest]: isTravelMessage,
  [MessageType.CitiesRequest]: noPayload,
  [MessageType.PalmShake]: isTileMessage,
  [MessageType.WeevilKick]: isWeevilKickMessage,
  [MessageType.Greet]: isTargetPlayerMessage,
  [MessageType.PetAdopt]: isPetAdoptMessage,
  [MessageType.PetRename]: isPetRenameMessage,
  [MessageType.PetRelease]: isShopIdMessage,
  [MessageType.Taunt]: isTargetPlayerMessage,
  [MessageType.TradeRequest]: isTargetPlayerMessage,
  [MessageType.TradeRespond]: isTradeRespondMessage,
  [MessageType.TradeOffer]: isTradeOfferMessage,
  [MessageType.TradeAccept]: noPayload,
  [MessageType.TradeCancel]: noPayload,
};
