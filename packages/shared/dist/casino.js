"use strict";
/**
 * Casino (Ciudad Vieja): tragamonedas, ruleta y blackjack con la plata del juego. El server sortea y
 * paga (`apps/server/src/rooms/systems/casino.ts`); acá están las reglas y las tablas, iguales para
 * el panel. Todos los juegos dejan una ventaja chica a la casa: el casino saca plata de la economía,
 * no es una forma de ganarla.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEALER_STANDS_ON = exports.BLACKJACK_NATURAL = exports.CARD_SUITS = exports.CARD_RANKS = exports.ROULETTE_RED = exports.SLOT_TWO_CHERRIES = exports.SLOT_SYMBOLS = exports.CASINO_MAX_BET = exports.CASINO_MIN_BET = void 0;
exports.isValidBet = isValidBet;
exports.rollSlotSymbol = rollSlotSymbol;
exports.slotsMultiplier = slotsMultiplier;
exports.slotsReturnRate = slotsReturnRate;
exports.slotEmoji = slotEmoji;
exports.isRouletteBet = isRouletteBet;
exports.rouletteColor = rouletteColor;
exports.rouletteMultiplier = rouletteMultiplier;
exports.rouletteBetLabel = rouletteBetLabel;
exports.handValue = handValue;
exports.isBlackjack = isBlackjack;
/** Apuesta mínima y máxima (pesos enteros). */
exports.CASINO_MIN_BET = 1;
exports.CASINO_MAX_BET = 500;
function isValidBet(bet) {
    return Number.isSafeInteger(bet) && bet >= exports.CASINO_MIN_BET && bet <= exports.CASINO_MAX_BET;
}
// --- Tragamonedas ------------------------------------------------------------------------------
/** Símbolos de los rodillos, con su peso (más peso = sale más) y lo que paga el trío (× apuesta). */
exports.SLOT_SYMBOLS = [
    { id: "cherry", emoji: "🍒", weight: 30, triple: 8 },
    { id: "lemon", emoji: "🍋", weight: 25, triple: 14 },
    { id: "grape", emoji: "🍇", weight: 20, triple: 20 },
    { id: "bell", emoji: "🔔", weight: 12, triple: 40 },
    { id: "star", emoji: "⭐", weight: 8, triple: 80 },
    { id: "seven", emoji: "7️⃣", weight: 5, triple: 250 },
];
/** Dos cerezas (en cualquier lugar, sin trío) devuelven la apuesta. */
exports.SLOT_TWO_CHERRIES = 1;
const SLOT_TOTAL_WEIGHT = exports.SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
/** Un símbolo al azar según los pesos (`random` en [0, 1)). */
function rollSlotSymbol(random) {
    let left = random * SLOT_TOTAL_WEIGHT;
    for (const symbol of exports.SLOT_SYMBOLS) {
        left -= symbol.weight;
        if (left < 0)
            return symbol.id;
    }
    return exports.SLOT_SYMBOLS[0].id;
}
/** Cuánto paga una tirada (× apuesta): el trío de su tabla, dos cerezas, o nada. */
function slotsMultiplier(reels) {
    const [a, b, c] = reels;
    if (a === b && b === c)
        return exports.SLOT_SYMBOLS.find((symbol) => symbol.id === a)?.triple ?? 0;
    return reels.filter((reel) => reel === "cherry").length === 2 ? exports.SLOT_TWO_CHERRIES : 0;
}
/** Lo que devuelve la máquina en promedio por cada peso apostado (menos de 1: gana la casa). */
function slotsReturnRate() {
    const p = (id) => (exports.SLOT_SYMBOLS.find((symbol) => symbol.id === id)?.weight ?? 0) / SLOT_TOTAL_WEIGHT;
    const triples = exports.SLOT_SYMBOLS.reduce((sum, symbol) => sum + p(symbol.id) ** 3 * symbol.triple, 0);
    const cherry = p("cherry");
    const twoCherries = 3 * cherry * cherry * (1 - cherry) * exports.SLOT_TWO_CHERRIES;
    return triples + twoCherries;
}
function slotEmoji(id) {
    return exports.SLOT_SYMBOLS.find((symbol) => symbol.id === id)?.emoji ?? "❔";
}
// --- Ruleta (europea: 0 a 36) ------------------------------------------------------------------
exports.ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
function isRouletteBet(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const bet = value;
    if (bet.kind === "number")
        return Number.isInteger(bet.number) && bet.number >= 0 && bet.number <= 36;
    return bet.kind === "red" || bet.kind === "black" || bet.kind === "even" || bet.kind === "odd";
}
function rouletteColor(number) {
    if (number === 0)
        return "green";
    return exports.ROULETTE_RED.has(number) ? "red" : "black";
}
/** Cuánto paga (× apuesta, incluida la apuesta) si sale `number`: 2 por color o paridad, 36 por número. El 0 pierde todo menos el número 0. */
function rouletteMultiplier(bet, number) {
    if (bet.kind === "number")
        return bet.number === number ? 36 : 0;
    if (number === 0)
        return 0;
    if (bet.kind === "red" || bet.kind === "black")
        return rouletteColor(number) === bet.kind ? 2 : 0;
    return (number % 2 === 0) === (bet.kind === "even") ? 2 : 0;
}
function rouletteBetLabel(bet) {
    if (bet.kind === "number")
        return `al ${bet.number}`;
    return { red: "al rojo", black: "al negro", even: "a par", odd: "a impar" }[bet.kind];
}
// --- Blackjack ---------------------------------------------------------------------------------
exports.CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
exports.CARD_SUITS = ["♠", "♥", "♦", "♣"];
/** Valor de una mano: los ases valen 11 o 1, lo que más convenga sin pasarse de 21. */
function handValue(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
        if (card.rank === "A") {
            aces += 1;
            total += 11;
        }
        else if (card.rank === "J" || card.rank === "Q" || card.rank === "K")
            total += 10;
        else
            total += Number(card.rank);
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    return total;
}
function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards) === 21;
}
/** Blackjack de entrada paga 3 a 2 (la apuesta más 1,5 veces); ganar normal, 2 veces; empate devuelve. */
exports.BLACKJACK_NATURAL = 2.5;
/** El crupier pide hasta llegar a esto (se planta en 17). */
exports.DEALER_STANDS_ON = 17;
//# sourceMappingURL=casino.js.map