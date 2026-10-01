"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
exports.isPlayerKey = isPlayerKey;
/** Tipos de mensaje que viajan por room.send / room.onMessage. */
exports.MessageType = {
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
};
/** Clave de jugador válida: 32 a 64 caracteres de [A-Za-z0-9_-] (p. ej. un UUID sin guiones). */
function isPlayerKey(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(value);
}
//# sourceMappingURL=messages.js.map