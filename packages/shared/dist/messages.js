"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST_COMMAND = exports.MessageType = void 0;
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
    /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
    ShopResult: "shop:result",
    /** Cliente → Servidor: tirar la línea (hay que estar parado en la escollera). */
    FishCast: "fish:cast",
    /** Cliente → Servidor: recoger la línea sin esperar (cancela la pesca). */
    FishStop: "fish:stop",
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
};
/** Comando de chat del admin: "/post <mensaje>" publica un anuncio para todos los barrios. */
exports.POST_COMMAND = "/post";
//# sourceMappingURL=messages.js.map