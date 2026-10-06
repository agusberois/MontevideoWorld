import type { Appearance } from "./appearance";
import type { Card, CasinoGame, RouletteBet, SlotSymbol } from "./casino";
import type { GestureId, PairGestureId } from "./gestures";
import type { InventoryStack, ItemSlot } from "./items";
import type { TilePoint } from "./cities/types";
import type { TradeOffer } from "./trade";
import type { TutorialState } from "./tutorial";
import type { CustomerState, MatchMode } from "./vending";
import type { CrowdState } from "./busking";
import type { BarraColorId, BarraView } from "./barras";
import type { WeatherMode } from "./weather";

/** Tipos de mensaje que viajan por room.send / room.onMessage. */
export const MessageType = {
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
  /** Cliente → Servidor: fundar una barra (al lado del Registro de Barras, pagando `BARRA_FOUND_COST`). */
  BarraCreate: "barra:create",
  /** Cliente → Servidor: el fundador invita a un jugador de la sala a su barra. */
  BarraInvite: "barra:invite",
  /** Servidor → Cliente: te invitaron a una barra. */
  BarraInvited: "barra:invited",
  /** Cliente → Servidor: aceptar o rechazar una invitación. */
  BarraRespond: "barra:respond",
  /** Cliente → Servidor: irse de la barra (el fundador, si se va, la disuelve). */
  BarraLeave: "barra:leave",
  /** Cliente → Servidor: pedir los datos de tu barra (el panel "Mi barra"). */
  BarraRequest: "barra:get",
  /** Servidor → Cliente: tu barra (null si no tenés). */
  Barra: "barra",
  /** Servidor → Cliente: cómo salió fundar, invitar, entrar o irse. */
  BarraResult: "barra:result",
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
  /** Cliente → Servidor: empezó o dejó de escribir en el chat (los demás ven 💬 sobre su cabeza). */
  Typing: "chat:typing",
  /** Cliente → Servidor: seguir a otro jugador del barrio (camina solo detrás de él). */
  Follow: "follow",
  /** Cliente → Servidor: dejar de seguir (se queda donde está). */
  Unfollow: "unfollow",
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
  /**
   * Entrada desde la pantalla de ingreso (no un viaje): si el jugador había quedado en otro barrio,
   * el server le emite un pase hasta ahí y rechaza con `RESUME_CITY_CODE` (el motivo es el `cityId`).
   */
  resume?: boolean;
}

/**
 * Código con el que el server rechaza la entrada al barrio de spawn de quien había quedado en otro
 * (`JoinOptions.resume`): el mensaje es el `cityId` y el cliente entra ahí (ya tiene el pase).
 */
export const RESUME_CITY_CODE = 4031;

/** Clave de jugador válida: 32 a 64 caracteres de [A-Za-z0-9_-] (p. ej. un UUID sin guiones). */
export function isPlayerKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(value);
}

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
export const MAX_ROUTE_LENGTH = 256;

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
export type ChatKind = "player" | "system" | "private" | "barra";

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
  /** Sólo en un "barra": la sigla y el color de la barra (para mostrar "[LCDP] Juan: …"). */
  barraTag?: string;
  barraColor?: string;
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
/**
 * Servidor → Cliente (sólo al dueño): cómo va su guía de bienvenida (ver `tutorial.ts`). Lo pide el
 * cliente al entrar (`tutorial:get`) y llega de nuevo con cada paso cumplido. `completed`: el paso
 * que se acaba de cumplir y lo que pagó (para el aviso).
 */
export interface TutorialMessage extends TutorialState {
  completed?: { step: number; reward: number; gift?: string };
}

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
export const SHOP_MAX_QUANTITY = 99;

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

/**
 * Cliente → Servidor: vender lo elegido en la tienda `shopId` (líneas de la mochila), todo junto. Es
 * todo o nada: si falta algo o la tienda no compra una cosa, no se vende nada.
 */
export interface ShopSellManyMessage {
  shopId: string;
  items: CartLine[];
}

/** Cliente → Servidor: regatear el lote entero pidiendo `price` por todo (todo o nada, ver `haggle.ts`). */
export interface ShopHaggleManyMessage extends ShopSellManyMessage {
  price: number;
}

/** Cliente → Servidor: vender una unidad de `itemId` pidiendo `price` (todo o nada). */
export interface ShopHaggleMessage extends ShopTradeMessage {
  price: number;
}

/** Cliente → Servidor: una tirada de la tragamonedas `shopId` apostando `bet`. */
export interface CasinoSlotsMessage {
  shopId: string;
  bet: number;
}

/** Cliente → Servidor: una bola de la ruleta `shopId`. */
export interface CasinoRouletteMessage {
  shopId: string;
  bet: number;
  choice: RouletteBet;
}

/** Cliente → Servidor: blackjack en la mesa `shopId`: repartir (con `bet`), pedir o plantarse. */
export interface CasinoBlackjackMessage {
  shopId: string;
  action: "deal" | "hit" | "stand";
  bet?: number;
}

/** Servidor → Cliente: cómo salió la jugada (ya se cobró y pagó; el saldo llega aparte). */
export interface CasinoResultMessage {
  game: CasinoGame;
  ok: boolean;
  text: string;
  /** Lo que se cobró de vuelta (0 si perdió). */
  payout: number;
  slots?: SlotSymbol[];
  roulette?: number;
  blackjack?: { player: Card[]; dealer: Card[]; done: boolean };
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
  /** Venta (o regateo aceptado) de lo elegido: lo que se vendió, para resaltar cada fila. */
  sold?: CartLine[];
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
  /**
   * Todo lo que picó (ids de `FISH`), también lo que no entró en la mochila: el cliente lo anima
   * saliendo del agua (uno por pez; con doble, dos). Sólo lo ve el que pesca.
   */
  hooked?: string[];
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

/**
 * Servidor → Cliente (sólo al vendedor): su hincha llega, compra, sigue de largo o se va (venta
 * cortada). Al comprar, `cartId` es el carrito con el que vendió (para dibujar lo que le da).
 */
export interface VendCustomerMessage {
  state: CustomerState;
  cartId?: string;
}

/** Servidor → Cliente: estás tocando; el resultado llega en `durationMs`. */
export interface BuskStartedMessage {
  durationMs: number;
}

/**
 * Servidor → Cliente: resultado del tema. `earned` = la propina (0 si nadie dejó nada);
 * `listeners` / `partners` = cuántos escuchaban y cuántos tocaban cerca cuando terminó.
 */
export interface BuskResultMessage {
  ok: boolean;
  text: string;
  earned: number;
  listeners: number;
  partners: number;
}

/** Servidor → Cliente (sólo al músico): su público se arrima, deja plata, se va sin dejar o se va (tema cortado). */
export interface BuskCrowdMessage {
  state: CrowdState;
}

/** Cliente → Servidor: fundar una barra con este nombre, sigla y colores (ids de `BARRA_COLORS`). */
export interface BarraCreateMessage {
  name: string;
  tag: string;
  colors: [BarraColorId, BarraColorId];
}

/** Cliente → Servidor: invitar a la barra al jugador `targetId` (sessionId, en la misma sala). */
export interface BarraInviteMessage {
  targetId: string;
}

/** Servidor → Cliente: `fromName` te invita a su barra; vence en `expiresInMs`. */
export interface BarraInvitedMessage {
  barraId: string;
  name: string;
  tag: string;
  color: string;
  fromName: string;
  expiresInMs: number;
}

/** Cliente → Servidor: aceptar (o no) la invitación a la barra `barraId`. */
export interface BarraRespondMessage {
  barraId: string;
  accept: boolean;
}

/** Servidor → Cliente: tu barra (o null). */
export interface BarraMessage {
  barra: BarraView | null;
}

/** Servidor → Cliente: resultado de una acción de barra. */
export interface BarraResultMessage {
  ok: boolean;
  text: string;
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
export const MAKER_RANGE = 6;
/** Máximo de unidades por pedido del maker. */
export const MAKER_MAX_QUANTITY = 50;

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

/** Cliente (admin) → Servidor: dejar el clima fijo en uno (`WeatherId`) o volver a que cambie solo ("auto"). */
export interface AdminWeatherMessage {
  mode: WeatherMode;
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
  /** Sólo Servidor → Cliente: cruzaste una puerta (las Termas): un fundido corto, sin ómnibus. */
  door?: boolean;
  /** Sólo Servidor → Cliente: la puerta era el borde del mapa (`Door.edge`): se va caminando. */
  walk?: boolean;
}

/** Cliente → Servidor: cruzar la puerta `doorId` del barrio. */
export interface DoorEnterMessage {
  doorId: string;
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
/** Cliente → Servidor: está escribiendo (o dejó) en el chat. */
export interface TypingMessage {
  typing: boolean;
}

export interface TargetPlayerMessage {
  targetId: string;
}

/** Cliente → Servidor: hacer el gesto `gesture` (id de `GESTURES`). */
export interface GestureMessage {
  gesture: GestureId;
}

/** Cliente → Servidor: invitar a `targetId` al gesto de a dos `gesture`. */
export interface GesturePairRequestMessage {
  targetId: string;
  gesture: PairGestureId;
}

/** Servidor → Cliente: `fromName` te invita al gesto `gesture`; vence en `expiresInMs`. */
export interface GesturePairInviteMessage {
  fromId: string;
  fromName: string;
  gesture: PairGestureId;
  expiresInMs: number;
}

/** Cliente → Servidor: respuesta a la invitación de `fromId`. */
export interface GesturePairRespondMessage {
  fromId: string;
  accept: boolean;
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

/** Cuántos juegan en un barrio, sumando todas sus copias (`copies` = salas abiertas). */
export interface CityOccupancy {
  cityId: string;
  players: number;
  copies: number;
}

/** Servidor → Cliente: ocupación de cada barrio con gente (los vacíos no vienen). */
export interface CitiesMessage {
  cities: CityOccupancy[];
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
  [MessageType.RequestTutorial]: undefined;
  [MessageType.TutorialSkip]: undefined;
  [MessageType.HospitalHeal]: { shopId: string };
  [MessageType.ShopVisit]: ShopVisitMessage;
  [MessageType.ShopBuy]: ShopTradeMessage;
  [MessageType.ShopCheckout]: ShopCheckoutMessage;
  [MessageType.ShopSell]: ShopTradeMessage;
  [MessageType.ShopHaggle]: ShopHaggleMessage;
  [MessageType.ShopSellMany]: ShopSellManyMessage;
  [MessageType.CasinoSlots]: CasinoSlotsMessage;
  [MessageType.CasinoRoulette]: CasinoRouletteMessage;
  [MessageType.CasinoBlackjack]: CasinoBlackjackMessage;
  [MessageType.ShopHaggleMany]: ShopHaggleManyMessage;
  [MessageType.FishCast]: undefined;
  [MessageType.FishStop]: undefined;
  [MessageType.FoodEat]: FoodEatMessage;
  [MessageType.VendStart]: undefined;
  [MessageType.VendStop]: undefined;
  [MessageType.BuskStart]: undefined;
  [MessageType.BarraCreate]: BarraCreateMessage;
  [MessageType.BarraInvite]: BarraInviteMessage;
  [MessageType.BarraRespond]: BarraRespondMessage;
  [MessageType.BarraLeave]: undefined;
  [MessageType.BarraRequest]: undefined;
  [MessageType.BuskStop]: undefined;
  [MessageType.AdminSetTime]: AdminSetTimeMessage;
  [MessageType.AdminNearbyRequest]: undefined;
  [MessageType.AdminGive]: AdminGiveMessage;
  [MessageType.AdminMatch]: AdminMatchMessage;
  [MessageType.AdminWeather]: AdminWeatherMessage;
  [MessageType.BoxOpen]: BoxOpenMessage;
  [MessageType.TravelRequest]: TravelMessage;
  [MessageType.CitiesRequest]: undefined;
  [MessageType.PalmShake]: { x: number; y: number };
  [MessageType.WeevilKick]: WeevilKickMessage;
  [MessageType.Greet]: TargetPlayerMessage;
  [MessageType.Typing]: TypingMessage;
  [MessageType.Follow]: TargetPlayerMessage;
  [MessageType.Unfollow]: undefined;
  [MessageType.Gesture]: GestureMessage;
  [MessageType.DoorEnter]: DoorEnterMessage;
  [MessageType.JacuzziEnter]: SitMessage;
  [MessageType.GesturePairRequest]: GesturePairRequestMessage;
  [MessageType.GesturePairRespond]: GesturePairRespondMessage;
  [MessageType.PetAdopt]: PetAdoptMessage;
  [MessageType.PetRename]: PetRenameMessage;
  [MessageType.PetRelease]: { shopId: string };
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
  [MessageType.Tutorial]: TutorialMessage;
  [MessageType.Faint]: FaintMessage;
  [MessageType.ShopOpen]: ShopOpenMessage;
  [MessageType.ShopResult]: ShopResultMessage;
  [MessageType.FishStarted]: FishStartedMessage;
  [MessageType.FishResult]: FishResultMessage;
  [MessageType.VendStarted]: VendStartedMessage;
  [MessageType.VendResult]: VendResultMessage;
  [MessageType.VendCustomer]: VendCustomerMessage;
  [MessageType.BuskStarted]: BuskStartedMessage;
  [MessageType.BuskResult]: BuskResultMessage;
  [MessageType.BuskCrowd]: BuskCrowdMessage;
  [MessageType.BarraInvited]: BarraInvitedMessage;
  [MessageType.Barra]: BarraMessage;
  [MessageType.BarraResult]: BarraResultMessage;
  [MessageType.CasinoResult]: CasinoResultMessage;
  [MessageType.GesturePairInvite]: GesturePairInviteMessage;
  [MessageType.Notice]: NoticeMessage;
  [MessageType.AdminNearby]: AdminNearbyMessage;
  [MessageType.Announcement]: AnnouncementMessage;
  [MessageType.BoxOpened]: BoxOpenedMessage;
  [MessageType.TravelApproved]: TravelMessage;
  [MessageType.Cities]: CitiesMessage;
  [MessageType.TradeInvite]: TradeInviteMessage;
  [MessageType.TradeState]: TradeStateMessage;
  [MessageType.TradeClosed]: TradeClosedMessage;
}
