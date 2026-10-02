"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAKER_MAX_QUANTITY = exports.MAKER_RANGE = exports.SHOP_MAX_QUANTITY = exports.MAX_ROUTE_LENGTH = exports.MessageType = void 0;
exports.isPlayerKey = isPlayerKey;
/** Tipos de mensaje que viajan por room.send / room.onMessage. */
exports.MessageType = {
    Move: "move",
    Chat: "chat",
    Sit: "sit",
    Equip: "equip",
    /** Cliente → Servidor: pedir el contenido de la mochila (al conectarse). */
    RequestInventory: "inventory:get",
    /** Cliente → Servidor: mover lo del casillero `from` al `to` de la mochila (mover, intercambiar o juntar). */
    InventoryMove: "inventory:move",
    /** Servidor → Cliente (sólo al dueño): contenido de la mochila. */
    Inventory: "inventory",
    /** Cliente → Servidor: pedir el saldo (al conectarse). */
    RequestWallet: "wallet:get",
    /** Cliente → Servidor: pedir las necesidades privadas (hambre) al entrar. */
    RequestNeeds: "needs:get",
    /** Servidor → Cliente (sólo al dueño): saldo de dinero. */
    Wallet: "wallet",
    /** Servidor → Cliente: necesidades privadas del jugador (hambre y salud; la energía va en el Schema). */
    Needs: "needs",
    /** Servidor → Cliente: te desmayaste (salud en 0). */
    Faint: "faint",
    /** Cliente → Servidor: en la guardia del sanatorio, pagar para curarse del todo. */
    HospitalHeal: "hospital:heal",
    /** Cliente → Servidor: clic en una tienda (caminar hasta ella y abrirla). */
    ShopVisit: "shop:visit",
    /** Servidor → Cliente: llegaste a la tienda, abrí su panel. */
    ShopOpen: "shop:open",
    /** Cliente → Servidor: comprar / vender una unidad de una prenda. */
    ShopBuy: "shop:buy",
    /** Cliente → Servidor: comprar todo el carrito de una (todo o nada). */
    ShopCheckout: "shop:checkout",
    ShopSell: "shop:sell",
    /** Cliente → Servidor: vender regateando, todo o nada (ver `haggle.ts`). */
    ShopHaggle: "shop:haggle",
    /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
    ShopResult: "shop:result",
    /** Cliente → Servidor: tirar la línea (hay que estar parado en la escollera). */
    FishCast: "fish:cast",
    /** Cliente → Servidor: recoger la línea sin esperar (cancela la pesca). */
    FishStop: "fish:stop",
    /** Cliente → Servidor: comerse algo de la mochila (comida o un pescado): llena el hambre y da energía. */
    FoodEat: "food:eat",
    /** Servidor → Cliente: empezaste a pescar; algo (o nada) va a picar en `durationMs`. */
    FishStarted: "fish:started",
    /** Servidor → Cliente: cómo terminó la pesca. */
    FishResult: "fish:result",
    /** Cliente → Servidor: ofrecer la mercadería (hay que estar en la explanada del Centenario con un carrito). */
    VendStart: "vend:start",
    /** Cliente → Servidor: dejar de vender sin esperar al cliente. */
    VendStop: "vend:stop",
    /** Servidor → Cliente: estás vendiendo; en `durationMs` se sabe si alguien compró. */
    VendStarted: "vend:started",
    /** Servidor → Cliente: cómo salió la venta. */
    VendResult: "vend:result",
    /** Servidor → Cliente: aviso para el jugador (p. ej. "estás agotado"). */
    Notice: "notice",
    /** Cliente (admin) → Servidor: mover el reloj del juego. */
    AdminSetTime: "admin:time",
    /** Cliente (admin) → Servidor: pedir los jugadores cercanos (para el maker). */
    AdminNearbyRequest: "admin:nearby:get",
    /** Servidor → Cliente (admin): jugadores a `MAKER_RANGE` tiles o menos. */
    AdminNearby: "admin:nearby",
    /** Cliente (admin) → Servidor: crear ítems del catálogo en la mochila propia o de un jugador cercano. */
    AdminGive: "admin:give",
    /** Cliente (admin) → Servidor: forzar (o no) el partido en el Centenario, en todos los barrios. */
    AdminMatch: "admin:match",
    /** Servidor → Todos (todos los barrios): anuncio del admin en el medio de la pantalla. */
    Announcement: "announcement",
    /** Cliente → Servidor: abrir una caja sorpresa de la mochila. */
    BoxOpen: "box:open",
    /** Servidor → Cliente: qué salió de la caja (para mostrar la sorpresa). */
    BoxOpened: "box:opened",
    /** Cliente → Servidor: viajar a otro barrio usando un boleto STM de la mochila (`TICKET_ID`). */
    TravelRequest: "travel:request",
    /** Servidor → Cliente: boleto pagado; ya se puede salir y entrar al barrio `cityId`. */
    TravelApproved: "travel:ok",
    /** Cliente → Servidor: sacudir la palmera del tile (x, y) (camina hasta ella si hace falta). */
    PalmShake: "palm:shake",
    /** Cliente → Servidor: patear al picudo `id`. */
    WeevilKick: "weevil:kick",
    /** Cliente → Servidor: saludar a otro jugador (sale en el chat y en su globo). */
    Greet: "greet",
    /** Cliente → Servidor: en la veterinaria, adoptar una mascota con nombre, cambiarle el nombre o despedirse. */
    PetAdopt: "pet:adopt",
    PetRename: "pet:rename",
    PetRelease: "pet:release",
    /** Cliente → Servidor: una visita del COMCAR se burla de un preso (sale en el chat, como el saludo). */
    Taunt: "taunt",
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
/** Largo máximo de `MoveMessage.path` (lo de más se ignora y el server completa con `findPath`). */
exports.MAX_ROUTE_LENGTH = 256;
/** Cuántas unidades se pueden comprar o vender de una vez (`ShopTradeMessage.quantity`). */
exports.SHOP_MAX_QUANTITY = 99;
/** Tiles (en cualquier dirección, contando diagonales) a los que el admin puede darle ítems a otro con el maker. */
exports.MAKER_RANGE = 6;
/** Máximo de unidades por pedido del maker. */
exports.MAKER_MAX_QUANTITY = 50;
//# sourceMappingURL=messages.js.map