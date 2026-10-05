/**
 * Casino (Ciudad Vieja): tragamonedas, ruleta y blackjack con la plata del juego. El server sortea y
 * paga (`apps/server/src/rooms/systems/casino.ts`); acá están las reglas y las tablas, iguales para
 * el panel. Todos los juegos dejan una ventaja chica a la casa: el casino saca plata de la economía,
 * no es una forma de ganarla.
 */

export type CasinoGame = "slots" | "roulette" | "blackjack";

/** Apuesta mínima y máxima (pesos enteros). */
export const CASINO_MIN_BET = 1;
export const CASINO_MAX_BET = 500;

export function isValidBet(bet: unknown): bet is number {
  return Number.isSafeInteger(bet) && (bet as number) >= CASINO_MIN_BET && (bet as number) <= CASINO_MAX_BET;
}

// --- Tragamonedas ------------------------------------------------------------------------------

/** Símbolos de los rodillos, con su peso (más peso = sale más) y lo que paga el trío (× apuesta). */
export const SLOT_SYMBOLS = [
  { id: "cherry", emoji: "🍒", weight: 30, triple: 8 },
  { id: "lemon", emoji: "🍋", weight: 25, triple: 14 },
  { id: "grape", emoji: "🍇", weight: 20, triple: 20 },
  { id: "bell", emoji: "🔔", weight: 12, triple: 40 },
  { id: "star", emoji: "⭐", weight: 8, triple: 80 },
  { id: "seven", emoji: "7️⃣", weight: 5, triple: 250 },
] as const;

export type SlotSymbol = (typeof SLOT_SYMBOLS)[number]["id"];

/** Dos cerezas (en cualquier lugar, sin trío) devuelven la apuesta. */
export const SLOT_TWO_CHERRIES = 1;

const SLOT_TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

/** Un símbolo al azar según los pesos (`random` en [0, 1)). */
export function rollSlotSymbol(random: number): SlotSymbol {
  let left = random * SLOT_TOTAL_WEIGHT;
  for (const symbol of SLOT_SYMBOLS) {
    left -= symbol.weight;
    if (left < 0) return symbol.id;
  }
  return SLOT_SYMBOLS[0].id;
}

/** Cuánto paga una tirada (× apuesta): el trío de su tabla, dos cerezas, o nada. */
export function slotsMultiplier(reels: readonly SlotSymbol[]): number {
  const [a, b, c] = reels;
  if (a === b && b === c) return SLOT_SYMBOLS.find((symbol) => symbol.id === a)?.triple ?? 0;
  return reels.filter((reel) => reel === "cherry").length === 2 ? SLOT_TWO_CHERRIES : 0;
}

/** Lo que devuelve la máquina en promedio por cada peso apostado (menos de 1: gana la casa). */
export function slotsReturnRate(): number {
  const p = (id: SlotSymbol) => (SLOT_SYMBOLS.find((symbol) => symbol.id === id)?.weight ?? 0) / SLOT_TOTAL_WEIGHT;
  const triples = SLOT_SYMBOLS.reduce((sum, symbol) => sum + p(symbol.id) ** 3 * symbol.triple, 0);
  const cherry = p("cherry");
  const twoCherries = 3 * cherry * cherry * (1 - cherry) * SLOT_TWO_CHERRIES;
  return triples + twoCherries;
}

export function slotEmoji(id: SlotSymbol): string {
  return SLOT_SYMBOLS.find((symbol) => symbol.id === id)?.emoji ?? "❔";
}

// --- Ruleta (europea: 0 a 36) ------------------------------------------------------------------

export const ROULETTE_RED: ReadonlySet<number> = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteBet =
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "even" }
  | { kind: "odd" }
  | { kind: "number"; number: number };

export function isRouletteBet(value: unknown): value is RouletteBet {
  if (typeof value !== "object" || value === null) return false;
  const bet = value as { kind?: unknown; number?: unknown };
  if (bet.kind === "number") return Number.isInteger(bet.number) && (bet.number as number) >= 0 && (bet.number as number) <= 36;
  return bet.kind === "red" || bet.kind === "black" || bet.kind === "even" || bet.kind === "odd";
}

export function rouletteColor(number: number): "red" | "black" | "green" {
  if (number === 0) return "green";
  return ROULETTE_RED.has(number) ? "red" : "black";
}

/** Cuánto paga (× apuesta, incluida la apuesta) si sale `number`: 2 por color o paridad, 36 por número. El 0 pierde todo menos el número 0. */
export function rouletteMultiplier(bet: RouletteBet, number: number): number {
  if (bet.kind === "number") return bet.number === number ? 36 : 0;
  if (number === 0) return 0;
  if (bet.kind === "red" || bet.kind === "black") return rouletteColor(number) === bet.kind ? 2 : 0;
  return (number % 2 === 0) === (bet.kind === "even") ? 2 : 0;
}

export function rouletteBetLabel(bet: RouletteBet): string {
  if (bet.kind === "number") return `al ${bet.number}`;
  return { red: "al rojo", black: "al negro", even: "a par", odd: "a impar" }[bet.kind];
}

// --- Blackjack ---------------------------------------------------------------------------------

export const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export const CARD_SUITS = ["♠", "♥", "♦", "♣"] as const;

export interface Card {
  rank: (typeof CARD_RANKS)[number];
  suit: (typeof CARD_SUITS)[number];
}

/** Valor de una mano: los ases valen 11 o 1, lo que más convenga sin pasarse de 21. */
export function handValue(cards: readonly Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (card.rank === "J" || card.rank === "Q" || card.rank === "K") total += 10;
    else total += Number(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

/** Blackjack de entrada paga 3 a 2 (la apuesta más 1,5 veces); ganar normal, 2 veces; empate devuelve. */
export const BLACKJACK_NATURAL = 2.5;
/** El crupier pide hasta llegar a esto (se planta en 17). */
export const DEALER_STANDS_ON = 17;
