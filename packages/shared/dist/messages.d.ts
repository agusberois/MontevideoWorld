import type { Appearance } from "./appearance";
import type { InventoryStack, ItemSlot } from "./items";
import type { TilePoint } from "./cities/types";
import type { TradeOffer } from "./trade";
import type { MatchMode } from "./vending";
/** Tipos de mensaje que viajan por room.send / room.onMessage. */
export declare const MessageType: {
    readonly Move: "move";
    readonly Chat: "chat";
    readonly Sit: "sit";
    readonly Equip: "equip";
    /** Cliente → Servidor: pedir el contenido de la mochila (al conectarse). */
    readonly RequestInventory: "inventory:get";
    /** Cliente → Servidor: mover lo del casillero `from` al `to` de la mochila (mover, intercambiar o juntar). */
    readonly InventoryMove: "inventory:move";
    /** Servidor → Cliente (sólo al dueño): contenido de la mochila. */
    readonly Inventory: "inventory";
    /** Cliente → Servidor: pedir el saldo (al conectarse). */
    readonly RequestWallet: "wallet:get";
    /** Cliente → Servidor: pedir las necesidades privadas (hambre) al entrar. */
    readonly RequestNeeds: "needs:get";
    /** Servidor → Cliente (sólo al dueño): saldo de dinero. */
    readonly Wallet: "wallet";
    /** Servidor → Cliente: necesidades privadas del jugador (hambre y salud; la energía va en el Schema). */
    readonly Needs: "needs";
    /** Servidor → Cliente: te desmayaste (salud en 0). */
    readonly Faint: "faint";
    /** Cliente → Servidor: en la guardia del sanatorio, pagar para curarse del todo. */
    readonly HospitalHeal: "hospital:heal";
    /** Cliente → Servidor: clic en una tienda (caminar hasta ella y abrirla). */
    readonly ShopVisit: "shop:visit";
    /** Servidor → Cliente: llegaste a la tienda, abrí su panel. */
    readonly ShopOpen: "shop:open";
    /** Cliente → Servidor: comprar / vender una unidad de una prenda. */
    readonly ShopBuy: "shop:buy";
    /** Cliente → Servidor: comprar todo el carrito de una (todo o nada). */
    readonly ShopCheckout: "shop:checkout";
    readonly ShopSell: "shop:sell";
    /** Cliente → Servidor: vender regateando, todo o nada (ver `haggle.ts`). */
    readonly ShopHaggle: "shop:haggle";
    /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
    readonly ShopResult: "shop:result";
    /** Cliente → Servidor: tirar la línea (hay que estar parado en la escollera). */
    readonly FishCast: "fish:cast";
    /** Cliente → Servidor: recoger la línea sin esperar (cancela la pesca). */
    readonly FishStop: "fish:stop";
    /** Cliente → Servidor: comerse algo de la mochila (comida o un pescado): llena el hambre y da energía. */
    readonly FoodEat: "food:eat";
    /** Servidor → Cliente: empezaste a pescar; algo (o nada) va a picar en `durationMs`. */
    readonly FishStarted: "fish:started";
    /** Servidor → Cliente: cómo terminó la pesca. */
    readonly FishResult: "fish:result";
    /** Cliente → Servidor: ofrecer la mercadería (hay que estar en la explanada del Centenario con un carrito). */
    readonly VendStart: "vend:start";
    /** Cliente → Servidor: dejar de vender sin esperar al cliente. */
    readonly VendStop: "vend:stop";
    /** Servidor → Cliente: estás vendiendo; en `durationMs` se sabe si alguien compró. */
    readonly VendStarted: "vend:started";
    /** Servidor → Cliente: cómo salió la venta. */
    readonly VendResult: "vend:result";
    /** Servidor → Cliente: aviso para el jugador (p. ej. "estás agotado"). */
    readonly Notice: "notice";
    /** Cliente (admin) → Servidor: mover el reloj del juego. */
    readonly AdminSetTime: "admin:time";
    /** Cliente (admin) → Servidor: pedir los jugadores cercanos (para el maker). */
    readonly AdminNearbyRequest: "admin:nearby:get";
    /** Servidor → Cliente (admin): jugadores a `MAKER_RANGE` tiles o menos. */
    readonly AdminNearby: "admin:nearby";
    /** Cliente (admin) → Servidor: crear ítems del catálogo en la mochila propia o de un jugador cercano. */
    readonly AdminGive: "admin:give";
    /** Cliente (admin) → Servidor: forzar (o no) el partido en el Centenario, en todos los barrios. */
    readonly AdminMatch: "admin:match";
    /** Servidor → Todos (todos los barrios): anuncio del admin en el medio de la pantalla. */
    readonly Announcement: "announcement";
    /** Cliente → Servidor: abrir una caja sorpresa de la mochila. */
    readonly BoxOpen: "box:open";
    /** Servidor → Cliente: qué salió de la caja (para mostrar la sorpresa). */
    readonly BoxOpened: "box:opened";
    /** Cliente → Servidor: viajar a otro barrio usando un boleto STM de la mochila (`TICKET_ID`). */
    readonly TravelRequest: "travel:request";
    /** Servidor → Cliente: boleto pagado; ya se puede salir y entrar al barrio `cityId`. */
    readonly TravelApproved: "travel:ok";
    /** Cliente → Servidor: sacudir la palmera del tile (x, y) (camina hasta ella si hace falta). */
    readonly PalmShake: "palm:shake";
    /** Cliente → Servidor: patear al picudo `id`. */
    readonly WeevilKick: "weevil:kick";
    /** Cliente → Servidor: saludar a otro jugador (sale en el chat y en su globo). */
    readonly Greet: "greet";
    /** Cliente → Servidor: en la veterinaria, adoptar una mascota con nombre, cambiarle el nombre o despedirse. */
    readonly PetAdopt: "pet:adopt";
    readonly PetRename: "pet:rename";
    readonly PetRelease: "pet:release";
    /** Cliente → Servidor: una visita del COMCAR se burla de un preso (sale en el chat, como el saludo). */
    readonly Taunt: "taunt";
    /** Cliente → Servidor: invitar a otro jugador a intercambiar. */
    readonly TradeRequest: "trade:request";
    /** Servidor → Cliente (sólo al invitado): alguien te invita a intercambiar. */
    readonly TradeInvite: "trade:invite";
    /** Cliente → Servidor: aceptar o rechazar una invitación. */
    readonly TradeRespond: "trade:respond";
    /** Cliente → Servidor: reemplazar la oferta propia (anula las dos aceptaciones). */
    readonly TradeOffer: "trade:offer";
    /** Cliente → Servidor: aceptar el intercambio tal como está. */
    readonly TradeAccept: "trade:accept";
    /** Cliente → Servidor: cancelar el intercambio en curso. */
    readonly TradeCancel: "trade:cancel";
    /** Servidor → Cliente (a los dos): cómo está el intercambio. */
    readonly TradeState: "trade:state";
    /** Servidor → Cliente (a los dos): el intercambio terminó (hecho o cancelado). */
    readonly TradeClosed: "trade:closed";
};
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
export declare function isPlayerKey(value: unknown): value is string;
/** Cliente → Servidor: caminar hacia un tile. */
export interface MoveMessage {
    x: number;
    y: number;
    /**
     * Opcional: el recorrido que planeó el cliente para llegar a (x, y) (ver `CityMap.followRoute`).
     * Así el server camina exactamente lo que el cliente ya está mostrando (predicción). El server lo
     * valida paso a paso; si no arranca desde donde está, calcula su propio camino (`findPath`).
     */
    path?: TilePoint[];
}
/** Largo máximo de `MoveMessage.path` (lo de más se ignora y el server completa con `findPath`). */
export declare const MAX_ROUTE_LENGTH = 256;
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
/**
 * "player": mensaje al barrio (con globo); "system": aviso del juego; "private": mensaje privado
 * (`/mensaje`), sólo lo ven quien lo manda y quien lo recibe, sin globo.
 */
export type ChatKind = "player" | "system" | "private";
/** Servidor → Clientes: mensaje de chat difundido a la sala. */
export interface ChatBroadcastMessage {
    id: string;
    kind: ChatKind;
    sessionId: string;
    name: string;
    text: string;
    timestamp: number;
    /**
     * Sólo en un "private" que mandaste vos (la copia que te vuelve): a quién se lo mandaste. En uno
     * que recibiste no viene, y `name` es quién te lo mandó.
     */
    to?: string;
}
/** Servidor → Cliente: la mochila del jugador (privada, no viaja en el Schema). */
/** Cliente → Servidor: adoptar `petId` en la tienda `shopId` y llamarla `name`. */
export interface PetAdoptMessage {
    shopId: string;
    petId: string;
    name: string;
}
/** Cliente → Servidor: nuevo nombre para tu mascota (en la tienda `shopId`). */
export interface PetRenameMessage {
    shopId: string;
    name: string;
}
/** Cliente → Servidor: casilleros de la mochila (0 … capacidad − 1). */
export interface InventoryMoveMessage {
    from: number;
    to: number;
}
export interface InventoryMessage {
    stacks: InventoryStack[];
    capacity: number;
}
/** Servidor → Cliente: el saldo del jugador (privado, no viaja en el Schema). */
/** Servidor → Cliente: hambre (saciedad) y salud, 0–100 redondeadas. Privadas: no van en el Schema. */
export interface NeedsMessage {
    hunger: number;
    health: number;
}
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
/** Cuántas unidades se pueden comprar o vender de una vez (`ShopTradeMessage.quantity`). */
export declare const SHOP_MAX_QUANTITY = 99;
/** Cliente → Servidor: comprar o vender `quantity` unidades (1 si no viene) de `itemId` en la tienda `shopId`. */
export interface ShopTradeMessage {
    shopId: string;
    itemId: string;
    /** Entero de 1 a `SHOP_MAX_QUANTITY`. Regatear es siempre de a una. */
    quantity?: number;
}
/** Una línea del carrito: `quantity` (1 … `SHOP_MAX_QUANTITY`) unidades de `itemId`. */
export interface CartLine {
    itemId: string;
    quantity: number;
}
/**
 * Cliente → Servidor: comprar todo el carrito en la tienda `shopId`, en una sola compra. Es todo o
 * nada: si no alcanza la plata o no entra en la mochila, no se compra nada.
 */
export interface ShopCheckoutMessage {
    shopId: string;
    items: CartLine[];
}
/** Cliente → Servidor: vender una unidad de `itemId` pidiendo `price` (todo o nada). */
export interface ShopHaggleMessage extends ShopTradeMessage {
    price: number;
}
/** Servidor → Cliente: cómo salió la compra/venta. */
export interface ShopResultMessage {
    ok: boolean;
    text: string;
    /** Compra o venta (no regateo ni otras tiendas): qué ítem y cuántas unidades salieron, para resaltarlo. */
    action?: "buy" | "sell";
    itemId?: string;
    quantity?: number;
    /** Compra del carrito: lo que se compró, para resaltar cada fila. */
    bought?: CartLine[];
}
/** Cliente → Servidor: comerse una unidad de `itemId` (comida o pescado). */
export interface FoodEatMessage {
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
/** Servidor → Cliente: estás ofreciendo; el resultado llega en `durationMs`. */
export interface VendStartedMessage {
    durationMs: number;
}
/**
 * Servidor → Cliente: resultado de la venta. `earned` = lo que cobraste (0 si nadie compró);
 * `giftId` = la prenda que te regaló un hincha (ya está en la mochila).
 */
export interface VendResultMessage {
    ok: boolean;
    text: string;
    earned: number;
    giftId?: string;
}
/** Servidor → Cliente: aviso breve que sólo ve ese jugador. */
export interface NoticeMessage {
    text: string;
}
/** Cliente (admin) → Servidor: poner el reloj del juego en `minuteOfDay` (0–1439); desde ahí sigue solo. */
export interface AdminSetTimeMessage {
    minuteOfDay: number;
}
/** Tiles (en cualquier dirección, contando diagonales) a los que el admin puede darle ítems a otro con el maker. */
export declare const MAKER_RANGE = 6;
/** Máximo de unidades por pedido del maker. */
export declare const MAKER_MAX_QUANTITY = 50;
/** Un jugador cerca del admin, para elegirlo en el maker. */
export interface NearbyPlayer {
    sessionId: string;
    name: string;
    /** Tiles de distancia (contando diagonales). */
    distance: number;
}
/** Servidor → Cliente (admin): jugadores cercanos, del más cerca al más lejos. */
export interface AdminNearbyMessage {
    players: NearbyPlayer[];
}
/**
 * Cliente (admin) → Servidor: crear `quantity` unidades de `itemId` (1 a `MAKER_MAX_QUANTITY`). Sin
 * `targetId`, a la mochila propia; con él, a la de ese jugador (tiene que estar a `MAKER_RANGE`).
 * Las herramientas salen nuevas. Lo que no entra en la mochila no se crea.
 */
/** Cliente (admin) → Servidor: `mode` del partido (ver `MatchMode`); con "on", `name` es uno de `MATCHES`. */
export interface AdminMatchMessage {
    mode: MatchMode;
    name?: string;
}
export interface AdminGiveMessage {
    itemId: string;
    quantity: number;
    targetId?: string;
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
    /** Sólo Servidor → Cliente: entrar a esta sala justa (una copia del barrio, ver `/trace`). */
    roomId?: string;
    /** Sólo Servidor → Cliente: te lleva la ambulancia (desmayo), no el ómnibus. */
    ambulance?: boolean;
}
/** Servidor → Cliente: te desmayaste (pantalla negra con `text`; si hay que viajar, llega `travel:ok`). */
export interface FaintMessage {
    text: string;
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
    /**
     * Herramientas ofrecidas: usos que le quedan a cada unidad que se va a pasar (las más gastadas
     * primero), por `itemId`. Así nadie recibe una caña casi rota sin saberlo.
     */
    uses: Record<string, number[]>;
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
    [MessageType.InventoryMove]: InventoryMoveMessage;
    [MessageType.RequestWallet]: undefined;
    [MessageType.RequestNeeds]: undefined;
    [MessageType.HospitalHeal]: {
        shopId: string;
    };
    [MessageType.ShopVisit]: ShopVisitMessage;
    [MessageType.ShopBuy]: ShopTradeMessage;
    [MessageType.ShopCheckout]: ShopCheckoutMessage;
    [MessageType.ShopSell]: ShopTradeMessage;
    [MessageType.ShopHaggle]: ShopHaggleMessage;
    [MessageType.FishCast]: undefined;
    [MessageType.FishStop]: undefined;
    [MessageType.FoodEat]: FoodEatMessage;
    [MessageType.VendStart]: undefined;
    [MessageType.VendStop]: undefined;
    [MessageType.AdminSetTime]: AdminSetTimeMessage;
    [MessageType.AdminNearbyRequest]: undefined;
    [MessageType.AdminGive]: AdminGiveMessage;
    [MessageType.AdminMatch]: AdminMatchMessage;
    [MessageType.BoxOpen]: BoxOpenMessage;
    [MessageType.TravelRequest]: TravelMessage;
    [MessageType.PalmShake]: {
        x: number;
        y: number;
    };
    [MessageType.WeevilKick]: WeevilKickMessage;
    [MessageType.Greet]: TargetPlayerMessage;
    [MessageType.PetAdopt]: PetAdoptMessage;
    [MessageType.PetRename]: PetRenameMessage;
    [MessageType.PetRelease]: {
        shopId: string;
    };
    [MessageType.Taunt]: TargetPlayerMessage;
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
    [MessageType.Needs]: NeedsMessage;
    [MessageType.Faint]: FaintMessage;
    [MessageType.ShopOpen]: ShopOpenMessage;
    [MessageType.ShopResult]: ShopResultMessage;
    [MessageType.FishStarted]: FishStartedMessage;
    [MessageType.FishResult]: FishResultMessage;
    [MessageType.VendStarted]: VendStartedMessage;
    [MessageType.VendResult]: VendResultMessage;
    [MessageType.Notice]: NoticeMessage;
    [MessageType.AdminNearby]: AdminNearbyMessage;
    [MessageType.Announcement]: AnnouncementMessage;
    [MessageType.BoxOpened]: BoxOpenedMessage;
    [MessageType.TravelApproved]: TravelMessage;
    [MessageType.TradeInvite]: TradeInviteMessage;
    [MessageType.TradeState]: TradeStateMessage;
    [MessageType.TradeClosed]: TradeClosedMessage;
}
//# sourceMappingURL=messages.d.ts.map