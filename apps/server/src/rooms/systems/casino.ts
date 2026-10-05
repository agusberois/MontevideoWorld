import {
  BLACKJACK_NATURAL,
  CARD_RANKS,
  CARD_SUITS,
  CASINO_MAX_BET,
  CASINO_MIN_BET,
  Card,
  CasinoGame,
  CasinoResultMessage,
  DEALER_STANDS_ON,
  MAX_MONEY,
  MessageType,
  Shop,
  formatMoney,
  handValue,
  isBlackjack,
  isValidBet,
  rollSlotSymbol,
  rouletteBetLabel,
  rouletteColor,
  rouletteMultiplier,
  slotEmoji,
  slotsMultiplier,
} from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import type { MessageRoutes } from "./types";

/**
 * Casino: tragamonedas, ruleta y blackjack (las máquinas y mesas son "tiendas" con `Shop.casino`).
 * El server sortea, cobra la apuesta y paga; el cliente sólo muestra. Las reglas y las tablas están
 * en `packages/shared/src/casino.ts`.
 */
export function casinoRoutes(room: CityRoom) {
  return {
    [MessageType.CasinoSlots]: (session, message) => {
      const shop = gameAt(room, session, message.shopId, "slots");
      if (!shop || !takeBet(room, session, "slots", message.bet)) return;
      const reels = [rollSlotSymbol(Math.random()), rollSlotSymbol(Math.random()), rollSlotSymbol(Math.random())];
      const multiplier = slotsMultiplier(reels);
      const payout = pay(room, session, Math.floor(message.bet * multiplier));
      const shown = reels.map(slotEmoji).join(" ");
      const text = payout > 0 ? `${shown} — ¡Ganaste ${formatMoney(payout)}!` : `${shown} — Esta vez no.`;
      send(room, session, { game: "slots", ok: payout > 0, text, payout, slots: reels });
    },

    [MessageType.CasinoRoulette]: (session, message) => {
      const shop = gameAt(room, session, message.shopId, "roulette");
      if (!shop || !takeBet(room, session, "roulette", message.bet)) return;
      const number = Math.floor(Math.random() * 37);
      const payout = pay(room, session, message.bet * rouletteMultiplier(message.choice, number));
      const color = { red: "rojo", black: "negro", green: "verde" }[rouletteColor(number)];
      const text =
        payout > 0
          ? `Salió el ${number} (${color}). Apostaste ${rouletteBetLabel(message.choice)}: ¡ganaste ${formatMoney(payout)}!`
          : `Salió el ${number} (${color}). Apostaste ${rouletteBetLabel(message.choice)}: perdiste.`;
      send(room, session, { game: "roulette", ok: payout > 0, text, payout, roulette: number });
    },

    /**
     * Blackjack contra el crupier: "deal" cobra la apuesta y reparte dos y dos (una del crupier
     * tapada); "hit" pide una carta (pasarse de 21 pierde); "stand" se planta y el crupier pide hasta
     * 17. Blackjack de entrada paga 3 a 2; empate devuelve la apuesta. Sin dividir ni doblar.
     */
    [MessageType.CasinoBlackjack]: (session, message) => {
      const shop = gameAt(room, session, message.shopId, "blackjack");
      if (!shop) return;
      const hand = session.blackjack;
      if (message.action === "deal") {
        if (hand) return send(room, session, blackjackView(hand, false, "Terminá la mano que estás jugando."));
        if (!takeBet(room, session, "blackjack", message.bet)) return;
        const deck = shuffledDeck();
        const next: BlackjackHand = { bet: message.bet!, deck, player: [deck.pop()!, deck.pop()!], dealer: [deck.pop()!, deck.pop()!] };
        session.blackjack = next;
        if (isBlackjack(next.player) || isBlackjack(next.dealer)) return finishBlackjack(room, session, next);
        return send(room, session, blackjackView(next, false, `Tenés ${handValue(next.player)}. ¿Pedís o te plantás?`));
      }
      if (!hand) return send(room, session, { game: "blackjack", ok: false, text: "Primero apostá y repartí.", payout: 0 });
      if (message.action === "hit") {
        hand.player.push(hand.deck.pop()!);
        const value = handValue(hand.player);
        if (value > 21 || value === 21) return finishBlackjack(room, session, hand);
        return send(room, session, blackjackView(hand, false, `Tenés ${value}. ¿Otra?`));
      }
      finishBlackjack(room, session, hand);
    },
  } satisfies Partial<MessageRoutes>;
}

/** Una mano de blackjack en curso (en la sesión: si se va del casino, la apuesta queda perdida). */
export interface BlackjackHand {
  bet: number;
  deck: Card[];
  player: Card[];
  dealer: Card[];
}

/** La máquina o mesa `shopId` de este juego, con el jugador al lado (si no, avisa y null). */
function gameAt(room: CityRoom, session: PlayerSession, shopId: string, game: CasinoGame): Shop | null {
  const shop = room.map.getShop(shopId);
  if (!shop || shop.casino !== game) return null;
  if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
    send(room, session, { game, ok: false, text: `Acercate a la ${shop.name.toLowerCase()} para jugar.`, payout: 0 });
    return null;
  }
  return shop;
}

/** Cobra la apuesta (entera, entre el mínimo y el máximo, si alcanza la plata). */
function takeBet(room: CityRoom, session: PlayerSession, game: CasinoGame, bet: number | undefined): boolean {
  if (!isValidBet(bet)) {
    send(room, session, { game, ok: false, text: `Apostá entre ${formatMoney(CASINO_MIN_BET)} y ${formatMoney(CASINO_MAX_BET)}.`, payout: 0 });
    return false;
  }
  // Si ganara el máximo y no le entrara la plata, ni se juega.
  if (session.wallet.balance + bet * 36 > MAX_MONEY) {
    send(room, session, { game, ok: false, text: "Tenés demasiada plata para seguir apostando.", payout: 0 });
    return false;
  }
  if (!session.wallet.debit(bet)) {
    send(room, session, { game, ok: false, text: `No te alcanza para apostar ${formatMoney(bet)}.`, payout: 0 });
    return false;
  }
  room.markWallet(session);
  return true;
}

function pay(room: CityRoom, session: PlayerSession, amount: number): number {
  if (amount <= 0 || !session.wallet.credit(amount)) return 0;
  room.markWallet(session);
  return amount;
}

/** Se planta (o se pasó, o hubo blackjack de entrada): juega el crupier, se compara y se paga. */
function finishBlackjack(room: CityRoom, session: PlayerSession, hand: BlackjackHand) {
  session.blackjack = null;
  const player = handValue(hand.player);
  const playerNatural = isBlackjack(hand.player);
  const dealerNatural = isBlackjack(hand.dealer);
  if (player <= 21 && !playerNatural) {
    while (handValue(hand.dealer) < DEALER_STANDS_ON) hand.dealer.push(hand.deck.pop()!);
  }
  const dealer = handValue(hand.dealer);
  let payout = 0;
  let text: string;
  if (player > 21) text = `Te pasaste con ${player}: perdiste.`;
  else if (playerNatural && dealerNatural) {
    payout = hand.bet;
    text = "Los dos con blackjack: empate, te devuelven la apuesta.";
  } else if (playerNatural) {
    payout = Math.floor(hand.bet * BLACKJACK_NATURAL);
    text = `¡Blackjack! Ganaste ${formatMoney(payout)}.`;
  } else if (dealerNatural) text = "El crupier tiene blackjack: perdiste.";
  else if (dealer > 21) {
    payout = hand.bet * 2;
    text = `El crupier se pasó con ${dealer}: ¡ganaste ${formatMoney(payout)}!`;
  } else if (player > dealer) {
    payout = hand.bet * 2;
    text = `${player} contra ${dealer}: ¡ganaste ${formatMoney(payout)}!`;
  } else if (player === dealer) {
    payout = hand.bet;
    text = `${player} a ${dealer}: empate, te devuelven la apuesta.`;
  } else text = `${player} contra ${dealer}: ganó el crupier.`;
  payout = pay(room, session, payout);
  send(room, session, { ...blackjackView(hand, true, text), ok: payout > hand.bet, payout });
}

/** La mesa como la ve el jugador: con la mano en curso, la segunda carta del crupier va tapada. */
function blackjackView(hand: BlackjackHand, done: boolean, text: string): CasinoResultMessage {
  return {
    game: "blackjack",
    ok: true,
    text,
    payout: 0,
    blackjack: { player: hand.player, dealer: done ? hand.dealer : hand.dealer.slice(0, 1), done },
  };
}

function shuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of CARD_SUITS) for (const rank of CARD_RANKS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function send(room: CityRoom, session: PlayerSession, message: CasinoResultMessage) {
  room.sendTo(session, MessageType.CasinoResult, message);
}
