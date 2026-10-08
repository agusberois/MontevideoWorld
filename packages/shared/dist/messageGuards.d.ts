import { AdminGiveMessage, AdminMatchMessage, AdminWeatherMessage, AdminSetTimeMessage, BarraCreateMessage, BarraInviteMessage, BarraRespondMessage, BoxOpenMessage, ChatInputMessage, ClientToServerMessages, EquipMessage, FoodEatMessage, GestureMessage, CasinoBlackjackMessage, CasinoRouletteMessage, CasinoSlotsMessage, DoorEnterMessage, GesturePairRequestMessage, GesturePairRespondMessage, InventoryDropMessage, InventoryMoveMessage, MoveMessage, NpcTalkMessage, PetAdoptMessage, PetRenameMessage, ShopCheckoutMessage, GrillTakeMessage, ShopHaggleMessage, ShopHaggleManyMessage, ShopSellManyMessage, ShopTradeMessage, SitMessage, TargetPlayerMessage, TypingMessage, TradeRespondMessage, TravelMessage, WeevilKickMessage, WelcomeProfessionMessage } from "./messages";
import { TradeOffer } from "./trade";
/** Un tile (x, y enteros): mover, sentarse, visitar una tienda, sacudir una palmera. */
export declare function isTileMessage(message: unknown): message is SitMessage;
/** Un tile y, si viene, un recorrido de tiles (se valida paso a paso en `followRoute`). */
export declare function isMoveMessage(message: unknown): message is MoveMessage;
export declare function isBarraCreateMessage(message: unknown): message is BarraCreateMessage;
export declare function isBarraInviteMessage(message: unknown): message is BarraInviteMessage;
export declare function isBarraRespondMessage(message: unknown): message is BarraRespondMessage;
export declare function isChatMessage(message: unknown): message is ChatInputMessage;
export declare function isEquipMessage(message: unknown): message is EquipMessage;
export declare function isInventoryMoveMessage(message: unknown): message is InventoryMoveMessage;
/** `{ shopId }`: guardia del sanatorio, despedirse de la mascota. */
export declare function isShopIdMessage(message: unknown): message is {
    shopId: string;
};
export declare function isShopTradeMessage(message: unknown): message is ShopTradeMessage;
export declare function isShopHaggleMessage(message: unknown): message is ShopHaggleMessage;
export declare function isShopSellManyMessage(message: unknown): message is ShopSellManyMessage;
export declare function isShopHaggleManyMessage(message: unknown): message is ShopHaggleManyMessage;
export declare function isGrillTakeMessage(message: unknown): message is GrillTakeMessage;
export declare function isShopCheckoutMessage(message: unknown): message is ShopCheckoutMessage;
export declare function isWelcomeProfessionMessage(message: unknown): message is WelcomeProfessionMessage;
export declare function isNpcTalkMessage(message: unknown): message is NpcTalkMessage;
/** `{ itemId }`: comer algo, abrir una caja, tirar algo. */
export declare function isItemIdMessage(message: unknown): message is FoodEatMessage & BoxOpenMessage & InventoryDropMessage;
export declare function isAdminSetTimeMessage(message: unknown): message is AdminSetTimeMessage;
export declare function isAdminGiveMessage(message: unknown): message is AdminGiveMessage;
export declare function isAdminMatchMessage(message: unknown): message is AdminMatchMessage;
export declare function isAdminWeatherMessage(message: unknown): message is AdminWeatherMessage;
export declare function isTravelMessage(message: unknown): message is TravelMessage;
export declare function isWeevilKickMessage(message: unknown): message is WeevilKickMessage;
export declare function isTypingMessage(message: unknown): message is TypingMessage;
export declare function isTargetPlayerMessage(message: unknown): message is TargetPlayerMessage;
export declare function isGestureMessage(message: unknown): message is GestureMessage;
export declare function isCasinoSlotsMessage(message: unknown): message is CasinoSlotsMessage;
export declare function isCasinoRouletteMessage(message: unknown): message is CasinoRouletteMessage;
export declare function isCasinoBlackjackMessage(message: unknown): message is CasinoBlackjackMessage;
export declare function isDoorEnterMessage(message: unknown): message is DoorEnterMessage;
export declare function isGesturePairRequestMessage(message: unknown): message is GesturePairRequestMessage;
export declare function isGesturePairRespondMessage(message: unknown): message is GesturePairRespondMessage;
export declare function isPetAdoptMessage(message: unknown): message is PetAdoptMessage;
export declare function isPetRenameMessage(message: unknown): message is PetRenameMessage;
export declare function isTradeRespondMessage(message: unknown): message is TradeRespondMessage;
/** Una oferta que se puede normalizar (`normalizeTradeOffer`); el handler usa la normalizada. */
export declare function isTradeOfferMessage(message: unknown): message is TradeOffer;
export type MessageGuard<T> = (message: unknown) => message is T;
/** El guard de cada mensaje cliente → servidor. No compila si falta uno. */
export declare const MESSAGE_GUARDS: {
    [K in keyof ClientToServerMessages]: MessageGuard<ClientToServerMessages[K]>;
};
//# sourceMappingURL=messageGuards.d.ts.map