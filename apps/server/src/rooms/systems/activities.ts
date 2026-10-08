import {
  BUSK_ENERGY_COST,
  BUSK_HUNGER_COST,
  BUSK_LISTEN_RADIUS,
  CROWD_ARRIVE_MS,
  CUSTOMER_LEAD_MS,
  CrowdState,
  CustomerState,
  FISH_ENERGY_COST,
  FISH_HUNGER_COST,
  FishItem,
  MessageType,
  ToolItem,
  VEND_ENERGY_COST,
  VEND_HUNGER_COST,
  BuskCrowdMessage,
  CAR_ARRIVE_MS,
  CarState,
  PARK_ENERGY_COST,
  PARK_HUNGER_COST,
  PARK_NO_TIP_CHANCE,
  PARK_TIP_MAX,
  PARK_TIP_MIN,
  PARK_WAIT_MAX_MS,
  PARK_WAIT_MIN_MS,
  ParkCarMessage,
  wearsSafetyVest,
  VendCustomerMessage,
  bestCart,
  bestInstrument,
  buskMultiplier,
  bestRod,
  cartInWeather,
  edibleLabel,
  edibleValue,
  fishWithArticle,
  formatMoney,
  getItem,
  instrumentInWeather,
  rodInWeather,
} from "@montevideo-world/shared";
import { rollTip } from "../../busking";
import { rollCatch } from "../../fishing";
import { gameClock } from "../../gameClock";
import { rollSale } from "../../vending";
import { weather } from "../../weather";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, isWalking, standUp } from "../session";
import type { MessageRoutes } from "./types";

/** Pescar en la escollera, vender en el Centenario, tocar en la calle, cuidar coches y comer (o tomarse un remedio). */
export function activityRoutes(room: CityRoom) {
  return {
    [MessageType.FishCast]: (session) => castLine(room, session),
    [MessageType.FishStop]: (session) => stopFishing(session),
    [MessageType.VendStart]: (session) => startVending(room, session),
    [MessageType.VendStop]: (session) => stopVending(session),
    [MessageType.BuskStart]: (session) => startBusking(room, session),
    [MessageType.BuskStop]: (session) => stopBusking(session),
    [MessageType.ParkStart]: (session) => startParking(room, session),
    [MessageType.ParkStop]: (session) => stopParking(session),

    /** Comer algo de la mochila (comida, pescado crudo o un remedio): da lo de `edibleValue`. */
    [MessageType.FoodEat]: (session, message) => {
      const { player, inventory, needs } = session;
      const item = getItem(message.itemId);
      const value = edibleValue(item);
      if (!item || !value || inventory.count(item.id) === 0) return;
      if (!needs.canEat(value)) {
        return room.notice(session, item.category === "medicine" ? "Estás sano: guardalo para cuando lo necesites." : "Estás lleno: guardalo para después.");
      }

      inventory.remove(item.id);
      needs.eat(value);
      player.energy = needs.energy;
      room.markInventory(session);
      room.sendNeeds(session);
      if (item.category === "medicine") return room.notice(session, `💊 Te tomaste ${item.name}: ${edibleLabel(value)}.`);
      const what = item.category === "fish" ? fishWithArticle(item) : item.name.toLowerCase();
      room.notice(session, `🍽️ Te comiste ${what}: ${edibleLabel(value)}.`);
    },
  } satisfies Partial<MessageRoutes>;
}

/**
 * Tirar la línea: hay que estar parado (sin camino pendiente) en la escollera, no estar pescando,
 * tener una caña en la mochila (se usa la de mayor nivel) y energía. El resultado se sortea ahora
 * con esa caña y se resuelve en `durationMs`; moverse antes lo cancela. La energía y el uso de la
 * caña se cobran recién al terminar (`finishAttempt`): si se corta, no se pierde nada.
 */
function castLine(room: CityRoom, session: PlayerSession) {
  const { player, inventory } = session;
  if (player.fishing || player.vending || player.busking || player.parking || isWalking(session)) return;
  // Pescar gasta la caña: con un intercambio abierto cambiaría algo que quizás está ofrecido.
  if (room.trades.get(session.client.sessionId)) return fishResult(room, session, false, "Terminá el intercambio antes de pescar.");
  if (!room.map.canFishAt(player.x, player.y)) {
    return fishResult(room, session, false, "Para pescar tenés que estar parado en la Escollera Sarandí.");
  }
  const rod = bestRod(inventory.snapshot().map((stack) => stack.itemId));
  if (!rod) {
    return fishResult(room, session, false, "Necesitás una caña para pescar. Comprá una en Pesca Sarandí, la tienda frente a la escollera.");
  }
  if (!session.needs.hasEnergy(FISH_ENERGY_COST)) {
    return fishResult(room, session, false, "Estás muy cansado para pescar. Descansá un rato: sentarte en un banco ayuda.");
  }

  // El clima cambia cuánto se espera y cuánto pica; el uso se le cobra a la caña de verdad.
  const { fish, durationMs } = rollCatch(rodInWeather(rod, weather.current()));
  standUp(player);
  player.fishing = true;
  player.rod = rod.id;
  session.pending = null;
  room.sendTo(session, MessageType.FishStarted, { durationMs });

  session.fishingTimer = room.clock.setTimeout(() => {
    session.fishingTimer = null;
    player.fishing = false;
    player.rod = "";
    const finished = finishAttempt(room, session, rod, FISH_ENERGY_COST, FISH_HUNGER_COST, "En Pesca Sarandí, frente a la escollera, venden cañas nuevas.");
    if (finished) resolveCatch(room, session, fish);
    else fishResult(room, session, false, "Ya no tenés esa caña: la tirada no cuenta.");
  }, durationMs);
}

/** Lo que picó va a la mochila (lo que no entra vuelve al río) y se le cuenta al jugador. */
function resolveCatch(room: CityRoom, session: PlayerSession, fish: FishItem[]) {
  if (fish.length === 0) return fishResult(room, session, false, "No picó nada. Probá de nuevo.");
  const kept = fish.filter((f) => session.inventory.add(f.id));
  const lost = fish.length - kept.length;
  const names = (list: FishItem[]) => list.map(fishWithArticle).join(" y ");

  if (kept.length === 0) {
    const it = fish.length > 1 ? "los" : fish[0].gender === "f" ? "la" : "lo";
    return fishResult(room, session, false, `Picó ${names(fish)}, pero tenés la mochila llena: ${it} devolviste al río.`, undefined, fish);
  }
  room.markInventory(session);
  const total = kept.reduce((sum, f) => sum + f.price, 0);
  const prefix = fish.length > 1 ? "¡Doble! " : "";
  const full = lost > 0 ? " El otro no entraba en la mochila y volvió al río." : "";
  fishResult(
    room,
    session,
    true,
    `${prefix}¡Sacaste ${names(kept)}! En el Mercado del Puerto pagan ${formatMoney(total)}.${full}`,
    kept.map((f) => f.id),
    fish,
  );
  const rare = kept.filter((f) => f.difficulty >= 4);
  if (rare.length > 0 || kept.length > 1) {
    room.broadcastSystem(`🎣 ${session.player.name} sacó ${names(kept)} en la Escollera Sarandí`);
  }
}

/**
 * Ofrecer la mercadería: hay que estar parado (sin camino pendiente) en la zona de venta, no estar
 * vendiendo ni pescando, tener un carrito en la mochila (se usa el de mayor nivel) y energía. La
 * venta se sortea ahora (con partido rinde más; el clima también cuenta) y se resuelve en `durationMs`; moverse antes la
 * cancela. Como al pescar, energía y uso del carrito se cobran recién al terminar.
 */
function startVending(room: CityRoom, session: PlayerSession) {
  const { player, inventory } = session;
  const zone = room.map.city.vending;
  if (player.vending || player.fishing || player.busking || player.parking || isWalking(session)) return;
  // Vender gasta el carrito: con un intercambio abierto cambiaría algo que quizás está ofrecido.
  if (room.trades.get(session.client.sessionId)) return vendResult(room, session, false, "Terminá el intercambio antes de vender.");
  if (!zone || !room.map.canVendAt(player.x, player.y)) {
    return vendResult(room, session, false, "Para vender tenés que estar en la Explanada del Centenario, en Tres Cruces.");
  }
  const cart = bestCart(inventory.snapshot().map((stack) => stack.itemId));
  if (!cart) {
    return vendResult(room, session, false, "Necesitás un carrito para vender. Comprá uno en el Kiosco del Parque, al lado del estadio.");
  }
  if (!session.needs.hasEnergy(VEND_ENERGY_COST)) {
    return vendResult(room, session, false, "Estás muy cansado para vender. Descansá un rato: sentarte en un banco ayuda.");
  }

  const match = gameClock.currentMatch();
  const sale = rollSale(cartInWeather(cart, weather.current()), Boolean(match));
  standUp(player);
  player.vending = true;
  player.cart = cart.id;
  session.pending = null;
  room.sendTo(session, MessageType.VendStarted, { durationMs: sale.durationMs });

  // El hincha sale a caminar un rato antes del resultado, así llega justo para comprar (o no).
  // Sólo lo ve el vendedor (es dibujo nada más: así no se le dibuja a todo el barrio).
  session.customerTimer = room.clock.setTimeout(() => {
    session.customerTimer = null;
    session.customerOut = true;
    room.sendTo(session, MessageType.VendCustomer, { state: CustomerState.Arriving });
  }, Math.max(0, sale.durationMs - CUSTOMER_LEAD_MS));

  session.vendingTimer = room.clock.setTimeout(() => {
    session.vendingTimer = null;
    player.vending = false;
    player.cart = "";
    const finished = finishAttempt(room, session, cart, VEND_ENERGY_COST, VEND_HUNGER_COST, "En el Kiosco del Parque, al lado del estadio, venden carritos nuevos.");
    const sold = finished && resolveSale(room, session, cart.product, sale.earned, sale.giftId, Boolean(match));
    if (!finished) vendResult(room, session, false, "Ya no tenés ese carrito: el intento no cuenta.");
    session.customerOut = false;
    room.sendTo(session, MessageType.VendCustomer, sold ? { state: CustomerState.Bought, cartId: cart.id } : { state: CustomerState.Passed });
  }, sale.durationMs);
}

/**
 * Se cobra la venta y, si el hincha regaló algo y entra en la mochila, va ahí. Devuelve si el
 * hincha compró (para que todos lo vean comprar o seguir de largo).
 */
function resolveSale(room: CityRoom, session: PlayerSession, product: string, earned: number, giftId: string | undefined, match: boolean): boolean {
  const { player } = session;
  if (earned === 0) {
    const misses = ["Un hincha miró, dudó y siguió de largo.", "Le preguntaste a uno y te dijo que hoy no.", "Pasó de largo: probá de nuevo."];
    vendResult(room, session, false, misses[Math.floor(Math.random() * misses.length)]);
    return false;
  }
  if (!session.wallet.credit(earned)) {
    vendResult(room, session, false, "No podés tener más plata.");
    return false;
  }
  player.sales += 1;
  room.markWallet(session);

  const gift = giftId ? getItem(giftId) : undefined;
  const kept = gift && session.inventory.add(gift.id);
  if (kept) room.markInventory(session);
  const extra = !gift
    ? ""
    : kept
      ? ` ¡Y de contento te regaló ${gift.name.toLowerCase()}!`
      : ` Te quería regalar ${gift.name.toLowerCase()}, pero no tenías lugar en la mochila.`;
  const bonus = match ? " (¡precio de partido!)" : "";
  vendResult(room, session, true, `Le vendiste ${product} a un hincha: +${formatMoney(earned)}${bonus}.${extra}`, earned, kept ? gift.id : undefined);
  if (kept) room.broadcastSystem(`🎁 Un hincha le regaló ${gift.name.toLowerCase()} a ${player.name} en el Centenario`);
  return true;
}

/**
 * Tocar un tema: hay que estar parado (sin camino pendiente) en la zona del barrio (18 de Julio y
 * las plazas del Centro), no estar haciendo otra cosa, tener un instrumento (el de mayor nivel) y
 * energía. La propina base se sortea ahora (el clima cuenta) y al terminar se multiplica por el
 * público y la comparsa de ese momento (`buskMultiplier`). Como al pescar, energía y uso se cobran
 * recién al terminar.
 */
function startBusking(room: CityRoom, session: PlayerSession) {
  const { player, inventory } = session;
  const zone = room.map.city.busking;
  if (player.busking || player.fishing || player.vending || player.parking || isWalking(session)) return;
  // Tocar gasta el instrumento: con un intercambio abierto cambiaría algo que quizás está ofrecido.
  if (room.trades.get(session.client.sessionId)) return buskResult(room, session, false, "Terminá el intercambio antes de tocar.");
  if (!zone || !room.map.canBuskAt(player.x, player.y)) {
    return buskResult(room, session, false, "Para tocar tenés que estar sobre 18 de Julio o en una plaza del Centro.");
  }
  const instrument = bestInstrument(inventory.snapshot().map((stack) => stack.itemId));
  if (!instrument) {
    return buskResult(room, session, false, "Necesitás un instrumento para tocar. Comprá uno en la Casa de Música, sobre 18 de Julio.");
  }
  if (!session.needs.hasEnergy(BUSK_ENERGY_COST)) {
    return buskResult(room, session, false, "Estás muy cansado para tocar. Descansá un rato: sentarte en un banco ayuda.");
  }

  const { tip, durationMs } = rollTip(instrumentInWeather(instrument, weather.current()));
  standUp(player);
  player.busking = true;
  player.instrument = instrument.id;
  session.pending = null;
  room.sendTo(session, MessageType.BuskStarted, { durationMs });

  // La gente de mentira se arrima a escuchar al rato de empezar. Sólo la ve el músico (es dibujo).
  session.crowdTimer = room.clock.setTimeout(() => {
    session.crowdTimer = null;
    session.crowdOut = true;
    room.sendTo(session, MessageType.BuskCrowd, { state: CrowdState.Arriving });
  }, CROWD_ARRIVE_MS);

  session.buskingTimer = room.clock.setTimeout(() => {
    session.buskingTimer = null;
    session.crowdTimer?.clear();
    session.crowdTimer = null;
    // El público y la comparsa se cuentan al terminar el tema (los que se quedaron a escuchar).
    const { listeners, partners } = audience(room, session);
    player.busking = false;
    player.instrument = "";
    const finished = finishAttempt(room, session, instrument, BUSK_ENERGY_COST, BUSK_HUNGER_COST, "En la Casa de Música, sobre 18 de Julio, venden instrumentos.");
    const earned = finished ? Math.round(tip * buskMultiplier(listeners, partners)) : 0;
    const paid = finished ? resolveTip(room, session, earned, listeners, partners) : false;
    if (!finished) buskResult(room, session, false, "Ya no tenés ese instrumento: el tema no cuenta.");
    if (session.crowdOut) {
      session.crowdOut = false;
      room.sendTo(session, MessageType.BuskCrowd, { state: paid ? CrowdState.Tipped : CrowdState.Left });
    }
  }, durationMs);
}

/**
 * Quiénes están cerca (a `BUSK_LISTEN_RADIUS` tiles o menos): los que tocan son la comparsa y el
 * resto, el público. No cuenta uno mismo.
 */
function audience(room: CityRoom, session: PlayerSession): { listeners: number; partners: number } {
  const { x, y } = session.player;
  let listeners = 0;
  let partners = 0;
  for (const other of room.sessions.values()) {
    if (other === session || other.closed) continue;
    const near = Math.max(Math.abs(other.player.x - x), Math.abs(other.player.y - y)) <= BUSK_LISTEN_RADIUS;
    if (!near) continue;
    if (other.player.busking) partners += 1;
    else listeners += 1;
  }
  return { listeners, partners };
}

/** Se cobra la propina (si hubo) y se le cuenta al músico cuánta gente lo escuchaba. Devuelve si le dejaron plata. */
function resolveTip(room: CityRoom, session: PlayerSession, earned: number, listeners: number, partners: number): boolean {
  const crowd = [listeners > 0 && `${listeners} escuchando`, partners > 0 && `${partners} más tocando`].filter(Boolean).join(", ");
  const withCrowd = crowd ? ` (${crowd})` : "";
  if (earned === 0) {
    const misses = ["Terminaste el tema y nadie dejó nada.", "Aplaudieron, pero el estuche quedó vacío.", "La gente pasó apurada: probá con otro tema."];
    buskResult(room, session, false, misses[Math.floor(Math.random() * misses.length)] + withCrowd, 0, listeners, partners);
    return false;
  }
  if (!session.wallet.credit(earned)) {
    buskResult(room, session, false, "No podés tener más plata.", 0, listeners, partners);
    return false;
  }
  session.player.tips += 1;
  room.markWallet(session);
  buskResult(room, session, true, `¡Te dejaron ${formatMoney(earned)} en el estuche!${withCrowd}`, earned, listeners, partners);
  return true;
}

/**
 * Cuidar un auto (cuidacoches): hay que estar parado frente a un edificio con nombre (no una tienda
 * ni un kiosco, `CityMap.canParkAt`), con el chaleco flúo puesto, sin estar haciendo otra cosa y con energía. No hay
 * herramienta que se gaste. La propina se sortea ahora y la espera aparte (como al tocar: si
 * dependiera del resultado, cortar y volver a empezar hasta ver una espera corta sería gratis).
 * Energía y hambre se cobran recién al terminar.
 */
function startParking(room: CityRoom, session: PlayerSession) {
  const { player } = session;
  if (player.parking || player.fishing || player.vending || player.busking || isWalking(session)) return;
  if (!room.map.canParkAt(player.x, player.y)) {
    return parkResult(room, session, false, "Para cuidar coches parate frente a un edificio con nombre (un palacio, un teatro, una iglesia…). En las tiendas y kioscos no se puede.");
  }
  if (!wearsSafetyVest(player.top)) {
    return parkResult(room, session, false, "Sin el chaleco flúo puesto nadie te va a dejar el auto: ponételo desde la mochila.");
  }
  if (!session.needs.hasEnergy(PARK_ENERGY_COST)) {
    return parkResult(room, session, false, "Estás muy cansado para cuidar coches. Descansá un rato: sentarte en un banco ayuda.");
  }

  const durationMs = Math.round(PARK_WAIT_MIN_MS + Math.random() * (PARK_WAIT_MAX_MS - PARK_WAIT_MIN_MS));
  const tip = Math.random() < PARK_NO_TIP_CHANCE ? 0 : PARK_TIP_MIN + Math.floor(Math.random() * (PARK_TIP_MAX - PARK_TIP_MIN + 1));
  standUp(player);
  player.parking = true;
  session.pending = null;
  room.sendTo(session, MessageType.ParkStarted, { durationMs });

  // El auto llega y estaciona al rato de empezar. Sólo lo ve el cuidacoches (es dibujo).
  session.carTimer = room.clock.setTimeout(() => {
    session.carTimer = null;
    session.carOut = true;
    room.sendTo(session, MessageType.ParkCar, { state: CarState.Arriving });
  }, CAR_ARRIVE_MS);

  session.parkingTimer = room.clock.setTimeout(() => {
    session.parkingTimer = null;
    session.carTimer?.clear();
    session.carTimer = null;
    player.parking = false;
    session.needs.drainEnergy(PARK_ENERGY_COST);
    session.needs.drainHunger(PARK_HUNGER_COST);
    // Se sacó el chaleco mientras esperaba: el dueño no le deja nada.
    const paid = wearsSafetyVest(player.top) ? resolveParkTip(room, session, tip) : (parkResult(room, session, false, "Te sacaste el chaleco flúo: el dueño no te reconoció y se fue."), false);
    if (session.carOut) {
      session.carOut = false;
      room.sendTo(session, MessageType.ParkCar, { state: paid ? CarState.Tipped : CarState.Left });
    }
  }, durationMs);
}

/** Se cobra la propina del dueño (si dejó). Devuelve si le dejó plata. */
function resolveParkTip(room: CityRoom, session: PlayerSession, tip: number): boolean {
  if (tip === 0) {
    const misses = ["\"Hoy no tengo cambio, maestro\": se fue sin dejar nada.", "El dueño ni te miró y arrancó.", "\"La próxima te dejo\": nada esta vez."];
    parkResult(room, session, false, misses[Math.floor(Math.random() * misses.length)]);
    return false;
  }
  if (!session.wallet.credit(tip)) {
    parkResult(room, session, false, "No podés tener más plata.");
    return false;
  }
  session.player.tips += 1;
  room.markWallet(session);
  parkResult(room, session, true, `"¡Gracias, jefe!": te dejaron ${formatMoney(tip)} por cuidarle el auto.`, tip);
  return true;
}

/**
 * Cobra una tirada / un intento que llegó al final: un uso de la herramienta (si se rompe, avisa
 * dónde comprar otra) y la energía. Lo que se corta antes (moverse, salir…) no llega acá y no cuesta
 * nada. Devuelve false si la herramienta ya no está (se intercambió mientras tanto): entonces no
 * cuenta y tampoco se cobra.
 */
function finishAttempt(room: CityRoom, session: PlayerSession, tool: ToolItem, energyCost: number, hungerCost: number, whereToBuy: string): boolean {
  const left = session.inventory.wear(tool.id);
  if (left === null) return false;
  session.needs.drainEnergy(energyCost);
  session.needs.drainHunger(hungerCost);
  room.markInventory(session);
  if (left === 0) room.notice(session, `💥 Se rompió tu ${tool.name.toLowerCase()}: era su último uso. ${whereToBuy}`);
  return true;
}

/** Recoger la línea (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
export function stopFishing(session: PlayerSession) {
  session.fishingTimer?.clear();
  session.fishingTimer = null;
  session.player.fishing = false;
  session.player.rod = "";
}

/** Dejar de vender (moverse, sentarse, ir a una tienda, salir o cancelar a mano). */
export function stopVending(session: PlayerSession) {
  session.vendingTimer?.clear();
  session.vendingTimer = null;
  session.customerTimer?.clear();
  session.customerTimer = null;
  const { player } = session;
  player.vending = false;
  player.cart = "";
  // Si el hincha estaba llegando, se va (si ya compró o pasó de largo, ya se está yendo). Es sólo
  // dibujo: va directo al socket (no hay plata ni mochila que mandar antes).
  if (session.customerOut) {
    session.customerOut = false;
    const message: VendCustomerMessage = { state: CustomerState.None };
    session.client.send(MessageType.VendCustomer, message);
  }
}

/** Dejar de tocar (moverse, sentarse, ir a una tienda, salir o cancelar a mano): el tema no se cobra. */
export function stopBusking(session: PlayerSession) {
  session.buskingTimer?.clear();
  session.buskingTimer = null;
  session.crowdTimer?.clear();
  session.crowdTimer = null;
  session.player.busking = false;
  session.player.instrument = "";
  // Si el público estaba escuchando, se va. Es sólo dibujo: va directo al socket (como el hincha).
  if (session.crowdOut) {
    session.crowdOut = false;
    const message: BuskCrowdMessage = { state: CrowdState.None };
    session.client.send(MessageType.BuskCrowd, message);
  }
}

/** Dejar de cuidar coches (moverse, sentarse, ir a una tienda, salir o cancelar a mano): el auto no se cobra. */
export function stopParking(session: PlayerSession) {
  session.parkingTimer?.clear();
  session.parkingTimer = null;
  session.carTimer?.clear();
  session.carTimer = null;
  session.player.parking = false;
  // Si el auto estaba estacionado, arranca y se va. Es sólo dibujo: va directo al socket (como el hincha).
  if (session.carOut) {
    session.carOut = false;
    const message: ParkCarMessage = { state: CarState.None };
    session.client.send(MessageType.ParkCar, message);
  }
}

/** Cortar lo que esté haciendo el jugador (pescar, vender, tocar o cuidar coches): moverse, sentarse, ir a una tienda, salir. */
export function stopActivities(session: PlayerSession) {
  stopFishing(session);
  stopVending(session);
  stopBusking(session);
  stopParking(session);
}

function vendResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, earned = 0, giftId?: string) {
  room.sendTo(session, MessageType.VendResult, { ok, text, earned, giftId });
}

function parkResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, earned = 0) {
  room.sendTo(session, MessageType.ParkResult, { ok, text, earned });
}

function buskResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, earned = 0, listeners = 0, partners = 0) {
  room.sendTo(session, MessageType.BuskResult, { ok, text, earned, listeners, partners });
}

/** `hooked`: lo que picó (el cliente lo anima saliendo del agua, `Avatar.reelIn`). */
function fishResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, itemIds?: string[], hooked?: FishItem[]) {
  room.sendTo(session, MessageType.FishResult, { ok, text, itemIds, hooked: hooked?.map((f) => f.id) });
}
