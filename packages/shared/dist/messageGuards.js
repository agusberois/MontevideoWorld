"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_GUARDS = void 0;
exports.isTileMessage = isTileMessage;
exports.isMoveMessage = isMoveMessage;
exports.isBarraCreateMessage = isBarraCreateMessage;
exports.isBarraInviteMessage = isBarraInviteMessage;
exports.isBarraRespondMessage = isBarraRespondMessage;
exports.isChatMessage = isChatMessage;
exports.isEquipMessage = isEquipMessage;
exports.isInventoryMoveMessage = isInventoryMoveMessage;
exports.isShopIdMessage = isShopIdMessage;
exports.isShopTradeMessage = isShopTradeMessage;
exports.isShopHaggleMessage = isShopHaggleMessage;
exports.isShopSellManyMessage = isShopSellManyMessage;
exports.isShopHaggleManyMessage = isShopHaggleManyMessage;
exports.isShopCheckoutMessage = isShopCheckoutMessage;
exports.isItemIdMessage = isItemIdMessage;
exports.isAdminSetTimeMessage = isAdminSetTimeMessage;
exports.isAdminGiveMessage = isAdminGiveMessage;
exports.isAdminMatchMessage = isAdminMatchMessage;
exports.isAdminWeatherMessage = isAdminWeatherMessage;
exports.isTravelMessage = isTravelMessage;
exports.isWeevilKickMessage = isWeevilKickMessage;
exports.isTargetPlayerMessage = isTargetPlayerMessage;
exports.isGestureMessage = isGestureMessage;
exports.isCasinoSlotsMessage = isCasinoSlotsMessage;
exports.isCasinoRouletteMessage = isCasinoRouletteMessage;
exports.isCasinoBlackjackMessage = isCasinoBlackjackMessage;
exports.isDoorEnterMessage = isDoorEnterMessage;
exports.isGesturePairRequestMessage = isGesturePairRequestMessage;
exports.isGesturePairRespondMessage = isGesturePairRespondMessage;
exports.isPetAdoptMessage = isPetAdoptMessage;
exports.isPetRenameMessage = isPetRenameMessage;
exports.isTradeRespondMessage = isTradeRespondMessage;
exports.isTradeOfferMessage = isTradeOfferMessage;
const barras_1 = require("./barras");
const casino_1 = require("./casino");
const gestures_1 = require("./gestures");
const items_1 = require("./items");
const weather_1 = require("./weather");
const messages_1 = require("./messages");
const time_1 = require("./time");
const trade_1 = require("./trade");
const vending_1 = require("./vending");
function isObject(message) {
    return typeof message === "object" && message !== null;
}
/** Un tile (x, y enteros): mover, sentarse, visitar una tienda, sacudir una palmera. */
function isTileMessage(message) {
    return isObject(message) && Number.isInteger(message.x) && Number.isInteger(message.y);
}
/** Un tile y, si viene, un recorrido de tiles (se valida paso a paso en `followRoute`). */
function isMoveMessage(message) {
    if (!isTileMessage(message))
        return false;
    const { path } = message;
    return path === undefined || (Array.isArray(path) && path.length <= messages_1.MAX_ROUTE_LENGTH * 2 && path.every(isTileMessage));
}
function isBarraCreateMessage(message) {
    if (!isObject(message) || typeof message.name !== "string" || typeof message.tag !== "string")
        return false;
    const { colors } = message;
    return message.name.length <= 64 && message.tag.length <= 16 && Array.isArray(colors) && colors.length === 2 && colors.every(barras_1.isBarraColorId);
}
function isBarraInviteMessage(message) {
    return isObject(message) && typeof message.targetId === "string" && message.targetId.length <= 64;
}
function isBarraRespondMessage(message) {
    return isObject(message) && typeof message.barraId === "string" && message.barraId.length <= 64 && typeof message.accept === "boolean";
}
function isChatMessage(message) {
    return isObject(message) && typeof message.text === "string";
}
function isEquipMessage(message) {
    return isObject(message) && (0, items_1.isItemSlot)(message.slot) && (message.itemId === null || typeof message.itemId === "string");
}
function isInventoryMoveMessage(message) {
    return isObject(message) && Number.isInteger(message.from) && Number.isInteger(message.to);
}
/** `{ shopId }`: guardia del sanatorio, despedirse de la mascota. */
function isShopIdMessage(message) {
    return isObject(message) && typeof message.shopId === "string";
}
function isShopTradeMessage(message) {
    if (!isObject(message))
        return false;
    const { shopId, itemId, quantity } = message;
    const validQuantity = quantity === undefined || (Number.isInteger(quantity) && quantity >= 1 && quantity <= messages_1.SHOP_MAX_QUANTITY);
    return typeof shopId === "string" && typeof itemId === "string" && validQuantity;
}
function isShopHaggleMessage(message) {
    return isShopTradeMessage(message) && typeof message.price === "number";
}
function isShopSellManyMessage(message) {
    return isShopCheckoutMessage(message);
}
function isShopHaggleManyMessage(message) {
    return isShopCheckoutMessage(message) && typeof message.price === "number";
}
function isShopCheckoutMessage(message) {
    if (!isObject(message))
        return false;
    const { shopId, items } = message;
    return (typeof shopId === "string" &&
        Array.isArray(items) &&
        items.length <= 50 &&
        items.every((line) => isObject(line) && typeof line.itemId === "string" && Number.isInteger(line.quantity) && line.quantity >= 1));
}
/** `{ itemId }`: comer algo, abrir una caja. */
function isItemIdMessage(message) {
    return isObject(message) && typeof message.itemId === "string";
}
function isAdminSetTimeMessage(message) {
    return isObject(message) && (0, time_1.isValidMinuteOfDay)(message.minuteOfDay);
}
function isAdminGiveMessage(message) {
    if (!isObject(message))
        return false;
    const { itemId, quantity, targetId } = message;
    return (typeof itemId === "string" &&
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= messages_1.MAKER_MAX_QUANTITY &&
        (targetId === undefined || typeof targetId === "string"));
}
function isAdminMatchMessage(message) {
    return isObject(message) && vending_1.MATCH_MODES.includes(message.mode) && (message.name === undefined || typeof message.name === "string");
}
function isAdminWeatherMessage(message) {
    return isObject(message) && (0, weather_1.isWeatherMode)(message.mode);
}
function isTravelMessage(message) {
    return isObject(message) && typeof message.cityId === "string";
}
function isWeevilKickMessage(message) {
    return isObject(message) && typeof message.id === "string";
}
function isTargetPlayerMessage(message) {
    return isObject(message) && typeof message.targetId === "string";
}
function isGestureMessage(message) {
    return isObject(message) && (0, gestures_1.isGestureId)(message.gesture);
}
function isCasinoSlotsMessage(message) {
    return isObject(message) && typeof message.shopId === "string" && typeof message.bet === "number";
}
function isCasinoRouletteMessage(message) {
    return isCasinoSlotsMessage(message) && (0, casino_1.isRouletteBet)(message.choice);
}
function isCasinoBlackjackMessage(message) {
    if (!isObject(message) || typeof message.shopId !== "string")
        return false;
    const { action, bet } = message;
    return (action === "deal" && typeof bet === "number") || action === "hit" || action === "stand";
}
function isDoorEnterMessage(message) {
    return isObject(message) && typeof message.doorId === "string" && message.doorId.length <= 40;
}
function isGesturePairRequestMessage(message) {
    return isObject(message) && typeof message.targetId === "string" && (0, gestures_1.isPairGestureId)(message.gesture);
}
function isGesturePairRespondMessage(message) {
    return isObject(message) && typeof message.fromId === "string" && typeof message.accept === "boolean";
}
function isPetAdoptMessage(message) {
    return isObject(message) && typeof message.shopId === "string" && typeof message.petId === "string" && typeof message.name === "string";
}
function isPetRenameMessage(message) {
    return isObject(message) && typeof message.shopId === "string" && typeof message.name === "string";
}
function isTradeRespondMessage(message) {
    return isObject(message) && typeof message.fromId === "string" && typeof message.accept === "boolean";
}
/** Una oferta que se puede normalizar (`normalizeTradeOffer`); el handler usa la normalizada. */
function isTradeOfferMessage(message) {
    return (0, trade_1.normalizeTradeOffer)(message) !== null;
}
/** Mensajes sin datos (pedir la mochila, tirar la línea…): cualquier payload sirve, no se lee. */
function noPayload(_message) {
    return true;
}
/** El guard de cada mensaje cliente → servidor. No compila si falta uno. */
exports.MESSAGE_GUARDS = {
    [messages_1.MessageType.Move]: isMoveMessage,
    [messages_1.MessageType.Chat]: isChatMessage,
    [messages_1.MessageType.Sit]: isTileMessage,
    [messages_1.MessageType.Equip]: isEquipMessage,
    [messages_1.MessageType.RequestInventory]: noPayload,
    [messages_1.MessageType.InventoryMove]: isInventoryMoveMessage,
    [messages_1.MessageType.RequestWallet]: noPayload,
    [messages_1.MessageType.RequestNeeds]: noPayload,
    [messages_1.MessageType.RequestTutorial]: noPayload,
    [messages_1.MessageType.TutorialSkip]: noPayload,
    [messages_1.MessageType.HospitalHeal]: isShopIdMessage,
    [messages_1.MessageType.ShopVisit]: isTileMessage,
    [messages_1.MessageType.ShopBuy]: isShopTradeMessage,
    [messages_1.MessageType.ShopCheckout]: isShopCheckoutMessage,
    [messages_1.MessageType.ShopSell]: isShopTradeMessage,
    [messages_1.MessageType.ShopHaggle]: isShopHaggleMessage,
    [messages_1.MessageType.ShopSellMany]: isShopSellManyMessage,
    [messages_1.MessageType.CasinoSlots]: isCasinoSlotsMessage,
    [messages_1.MessageType.CasinoRoulette]: isCasinoRouletteMessage,
    [messages_1.MessageType.CasinoBlackjack]: isCasinoBlackjackMessage,
    [messages_1.MessageType.ShopHaggleMany]: isShopHaggleManyMessage,
    [messages_1.MessageType.FishCast]: noPayload,
    [messages_1.MessageType.FishStop]: noPayload,
    [messages_1.MessageType.FoodEat]: isItemIdMessage,
    [messages_1.MessageType.VendStart]: noPayload,
    [messages_1.MessageType.VendStop]: noPayload,
    [messages_1.MessageType.BuskStart]: noPayload,
    [messages_1.MessageType.BarraCreate]: isBarraCreateMessage,
    [messages_1.MessageType.BarraInvite]: isBarraInviteMessage,
    [messages_1.MessageType.BarraRespond]: isBarraRespondMessage,
    [messages_1.MessageType.BarraLeave]: noPayload,
    [messages_1.MessageType.BarraRequest]: noPayload,
    [messages_1.MessageType.BuskStop]: noPayload,
    [messages_1.MessageType.AdminSetTime]: isAdminSetTimeMessage,
    [messages_1.MessageType.AdminNearbyRequest]: noPayload,
    [messages_1.MessageType.AdminGive]: isAdminGiveMessage,
    [messages_1.MessageType.AdminMatch]: isAdminMatchMessage,
    [messages_1.MessageType.AdminWeather]: isAdminWeatherMessage,
    [messages_1.MessageType.BoxOpen]: isItemIdMessage,
    [messages_1.MessageType.TravelRequest]: isTravelMessage,
    [messages_1.MessageType.CitiesRequest]: noPayload,
    [messages_1.MessageType.PalmShake]: isTileMessage,
    [messages_1.MessageType.WeevilKick]: isWeevilKickMessage,
    [messages_1.MessageType.Greet]: isTargetPlayerMessage,
    [messages_1.MessageType.Gesture]: isGestureMessage,
    [messages_1.MessageType.DoorEnter]: isDoorEnterMessage,
    [messages_1.MessageType.JacuzziEnter]: isTileMessage,
    [messages_1.MessageType.GesturePairRequest]: isGesturePairRequestMessage,
    [messages_1.MessageType.GesturePairRespond]: isGesturePairRespondMessage,
    [messages_1.MessageType.PetAdopt]: isPetAdoptMessage,
    [messages_1.MessageType.PetRename]: isPetRenameMessage,
    [messages_1.MessageType.PetRelease]: isShopIdMessage,
    [messages_1.MessageType.Taunt]: isTargetPlayerMessage,
    [messages_1.MessageType.TradeRequest]: isTargetPlayerMessage,
    [messages_1.MessageType.TradeRespond]: isTradeRespondMessage,
    [messages_1.MessageType.TradeOffer]: isTradeOfferMessage,
    [messages_1.MessageType.TradeAccept]: noPayload,
    [messages_1.MessageType.TradeCancel]: noPayload,
};
//# sourceMappingURL=messageGuards.js.map