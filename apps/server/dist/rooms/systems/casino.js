"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.casinoRoutes = casinoRoutes;
const shared_1 = require("@montevideo-world/shared");
/**
 * Casino: tragamonedas, ruleta y blackjack (las máquinas y mesas son "tiendas" con `Shop.casino`).
 * El server sortea, cobra la apuesta y paga; el cliente sólo muestra. Las reglas y las tablas están
 * en `packages/shared/src/casino.ts`.
 */
function casinoRoutes(room) {
    return {
        [shared_1.MessageType.CasinoSlots]: (session, message) => {
            const shop = gameAt(room, session, message.shopId, "slots");
            if (!shop || !takeBet(room, session, "slots", message.bet))
                return;
            const reels = [(0, shared_1.rollSlotSymbol)(Math.random()), (0, shared_1.rollSlotSymbol)(Math.random()), (0, shared_1.rollSlotSymbol)(Math.random())];
            const multiplier = (0, shared_1.slotsMultiplier)(reels);
            const payout = pay(room, session, Math.floor(message.bet * multiplier));
            const shown = reels.map(shared_1.slotEmoji).join(" ");
            const text = payout > 0 ? `${shown} — ¡Ganaste ${(0, shared_1.formatMoney)(payout)}!` : `${shown} — Esta vez no.`;
            send(room, session, { game: "slots", ok: payout > 0, text, payout, slots: reels });
        },
        [shared_1.MessageType.CasinoRoulette]: (session, message) => {
            const shop = gameAt(room, session, message.shopId, "roulette");
            if (!shop || !takeBet(room, session, "roulette", message.bet))
                return;
            const number = Math.floor(Math.random() * 37);
            const payout = pay(room, session, message.bet * (0, shared_1.rouletteMultiplier)(message.choice, number));
            const color = { red: "rojo", black: "negro", green: "verde" }[(0, shared_1.rouletteColor)(number)];
            const text = payout > 0
                ? `Salió el ${number} (${color}). Apostaste ${(0, shared_1.rouletteBetLabel)(message.choice)}: ¡ganaste ${(0, shared_1.formatMoney)(payout)}!`
                : `Salió el ${number} (${color}). Apostaste ${(0, shared_1.rouletteBetLabel)(message.choice)}: perdiste.`;
            send(room, session, { game: "roulette", ok: payout > 0, text, payout, roulette: number });
        },
        /**
         * Blackjack contra el crupier: "deal" cobra la apuesta y reparte dos y dos (una del crupier
         * tapada); "hit" pide una carta (pasarse de 21 pierde); "stand" se planta y el crupier pide hasta
         * 17. Blackjack de entrada paga 3 a 2; empate devuelve la apuesta. Sin dividir ni doblar.
         */
        [shared_1.MessageType.CasinoBlackjack]: (session, message) => {
            const shop = gameAt(room, session, message.shopId, "blackjack");
            if (!shop)
                return;
            const hand = session.blackjack;
            if (message.action === "deal") {
                if (hand)
                    return send(room, session, blackjackView(hand, false, "Terminá la mano que estás jugando."));
                if (!takeBet(room, session, "blackjack", message.bet))
                    return;
                const deck = shuffledDeck();
                const next = { bet: message.bet, deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()] };
                session.blackjack = next;
                if ((0, shared_1.isBlackjack)(next.player) || (0, shared_1.isBlackjack)(next.dealer))
                    return finishBlackjack(room, session, next);
                return send(room, session, blackjackView(next, false, `Tenés ${(0, shared_1.handValue)(next.player)}. ¿Pedís o te plantás?`));
            }
            if (!hand)
                return send(room, session, { game: "blackjack", ok: false, text: "Primero apostá y repartí.", payout: 0 });
            if (message.action === "hit") {
                hand.player.push(hand.deck.pop());
                const value = (0, shared_1.handValue)(hand.player);
                if (value > 21 || value === 21)
                    return finishBlackjack(room, session, hand);
                return send(room, session, blackjackView(hand, false, `Tenés ${value}. ¿Otra?`));
            }
            finishBlackjack(room, session, hand);
        },
    };
}
/** La máquina o mesa `shopId` de este juego, con el jugador al lado (si no, avisa y null). */
function gameAt(room, session, shopId, game) {
    const shop = room.map.getShop(shopId);
    if (!shop || shop.casino !== game)
        return null;
    if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
        send(room, session, { game, ok: false, text: `Acercate a la ${shop.name.toLowerCase()} para jugar.`, payout: 0 });
        return null;
    }
    return shop;
}
/** Cobra la apuesta (entera, entre el mínimo y el máximo, si alcanza la plata). */
function takeBet(room, session, game, bet) {
    if (!(0, shared_1.isValidBet)(bet)) {
        send(room, session, { game, ok: false, text: `Apostá entre ${(0, shared_1.formatMoney)(shared_1.CASINO_MIN_BET)} y ${(0, shared_1.formatMoney)(shared_1.CASINO_MAX_BET)}.`, payout: 0 });
        return false;
    }
    // Si ganara el máximo y no le entrara la plata, ni se juega.
    if (session.wallet.balance + bet * 36 > shared_1.MAX_MONEY) {
        send(room, session, { game, ok: false, text: "Tenés demasiada plata para seguir apostando.", payout: 0 });
        return false;
    }
    if (!session.wallet.debit(bet)) {
        send(room, session, { game, ok: false, text: `No te alcanza para apostar ${(0, shared_1.formatMoney)(bet)}.`, payout: 0 });
        return false;
    }
    room.markWallet(session);
    return true;
}
function pay(room, session, amount) {
    if (amount <= 0 || !session.wallet.credit(amount))
        return 0;
    room.markWallet(session);
    return amount;
}
/** Se planta (o se pasó, o hubo blackjack de entrada): juega el crupier, se compara y se paga. */
function finishBlackjack(room, session, hand) {
    session.blackjack = null;
    const player = (0, shared_1.handValue)(hand.player);
    const playerNatural = (0, shared_1.isBlackjack)(hand.player);
    const dealerNatural = (0, shared_1.isBlackjack)(hand.dealer);
    if (player <= 21 && !playerNatural) {
        while ((0, shared_1.handValue)(hand.dealer) < shared_1.DEALER_STANDS_ON)
            hand.dealer.push(hand.deck.pop());
    }
    const dealer = (0, shared_1.handValue)(hand.dealer);
    let payout = 0;
    let text;
    if (player > 21)
        text = `Te pasaste con ${player}: perdiste.`;
    else if (playerNatural && dealerNatural) {
        payout = hand.bet;
        text = "Los dos con blackjack: empate, te devuelven la apuesta.";
    }
    else if (playerNatural) {
        payout = Math.floor(hand.bet * shared_1.BLACKJACK_NATURAL);
        text = `¡Blackjack! Ganaste ${(0, shared_1.formatMoney)(payout)}.`;
    }
    else if (dealerNatural)
        text = "El crupier tiene blackjack: perdiste.";
    else if (dealer > 21) {
        payout = hand.bet * 2;
        text = `El crupier se pasó con ${dealer}: ¡ganaste ${(0, shared_1.formatMoney)(payout)}!`;
    }
    else if (player > dealer) {
        payout = hand.bet * 2;
        text = `${player} contra ${dealer}: ¡ganaste ${(0, shared_1.formatMoney)(payout)}!`;
    }
    else if (player === dealer) {
        payout = hand.bet;
        text = `${player} a ${dealer}: empate, te devuelven la apuesta.`;
    }
    else
        text = `${player} contra ${dealer}: ganó el crupier.`;
    payout = pay(room, session, payout);
    send(room, session, { ...blackjackView(hand, true, text), ok: payout > hand.bet, payout });
}
/** La mesa como la ve el jugador: con la mano en curso, la segunda carta del crupier va tapada. */
function blackjackView(hand, done, text) {
    return {
        game: "blackjack",
        ok: true,
        text,
        payout: 0,
        blackjack: { player: hand.player, dealer: done ? hand.dealer : hand.dealer.slice(0, 1), done },
    };
}
function shuffledDeck() {
    const deck = [];
    for (const suit of shared_1.CARD_SUITS)
        for (const rank of shared_1.CARD_RANKS)
            deck.push({ rank, suit });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
function send(room, session, message) {
    room.sendTo(session, shared_1.MessageType.CasinoResult, message);
}
//# sourceMappingURL=casino.js.map