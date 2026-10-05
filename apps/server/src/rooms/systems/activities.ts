import {
  CUSTOMER_LEAD_MS,
  CustomerState,
  FISH_ENERGY_COST,
  FISH_HUNGER_COST,
  FishItem,
  MessageType,
  ToolItem,
  VEND_ENERGY_COST,
  VEND_HUNGER_COST,
  bestCart,
  bestRod,
  cartInWeather,
  edibleLabel,
  edibleValue,
  fishWithArticle,
  formatMoney,
  getItem,
  rodInWeather,
} from "@montevideo-world/shared";
import { rollCatch } from "../../fishing";
import { gameClock } from "../../gameClock";
import { rollSale } from "../../vending";
import { weather } from "../../weather";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, isWalking } from "../session";
import { tutorialEvent, tutorialWants } from "./tutorial";
import type { MessageRoutes } from "./types";

/** Pescar en la escollera, vender en el Centenario y comer (o tomarse un remedio). */
export function activityRoutes(room: CityRoom) {
  return {
    [MessageType.FishCast]: (session) => castLine(room, session),
    [MessageType.FishStop]: (session) => stopFishing(session),
    [MessageType.VendStart]: (session) => startVending(room, session),
    [MessageType.VendStop]: (session) => stopVending(session),

    /** Comer algo de la mochila (comida, pescado crudo o un remedio): da lo de `edibleValue`. */
    [MessageType.FoodEat]: (session, message) => {
      const { player, inventory, needs } = session;
      const item = getItem(message.itemId);
      const value = edibleValue(item);
      if (!item || !value || inventory.count(item.id) === 0) return;
      // La torta frita de la guía se come aunque esté lleno (un jugador nuevo arranca lleno).
      if (!needs.canEat(value) && !tutorialWants(session, { kind: "eat", itemId: item.id })) {
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
      tutorialEvent(room, session, { kind: "eat", itemId: item.id });
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
  if (player.fishing || player.vending || isWalking(session)) return;
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
  player.sitting = false;
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
    return fishResult(room, session, false, `Picó ${names(fish)}, pero tenés la mochila llena: ${it} devolviste al río.`);
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
  );
  tutorialEvent(room, session, { kind: "catch" });
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
  if (player.vending || player.fishing || isWalking(session)) return;
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
  player.sitting = false;
  player.vending = true;
  player.cart = cart.id;
  session.pending = null;
  room.sendTo(session, MessageType.VendStarted, { durationMs: sale.durationMs });

  // El hincha sale a caminar un rato antes del resultado, así llega justo para comprar (o no).
  session.customerTimer = room.clock.setTimeout(() => {
    session.customerTimer = null;
    player.customer = CustomerState.Arriving;
  }, Math.max(0, sale.durationMs - CUSTOMER_LEAD_MS));

  session.vendingTimer = room.clock.setTimeout(() => {
    session.vendingTimer = null;
    player.vending = false;
    player.cart = "";
    const finished = finishAttempt(room, session, cart, VEND_ENERGY_COST, VEND_HUNGER_COST, "En el Kiosco del Parque, al lado del estadio, venden carritos nuevos.");
    const sold = finished && resolveSale(room, session, cart.product, sale.earned, sale.giftId, Boolean(match));
    if (!finished) vendResult(room, session, false, "Ya no tenés ese carrito: el intento no cuenta.");
    player.customer = sold ? CustomerState.Bought : CustomerState.Passed;
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
  // Si el hincha estaba llegando, se va (si ya compró o pasó de largo, ya se está yendo).
  if (player.customer === CustomerState.Arriving) player.customer = CustomerState.None;
}

/** Cortar lo que esté haciendo el jugador (pescar o vender): moverse, sentarse, ir a una tienda, salir. */
export function stopActivities(session: PlayerSession) {
  stopFishing(session);
  stopVending(session);
}

function vendResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, earned = 0, giftId?: string) {
  room.sendTo(session, MessageType.VendResult, { ok, text, earned, giftId });
}

function fishResult(room: CityRoom, session: PlayerSession, ok: boolean, text: string, itemIds?: string[]) {
  room.sendTo(session, MessageType.FishResult, { ok, text, itemIds });
}
