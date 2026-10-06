import { Client, MatchMakeError, Room, ServerError } from "colyseus.js";
import type { BarraCreateMessage, BarraInviteMessage, BarraRespondMessage } from "@montevideo-world/shared";
import {
  JAILED_JOIN_CODE,
  JAIL_CITY_ID,
  RESUME_CITY_CODE,
  CITY_INFOS,
  Appearance,
  BoxOpenMessage,
  TravelMessage,
  FoodEatMessage,
  EquipMessage,
  AdminMatchMessage,
  AdminWeatherMessage,
  WeatherMode,
  AdminSetTimeMessage,
  MatchMode,
  AdminGiveMessage,
  InventoryMoveMessage,
  CartLine,
  ShopCheckoutMessage,
  PetAdoptMessage,
  PetRenameMessage,
  ItemSlot,
  JoinOptions,
  MessageType,
  MessageTypeName,
  ROOM_NAME,
  SPAWN_CITY_ID,
  ShopHaggleMessage,
  ShopHaggleManyMessage,
  CasinoBlackjackMessage,
  CasinoRouletteMessage,
  CasinoSlotsMessage,
  RouletteBet,
  ShopSellManyMessage,
  ShopTradeMessage,
  TargetPlayerMessage,
  TypingMessage,
  GestureId,
  GestureMessage,
  GesturePairRequestMessage,
  GesturePairRespondMessage,
  PairGestureId,
  TradeOffer,
  TradeRespondMessage,
} from "@montevideo-world/shared";
import type { GameState } from "@montevideo-world/shared/schema";
import { type GameEvents, eventBus } from "./eventBus";
import { isBlocked } from "./gameStore";
import { getPlayerKey } from "./playerKey";
import { loadCityMap } from "./cityMaps";

export type CityRoom = Room<GameState>;

/** Conexión activa: la sala y el barrio al que pertenece. */
export interface CitySession {
  room: CityRoom;
  cityId: string;
}

/** Next inlinea NEXT_PUBLIC_* en build: debe referenciarse de forma literal. */
const SERVER_URL_ENV = process.env.NEXT_PUBLIC_SERVER_URL;

/**
 * URL del servidor. Sin `NEXT_PUBLIC_SERVER_URL`, usa el mismo host que la página en el puerto
 * 2567: así entrar por `http://10.0.1.133:3000` desde otra compu de la red apunta a esa máquina.
 */
export function getServerUrl(): string {
  if (SERVER_URL_ENV) return SERVER_URL_ENV;
  if (typeof window === "undefined") return "ws://localhost:2567";
  return `ws://${window.location.hostname}:2567`;
}

let client: Client | null = null;

function getClient() {
  client ??= new Client(getServerUrl());
  return client;
}

/** Con qué nombre y aspecto se entró: al viajar a otro barrio se vuelve a entrar igual. */
let lastJoin: { name: string; appearance: Appearance } | null = null;

/**
 * Entrar a un barrio con el aspecto elegido. Sin `cityId` (desde la pantalla de ingreso) se pide el de
 * spawn (Ciudad Vieja) con `resume`: si habías quedado en otro barrio, el server te da el pase y
 * contesta `RESUME_CITY_CODE` con ese barrio, y se entra ahí.
 */
export async function joinCity(name: string, appearance: Appearance, cityId?: string, roomId?: string): Promise<CitySession> {
  lastJoin = { name, appearance };
  const resume = cityId === undefined;
  const options: JoinOptions = { name, cityId: cityId ?? SPAWN_CITY_ID, appearance, playerKey: getPlayerKey() ?? undefined, resume };
  // El mapa del barrio se descarga mientras se conecta: la escena lo necesita ya cargado.
  const map = loadCityMap(options.cityId);
  map.catch(() => {}); // si la entrada falla antes, que no quede un rechazo sin atender
  let session: CitySession;
  try {
    // Con `roomId` (`/trace`) se entra a esa copia justa; si ya cerró o está llena, a cualquiera del barrio.
    const room = roomId
      ? await getClient()
          .joinById<GameState>(roomId, options)
          .catch(() => getClient().joinOrCreate<GameState>(ROOM_NAME, options))
      : await getClient().joinOrCreate<GameState>(ROOM_NAME, options);
    session = { room, cityId: options.cityId };
  } catch (error) {
    // Había quedado en otro barrio: el pase ya está emitido, se entra ahí.
    if (resume && isServerError(error, RESUME_CITY_CODE) && CITY_INFOS.some((city) => city.id === error.message)) {
      return joinCity(name, appearance, error.message);
    }
    // Preso (`/ban`): el server no lo deja entrar a otro barrio; va directo al COMCAR.
    if (!isServerError(error, JAILED_JOIN_CODE) || options.cityId === JAIL_CITY_ID) throw error;
    const jailOptions: JoinOptions = { ...options, cityId: JAIL_CITY_ID };
    const [room] = await Promise.all([getClient().joinOrCreate<GameState>(ROOM_NAME, jailOptions), loadCityMap(JAIL_CITY_ID)]);
    return { room, cityId: JAIL_CITY_ID };
  }
  try {
    await map;
  } catch (error) {
    // Sin mapa no hay escena: se sale de la sala y se informa como error de conexión.
    void session.room.leave();
    throw error;
  }
  return session;
}

/** ¿El server rechazó la entrada con este código? (Desde `onAuth` llega como `MatchMakeError`.) */
function isServerError(error: unknown, code: number): error is ServerError | MatchMakeError {
  return (error instanceof ServerError || error instanceof MatchMakeError) && error.code === code;
}

/**
 * Texto para mostrar cuando no se pudo entrar: si el server respondió y rechazó la entrada (sala
 * llena, falta boleto…), su motivo; si no respondió, que no se pudo conectar (apagado o reiniciándose).
 */
export function describeJoinError(error: unknown): string {
  if (error instanceof ServerError || error instanceof MatchMakeError) {
    return error.message ? `El servidor no te dejó entrar: ${error.message}` : `El servidor no te dejó entrar (código ${error.code}).`;
  }
  return `No se pudo conectar al servidor (${getServerUrl()}). Si se está reiniciando, probá de nuevo en unos segundos.`;
}

/** Viajar a `cityId` usando un boleto STM de la mochila; si tenés, llega `travel:approved`. */
export function sendTravelRequest(room: CityRoom, cityId: string) {
  const message: TravelMessage = { cityId };
  room.send(MessageType.TravelRequest, message);
}

/**
 * Viajar a otro barrio (con el boleto ya pagado): entrar a su sala con el mismo nombre, aspecto y clave. Hay que salir antes
 * de la sala actual (el server guarda la mochila al salir y la devuelve al entrar con la clave).
 */
export function travelTo(cityId: string, roomId?: string): Promise<CitySession> {
  if (!lastJoin) return Promise.reject(new Error("Todavía no se entró al juego"));
  return joinCity(lastJoin.name, lastJoin.appearance, cityId, roomId);
}

/**
 * Mensajes del server que se reemiten tal cual por el EventBus: evento del bus → `MessageType`.
 * El tipo del payload lo define `GameEvents`. Para un mensaje nuevo alcanza con sumar una línea acá.
 */
const SERVER_MESSAGES: { readonly [E in keyof GameEvents]?: MessageTypeName } = {
  "chat:message": MessageType.Chat,
  "inventory:update": MessageType.Inventory,
  "wallet:update": MessageType.Wallet,
  "needs:update": MessageType.Needs,
  "tutorial:update": MessageType.Tutorial,
  faint: MessageType.Faint,
  "shop:open": MessageType.ShopOpen,
  "shop:result": MessageType.ShopResult,
  "fishing:started": MessageType.FishStarted,
  "fishing:result": MessageType.FishResult,
  "vending:started": MessageType.VendStarted,
  "vending:result": MessageType.VendResult,
  "vending:customer": MessageType.VendCustomer,
  "busking:started": MessageType.BuskStarted,
  "busking:result": MessageType.BuskResult,
  "busking:crowd": MessageType.BuskCrowd,
  "barra:update": MessageType.Barra,
  "barra:invited": MessageType.BarraInvited,
  "barra:result": MessageType.BarraResult,
  "gesture:invite": MessageType.GesturePairInvite,
  "casino:result": MessageType.CasinoResult,
  "admin:nearby": MessageType.AdminNearby,
  notice: MessageType.Notice,
  announcement: MessageType.Announcement,
  "travel:approved": MessageType.TravelApproved,
  "cities:update": MessageType.Cities,
  "box:opened": MessageType.BoxOpened,
  "trade:invite": MessageType.TradeInvite,
  "trade:state": MessageType.TradeState,
  "trade:closed": MessageType.TradeClosed,
};

/**
 * Único lugar donde se registran los mensajes de red (room.onMessage).
 * Se reemiten por el EventBus para que React y Phaser los consuman sin conocerse.
 * Devuelve una función para desregistrar (idempotente frente a StrictMode).
 */
export function bindRoomMessages(room: CityRoom): () => void {
  const unbinds = (Object.keys(SERVER_MESSAGES) as (keyof GameEvents)[]).map((event) =>
    room.onMessage(SERVER_MESSAGES[event]!, (message: GameEvents[typeof event]) => {
      // Bloqueados: su chat y sus privados no llegan ni al ChatBox ni al globo (se cortan acá, antes
      // del EventBus). La copia de un privado que mandaste vos (`to`) siempre pasa.
      if (event === "chat:message" && isFromBlocked(message as GameEvents["chat:message"])) return;
      eventBus.emit(event, message);
    }),
  );
  // Mochila, saldo, hambre y guía se piden recién ahora: si el server los mandara en onJoin podrían llegar
  // antes de que existan los handlers y colyseus.js los descartaría.
  room.send(MessageType.RequestInventory);
  room.send(MessageType.RequestWallet);
  room.send(MessageType.RequestNeeds);
  room.send(MessageType.RequestTutorial);
  return () => unbinds.forEach((unbind) => unbind());
}

function isFromBlocked(message: GameEvents["chat:message"]): boolean {
  return message.kind !== "system" && message.to === undefined && isBlocked(message.name);
}

/** Reordenar la mochila: lo del casillero `from` va al `to` (si hay algo, se intercambian o se juntan). */
export function sendInventoryMove(room: CityRoom, from: number, to: number) {
  const message: InventoryMoveMessage = { from, to };
  room.send(MessageType.InventoryMove, message);
}

/** Pedir ponerse una prenda de la mochila (`itemId`) o guardar lo puesto en `slot` (`null`). */
export function sendEquip(room: CityRoom, slot: ItemSlot, itemId: string | null) {
  const message: EquipMessage = { slot, itemId };
  room.send(MessageType.Equip, message);
}

/** Comprar (`buy`) o vender (`sell`) una unidad de una prenda en una tienda. */
export function sendShopTrade(room: CityRoom, action: "buy" | "sell", shopId: string, itemId: string, quantity = 1) {
  const message: ShopTradeMessage = { shopId, itemId, quantity };
  room.send(action === "buy" ? MessageType.ShopBuy : MessageType.ShopSell, message);
}

/** Vender regateando: pedir `price` por una unidad, todo o nada (ver `haggle.ts`). */
export function sendShopHaggle(room: CityRoom, shopId: string, itemId: string, price: number) {
  const message: ShopHaggleMessage = { shopId, itemId, price };
  room.send(MessageType.ShopHaggle, message);
}

/** Mandar un mensaje de chat (o un comando "/algo") como si se escribiera en el `ChatBox`. */
export function sendChat(room: CityRoom, text: string) {
  room.send(MessageType.Chat, { text });
}

/** Avisar que está escribiendo en el chat (o que dejó). Con la sala ya cerrada (viajando) no se manda. */
export function sendTyping(room: CityRoom, typing: boolean) {
  if (!room.connection.isOpen) return;
  const message: TypingMessage = { typing };
  room.send(MessageType.Typing, message);
}

/** Comprar todo el carrito de una tienda (todo o nada: el server responde con `shop:result`). */
export function sendShopCheckout(room: CityRoom, shopId: string, items: CartLine[]) {
  const message: ShopCheckoutMessage = { shopId, items };
  room.send(MessageType.ShopCheckout, message);
}

/** Casino: una tirada de la tragamonedas `shopId`. */
export function sendCasinoSlots(room: CityRoom, shopId: string, bet: number) {
  const message: CasinoSlotsMessage = { shopId, bet };
  room.send(MessageType.CasinoSlots, message);
}

/** Casino: una bola de la ruleta. */
export function sendCasinoRoulette(room: CityRoom, shopId: string, bet: number, choice: RouletteBet) {
  const message: CasinoRouletteMessage = { shopId, bet, choice };
  room.send(MessageType.CasinoRoulette, message);
}

/** Casino: blackjack (repartir con `bet`, pedir o plantarse). */
export function sendCasinoBlackjack(room: CityRoom, shopId: string, action: CasinoBlackjackMessage["action"], bet?: number) {
  const message: CasinoBlackjackMessage = { shopId, action, bet };
  room.send(MessageType.CasinoBlackjack, message);
}

/** Vender de una lo elegido en la pestaña Vender (todo o nada). */
export function sendShopSellMany(room: CityRoom, shopId: string, items: CartLine[]) {
  const message: ShopSellManyMessage = { shopId, items };
  room.send(MessageType.ShopSellMany, message);
}

/** Regatear el lote elegido entero: `price` por todo, todo o nada. */
export function sendShopHaggleMany(room: CityRoom, shopId: string, items: CartLine[], price: number) {
  const message: ShopHaggleManyMessage = { shopId, items, price };
  room.send(MessageType.ShopHaggleMany, message);
}

/** Guardia del sanatorio: pagar la consulta y quedar con la salud en 100. */
export function sendHospitalHeal(room: CityRoom, shopId: string) {
  room.send(MessageType.HospitalHeal, { shopId });
}

/** Veterinaria: adoptar una mascota con nombre, cambiárselo o despedirse. */
export function sendPetAdopt(room: CityRoom, shopId: string, petId: string, name: string) {
  const message: PetAdoptMessage = { shopId, petId, name };
  room.send(MessageType.PetAdopt, message);
}

export function sendPetRename(room: CityRoom, shopId: string, name: string) {
  const message: PetRenameMessage = { shopId, name };
  room.send(MessageType.PetRename, message);
}

export function sendPetRelease(room: CityRoom, shopId: string) {
  room.send(MessageType.PetRelease, { shopId });
}

/** Tirar la línea (`cast`) o recogerla (`stop`). */
export function sendFishing(room: CityRoom, action: "cast" | "stop") {
  room.send(action === "cast" ? MessageType.FishCast : MessageType.FishStop);
}

/** Ofrecer la mercadería (`start`) o dejar de vender (`stop`). */
export function sendVending(room: CityRoom, action: "start" | "stop") {
  room.send(action === "start" ? MessageType.VendStart : MessageType.VendStop);
}

/** Tocar un tema en la calle (en el Centro, con el mejor instrumento de la mochila) o dejar de tocar. */
export function sendBusking(room: CityRoom, action: "start" | "stop") {
  room.send(action === "start" ? MessageType.BuskStart : MessageType.BuskStop);
}

/** Fundar una barra (al lado del Registro de Barras). */
export function sendBarraCreate(room: CityRoom, message: BarraCreateMessage) {
  room.send(MessageType.BarraCreate, message);
}

/** Invitar a mi barra al jugador `targetId` (sólo el fundador). */
export function sendBarraInvite(room: CityRoom, targetId: string) {
  const message: BarraInviteMessage = { targetId };
  room.send(MessageType.BarraInvite, message);
}

/** Aceptar o rechazar una invitación a una barra. */
export function sendBarraRespond(room: CityRoom, barraId: string, accept: boolean) {
  const message: BarraRespondMessage = { barraId, accept };
  room.send(MessageType.BarraRespond, message);
}

/** Irse de la barra (el fundador, si se va, la disuelve). */
export function sendBarraLeave(room: CityRoom) {
  room.send(MessageType.BarraLeave);
}

/** Pedir los datos de mi barra (llegan con `barra:update`). */
export function requestBarra(room: CityRoom) {
  room.send(MessageType.BarraRequest);
}

/** Comerse un pescado de la mochila (recupera energía). */
export function sendFoodEat(room: CityRoom, itemId: string) {
  const message: FoodEatMessage = { itemId };
  room.send(MessageType.FoodEat, message);
}

/** Admin: mover el reloj del juego (el server ignora el pedido si no sos admin). */
/** Admin: forzar el partido del Centenario ("on" con un partido de `MATCHES`), suspenderlo o volver al horario. */
export function sendAdminMatch(room: CityRoom, mode: MatchMode, name?: string) {
  const message: AdminMatchMessage = { mode, name };
  room.send(MessageType.AdminMatch, message);
}

export function sendTutorialSkip(room: CityRoom) {
  room.send(MessageType.TutorialSkip);
}

export function sendAdminWeather(room: CityRoom, mode: WeatherMode) {
  const message: AdminWeatherMessage = { mode };
  room.send(MessageType.AdminWeather, message);
}

export function sendAdminSetTime(room: CityRoom, minuteOfDay: number) {
  const message: AdminSetTimeMessage = { minuteOfDay };
  room.send(MessageType.AdminSetTime, message);
}

/** Admin: pedir los jugadores cercanos (llegan por `admin:nearby`). */
export function requestNearbyPlayers(room: CityRoom) {
  room.send(MessageType.AdminNearbyRequest);
}

/** Admin (maker): crear `quantity` unidades de `itemId` para vos o para un jugador cercano (`targetId`). */
export function sendAdminGive(room: CityRoom, itemId: string, quantity: number, targetId?: string) {
  const message: AdminGiveMessage = targetId ? { itemId, quantity, targetId } : { itemId, quantity };
  room.send(MessageType.AdminGive, message);
}

/** Visita del COMCAR: burlarse de un preso (sale en el chat). */
export function sendTaunt(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.Taunt, message);
}

/** Seguir a otro jugador del barrio (el server lo hace caminar detrás de él). */
export function sendFollow(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.Follow, message);
}

/** Dejar de seguir. */
export function sendUnfollow(room: CityRoom) {
  room.send(MessageType.Unfollow);
}

/** Saludar a otro jugador (sale en el chat como mensaje propio y el avatar saluda con la mano). */
export function sendGreet(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.Greet, message);
}

/** Hacer un gesto (lo ven todos; si está caminando, lo hace al llegar). */
export function sendGesture(room: CityRoom, gesture: GestureId) {
  const message: GestureMessage = { gesture };
  room.send(MessageType.Gesture, message);
}

/** Invitar a quien tenés al lado a un gesto de a dos (chocar los cinco, abrazo, pasar el mate). */
export function sendPairGesture(room: CityRoom, targetId: string, gesture: PairGestureId) {
  const message: GesturePairRequestMessage = { targetId, gesture };
  room.send(MessageType.GesturePairRequest, message);
}

/** Aceptar o no el gesto de a dos que te propuso `fromId`. */
export function sendPairGestureRespond(room: CityRoom, fromId: string, accept: boolean) {
  const message: GesturePairRespondMessage = { fromId, accept };
  room.send(MessageType.GesturePairRespond, message);
}

/** Invitar a otro jugador a intercambiar. */
export function sendTradeRequest(room: CityRoom, targetId: string) {
  const message: TargetPlayerMessage = { targetId };
  room.send(MessageType.TradeRequest, message);
}

/** Aceptar o rechazar la invitación de `fromId`. */
export function sendTradeRespond(room: CityRoom, fromId: string, accept: boolean) {
  const message: TradeRespondMessage = { fromId, accept };
  room.send(MessageType.TradeRespond, message);
}

/** Reemplazar la oferta propia del intercambio en curso. */
export function sendTradeOffer(room: CityRoom, offer: TradeOffer) {
  room.send(MessageType.TradeOffer, offer);
}

export function sendTradeAccept(room: CityRoom) {
  room.send(MessageType.TradeAccept);
}

export function sendTradeCancel(room: CityRoom) {
  room.send(MessageType.TradeCancel);
}

/** Abrir una caja sorpresa de la mochila (el premio llega con `box:opened`). */
export function sendBoxOpen(room: CityRoom, itemId: string) {
  const message: BoxOpenMessage = { itemId };
  room.send(MessageType.BoxOpen, message);
}
