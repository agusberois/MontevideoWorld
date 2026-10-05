"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAKER_MAX_QUANTITY = exports.MAKER_RANGE = exports.SHOP_MAX_QUANTITY = exports.MAX_ROUTE_LENGTH = exports.RESUME_CITY_CODE = exports.MessageType = void 0;
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
    RequestTutorial: "tutorial:get",
    TutorialSkip: "tutorial:skip",
    /** Servidor → Cliente (sólo al dueño): saldo de dinero. */
    Wallet: "wallet",
    /** Servidor → Cliente: necesidades privadas del jugador (hambre y salud; la energía va en el Schema). */
    Needs: "needs",
    Tutorial: "tutorial",
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
    /** Cliente → Servidor: vender de una todo lo elegido en la pestaña Vender (como el carrito al comprar). */
    ShopSellMany: "shop:sell-many",
    /** Cliente → Servidor: regatear el lote elegido entero: un precio por todo, todo o nada. */
    ShopHaggleMany: "shop:haggle-many",
    /** Servidor → Cliente: resultado de una compra o venta (para mostrar al jugador). */
    ShopResult: "shop:result",
    /** Cliente → Servidor: casino (en la máquina o la mesa `shopId`). Servidor → Cliente: `casino:result`. */
    CasinoSlots: "casino:slots",
    CasinoRoulette: "casino:roulette",
    CasinoBlackjack: "casino:blackjack",
    CasinoResult: "casino:result",
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
    /** Servidor → Cliente (sólo al vendedor): el hincha que se acerca al carrito (`CustomerState`). */
    VendCustomer: "vend:customer",
    /** Cliente → Servidor: tocar un tema en la calle (en la zona del Centro, con un instrumento). */
    BuskStart: "busk:start",
    /** Cliente → Servidor: dejar de tocar. */
    BuskStop: "busk:stop",
    /** Servidor → Cliente: estás tocando; en `durationMs` se sabe si dejaron propina. */
    BuskStarted: "busk:started",
    /** Servidor → Cliente: cómo te fue con el tema. */
    BuskResult: "busk:result",
    /** Servidor → Cliente (sólo al músico): la gente de mentira que se arrima a escuchar (`CrowdState`). */
    BuskCrowd: "busk:crowd",
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
    AdminWeather: "admin:weather",
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
    /** Cliente → Servidor: pedir cuántos juegan en cada barrio (para la lista de barrios). */
    CitiesRequest: "cities:get",
    /** Servidor → Cliente: cuántos juegan en cada barrio y en cuántas copias (`CitiesMessage`). */
    Cities: "cities",
    /** Cliente → Servidor: sacudir la palmera del tile (x, y) (camina hasta ella si hace falta). */
    PalmShake: "palm:shake",
    /** Cliente → Servidor: patear al picudo `id`. */
    WeevilKick: "weevil:kick",
    /** Cliente → Servidor: saludar a otro jugador (sale en el chat y en su globo). */
    Greet: "greet",
    /** Cliente → Servidor: cruzar una puerta (`Door`: las Termas del Donador); si está lejos, camina hasta ella. */
    DoorEnter: "door:enter",
    /** Cliente → Servidor: meterse al jacuzzi del tile (x, y) (camina hasta el borde y ocupa un lugar libre). */
    JacuzziEnter: "jacuzzi:enter",
    /** Cliente → Servidor: hacer un gesto (tomar mate, aplaudir…; ver `gestures.ts`). Lo ven todos en el Schema. */
    Gesture: "gesture",
    /** Cliente → Servidor: invitar a quien tenés al lado a un gesto de a dos (`PAIR_GESTURES`). */
    GesturePairRequest: "gesture:pair",
    /** Servidor → Cliente (sólo al invitado): alguien te invita a un gesto de a dos. */
    GesturePairInvite: "gesture:invite",
    /** Cliente → Servidor: aceptar o no la invitación. */
    GesturePairRespond: "gesture:respond",
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
/**
 * Código con el que el server rechaza la entrada al barrio de spawn de quien había quedado en otro
 * (`JoinOptions.resume`): el mensaje es el `cityId` y el cliente entra ahí (ya tiene el pase).
 */
exports.RESUME_CITY_CODE = 4031;
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