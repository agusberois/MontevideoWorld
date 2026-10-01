import type { InventoryStack, ItemSlot } from "./items";
/** Tipos de mensaje que viajan por room.send / room.onMessage. */
export declare const MessageType: {
    readonly Move: "move";
    readonly Chat: "chat";
    readonly Sit: "sit";
    readonly Equip: "equip";
    /** Cliente → Servidor: pedir el contenido de la mochila (al conectarse). */
    readonly RequestInventory: "inventory:get";
    /** Servidor → Cliente (sólo al dueño): contenido de la mochila. */
    readonly Inventory: "inventory";
    /** Cliente → Servidor: pedir el saldo (al conectarse). */
    readonly RequestWallet: "wallet:get";
    /** Servidor → Cliente (sólo al dueño): saldo de dinero. */
    readonly Wallet: "wallet";
    /** Cliente → Servidor: clic en una tienda (caminar hasta ella y abrirla). */
    readonly ShopVisit: "shop:visit";
    /** Servidor → Cliente: llegaste a la tienda, abrí su panel. */
    readonly ShopOpen: "shop:open";
    /** Cliente → Servidor: comprar / vender una unidad de una prenda. */
    readonly ShopBuy: "shop:buy";
    readonly ShopSell: "shop:sell";
    /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
    readonly ShopResult: "shop:result";
    /** Cliente → Servidor: tirar la línea (hay que estar parado en la escollera). */
    readonly FishCast: "fish:cast";
    /** Cliente → Servidor: recoger la línea sin esperar (cancela la pesca). */
    readonly FishStop: "fish:stop";
    /** Servidor → Cliente: empezaste a pescar; algo (o nada) va a picar en `durationMs`. */
    readonly FishStarted: "fish:started";
    /** Servidor → Cliente: cómo terminó la pesca. */
    readonly FishResult: "fish:result";
    /** Servidor → Cliente: aviso para el jugador (p. ej. "estás agotado"). */
    readonly Notice: "notice";
    /** Cliente (admin) → Servidor: mover el reloj del juego. */
    readonly AdminSetTime: "admin:time";
    /** Servidor → Todos (todos los barrios): anuncio del admin en el medio de la pantalla. */
    readonly Announcement: "announcement";
};
/** Comando de chat del admin: "/post <mensaje>" publica un anuncio para todos los barrios. */
export declare const POST_COMMAND = "/post";
export type MessageTypeName = (typeof MessageType)[keyof typeof MessageType];
/** Opciones que el cliente envía en joinOrCreate. */
export interface JoinOptions {
    name: string;
    /** Barrio al que se entra (`CityDefinition.id`). Las salas se separan por este valor. */
    cityId: string;
}
/** Cliente → Servidor: caminar hacia un tile. */
export interface MoveMessage {
    x: number;
    y: number;
}
/** Cliente → Servidor: ir a sentarse en el banco del tile (x, y). */
export interface SitMessage {
    x: number;
    y: number;
}
/**
 * Cliente → Servidor: ponerse una prenda de la mochila en `slot` (`itemId`; lo que estaba puesto
 * vuelve a la mochila) o sacarse lo que hay en `slot` y guardarlo en la mochila (`null`).
 */
export interface EquipMessage {
    slot: ItemSlot;
    itemId: string | null;
}
/** Cliente → Servidor: enviar un mensaje de chat. */
export interface ChatInputMessage {
    text: string;
}
export type ChatKind = "player" | "system";
/** Servidor → Clientes: mensaje de chat difundido a la sala. */
export interface ChatBroadcastMessage {
    id: string;
    kind: ChatKind;
    sessionId: string;
    name: string;
    text: string;
    timestamp: number;
}
/** Servidor → Cliente: la mochila del jugador (privada, no viaja en el Schema). */
export interface InventoryMessage {
    stacks: InventoryStack[];
    capacity: number;
}
/** Servidor → Cliente: el saldo del jugador (privado, no viaja en el Schema). */
export interface WalletMessage {
    balance: number;
}
/** Cliente → Servidor: clic en el tile (x, y) de una tienda. */
export interface ShopVisitMessage {
    x: number;
    y: number;
}
/** Servidor → Cliente: abrir el panel de la tienda `shopId`. */
export interface ShopOpenMessage {
    shopId: string;
}
/** Cliente → Servidor: comprar o vender una unidad de `itemId` en la tienda `shopId`. */
export interface ShopTradeMessage {
    shopId: string;
    itemId: string;
}
/** Servidor → Cliente: cómo salió la compra/venta. */
export interface ShopResultMessage {
    ok: boolean;
    text: string;
}
/** Servidor → Cliente: la línea está en el agua; el resultado llega en `durationMs`. */
export interface FishStartedMessage {
    durationMs: number;
}
/** Servidor → Cliente: resultado de la pesca (`itemId` = el pescado que fue a la mochila). */
export interface FishResultMessage {
    ok: boolean;
    text: string;
    itemId?: string;
}
/** Servidor → Cliente: aviso breve que sólo ve ese jugador. */
export interface NoticeMessage {
    text: string;
}
/** Cliente (admin) → Servidor: poner el reloj del juego en `minuteOfDay` (0–1439); desde ahí sigue solo. */
export interface AdminSetTimeMessage {
    minuteOfDay: number;
}
/** Servidor → Todos: anuncio del admin ("AGOSHO: hola que tal"), no va al chat. */
export interface AnnouncementMessage {
    id: string;
    name: string;
    text: string;
}
/** Mapa tipado mensaje → payload, útil para helpers genéricos. */
export interface ClientToServerMessages {
    [MessageType.Move]: MoveMessage;
    [MessageType.Chat]: ChatInputMessage;
    [MessageType.Sit]: SitMessage;
    [MessageType.Equip]: EquipMessage;
    [MessageType.RequestInventory]: undefined;
    [MessageType.RequestWallet]: undefined;
    [MessageType.ShopVisit]: ShopVisitMessage;
    [MessageType.ShopBuy]: ShopTradeMessage;
    [MessageType.ShopSell]: ShopTradeMessage;
    [MessageType.FishCast]: undefined;
    [MessageType.FishStop]: undefined;
    [MessageType.AdminSetTime]: AdminSetTimeMessage;
}
export interface ServerToClientMessages {
    [MessageType.Chat]: ChatBroadcastMessage;
    [MessageType.Inventory]: InventoryMessage;
    [MessageType.Wallet]: WalletMessage;
    [MessageType.ShopOpen]: ShopOpenMessage;
    [MessageType.ShopResult]: ShopResultMessage;
    [MessageType.FishStarted]: FishStartedMessage;
    [MessageType.FishResult]: FishResultMessage;
    [MessageType.Notice]: NoticeMessage;
    [MessageType.Announcement]: AnnouncementMessage;
}
//# sourceMappingURL=messages.d.ts.map