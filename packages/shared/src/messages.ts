import type { Appearance } from "./appearance";
import type { InventoryStack, ItemSlot } from "./items";
import type { TradeOffer } from "./trade";

/** Tipos de mensaje que viajan por room.send / room.onMessage. */
export const MessageType = {
  Move: "move",
  Chat: "chat",
  Sit: "sit",
  Equip: "equip",
  /** Cliente → Servidor: pedir el contenido de la mochila (al conectarse). */
  RequestInventory: "inventory:get",
  /** Servidor → Cliente (sólo al dueño): contenido de la mochila. */
  Inventory: "inventory",
  /** Cliente → Servidor: pedir el saldo (al conectarse). */
  RequestWallet: "wallet:get",
  /** Servidor → Cliente (sólo al dueño): saldo de dinero. */
  Wallet: "wallet",
  /** Cliente → Servidor: clic en una tienda (caminar hasta ella y abrirla). */
  ShopVisit: "shop:visit",
  /** Servidor → Cliente: llegaste a la tienda, abrí su panel. */
  ShopOpen: "shop:open",
  /** Cliente → Servidor: comprar / vender una unidad de una prenda. */
  ShopBuy: "shop:buy",
  ShopSell: "shop:sell",
  /** Cliente → Servidor: vender regateando, todo o nada (ver `haggle.ts`). */
  ShopHaggle: "shop:haggle",
  /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
  ShopResult: "shop:result",
  /** Cliente → Servidor: tirar la línea (hay que estar parado en la escollera). */
  FishCast: "fish:cast",
  /** Cliente → Servidor: recoger la línea sin esperar (cancela la pesca). */
  FishStop: "fish:stop",
  /** Cliente → Servidor: comerse un pescado de la mochila (recupera energía). */
  FishEat: "fish:eat",
  /** Servidor → Cliente: empezaste a pescar; algo (o nada) va a picar en `durationMs`. */
  FishStarted: "fish:started",
  /** Servidor → Cliente: cómo terminó la pesca. */
  FishResult: "fish:result",
  /** Servidor → Cliente: aviso para el jugador (p. ej. "estás agotado"). */
  Notice: "notice",
  /** Cliente (admin) → Servidor: mover el reloj del juego. */
  AdminSetTime: "admin:time",
  /** Servidor → Todos (todos los barrios): anuncio del admin en el medio de la pantalla. */
  Announcement: "announcement",
  /** Cliente → Servidor: abrir una caja sorpresa de la mochila. */
  BoxOpen: "box:open",
  /** Servidor → Cliente: qué salió de la caja (para mostrar la sorpresa). */
  BoxOpened: "box:opened",
  /** Cliente → Servidor: comprar el boleto para viajar a otro barrio (`TRAVEL_FARE`). */
  TravelRequest: "travel:request",
  /** Servidor → Cliente: boleto pagado; ya se puede salir y entrar al barrio `cityId`. */
  TravelApproved: "travel:ok",
  /** Cliente → Servidor: sacudir la palmera del tile (x, y) (camina hasta ella si hace falta). */
  PalmShake: "palm:shake",
  /** Cliente → Servidor: patear al picudo `id`. */
  WeevilKick: "weevil:kick",
  /** Cliente → Servidor: saludar a otro jugador (sale en el chat y en su globo). */
  Greet: "greet",
  /** Cliente → Servidor: invitar a otro jugador a intercambiar. */
  TradeRequest: "trade:request",
  /** Servidor → Cliente (sólo al invitado): alguien te invita a intercambiar. */
  TradeInvite: "trade:invite",
  /** Cliente → Servidor: aceptar o rechazar una invitación. */
  TradeRespond: "trade:respond",
  /** Cliente → Servidor: reemplazar la oferta propia (anula las dos aceptaciones). */
  TradeOffer: "trade:offer",
  /** Cliente → Servidor: aceptar el intercambio tal como está. */
  TradeAccept: "trade:accept",
  /** Cliente → Servidor: cancelar el intercambio en curso. */
  TradeCancel: "trade:cancel",
  /** Servidor → Cliente (a los dos): cómo está el intercambio. */
  TradeState: "trade:state",
  /** Servidor → Cliente (a los dos): el intercambio terminó (hecho o cancelado). */
  TradeClosed: "trade:closed",
} as const;

export type MessageTypeName = (typeof MessageType)[keyof typeof MessageType];

/** Opciones que el cliente envía en joinOrCreate. */
export interface JoinOptions {
  name: string;
  /** Barrio al que se entra (`CityDefinition.id`). Las salas se separan por este valor. */
  cityId: string;
  /** Aspecto elegido en la pantalla de ingreso; si falta o no es válido, el server sortea uno. */
  appearance?: Appearance;
  /**
   * Clave secreta del jugador (la genera el navegador y la guarda en localStorage). El server guarda
   * con ella la mochila, la plata y la ropa, y se las devuelve al volver a entrar. Ver `isPlayerKey`.
   */
  playerKey?: string;
}

/** Clave de jugador válida: 32 a 64 caracteres de [A-Za-z0-9_-] (p. ej. un UUID sin guiones). */
export function isPlayerKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(value);
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

/** Cliente → Servidor: vender una unidad de `itemId` pidiendo `price` (todo o nada). */
export interface ShopHaggleMessage extends ShopTradeMessage {
  price: number;
}

/** Servidor → Cliente: cómo salió la compra/venta. */
export interface ShopResultMessage {
  ok: boolean;
  text: string;
}

/** Cliente → Servidor: comerse una unidad del pescado `itemId`. */
export interface FishEatMessage {
  itemId: string;
}

/** Servidor → Cliente: la línea está en el agua; el resultado llega en `durationMs`. */
export interface FishStartedMessage {
  durationMs: number;
}

/** Servidor → Cliente: resultado de la pesca (`itemIds` = los pescados que fueron a la mochila). */
export interface FishResultMessage {
  ok: boolean;
  text: string;
  itemIds?: string[];
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

/** Cliente → Servidor: viajar a `cityId`; Servidor → Cliente: boleto pagado para `cityId`. */
export interface TravelMessage {
  cityId: string;
}

/** Cliente → Servidor: patear al picudo `id` (hay que estar cerca: `WEEVIL_KICK_RANGE`). */
export interface WeevilKickMessage {
  id: string;
}

/** Cliente → Servidor: saludar o invitar a intercambiar al jugador `targetId` (su sessionId). */
export interface TargetPlayerMessage {
  targetId: string;
}

/** Servidor → Cliente: `fromName` te invita a intercambiar; vence en `expiresInMs`. */
export interface TradeInviteMessage {
  fromId: string;
  fromName: string;
  expiresInMs: number;
}

/** Cliente → Servidor: respuesta a la invitación de `fromId`. */
export interface TradeRespondMessage {
  fromId: string;
  accept: boolean;
}

/** Una de las dos puntas del intercambio. */
export interface TradeSide {
  offer: TradeOffer;
  accepted: boolean;
}

/** Servidor → Cliente: el intercambio visto por quien lo recibe (`mine` = lo propio). */
export interface TradeStateMessage {
  partnerId: string;
  partnerName: string;
  mine: TradeSide;
  theirs: TradeSide;
}

/** Servidor → Cliente: terminó el intercambio (`ok` = se hizo) y por qué. */
export interface TradeClosedMessage {
  ok: boolean;
  text: string;
}

/** Cliente → Servidor: abrir una unidad de la caja `itemId`. */
export interface BoxOpenMessage {
  itemId: string;
}

/** Servidor → Cliente: se abrió `boxId` y salió `prizeId` (ya está en la mochila). */
export interface BoxOpenedMessage {
  boxId: string;
  prizeId: string;
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
  [MessageType.ShopHaggle]: ShopHaggleMessage;
  [MessageType.FishCast]: undefined;
  [MessageType.FishStop]: undefined;
  [MessageType.FishEat]: FishEatMessage;
  [MessageType.AdminSetTime]: AdminSetTimeMessage;
  [MessageType.BoxOpen]: BoxOpenMessage;
  [MessageType.TravelRequest]: TravelMessage;
  [MessageType.PalmShake]: { x: number; y: number };
  [MessageType.WeevilKick]: WeevilKickMessage;
  [MessageType.Greet]: TargetPlayerMessage;
  [MessageType.TradeRequest]: TargetPlayerMessage;
  [MessageType.TradeRespond]: TradeRespondMessage;
  [MessageType.TradeOffer]: TradeOffer;
  [MessageType.TradeAccept]: undefined;
  [MessageType.TradeCancel]: undefined;
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
  [MessageType.BoxOpened]: BoxOpenedMessage;
  [MessageType.TravelApproved]: TravelMessage;
  [MessageType.TradeInvite]: TradeInviteMessage;
  [MessageType.TradeState]: TradeStateMessage;
  [MessageType.TradeClosed]: TradeClosedMessage;
}
