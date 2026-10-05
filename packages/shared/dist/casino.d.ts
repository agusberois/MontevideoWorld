/**
 * Casino (Ciudad Vieja): tragamonedas, ruleta y blackjack con la plata del juego. El server sortea y
 * paga (`apps/server/src/rooms/systems/casino.ts`); acá están las reglas y las tablas, iguales para
 * el panel. Todos los juegos dejan una ventaja chica a la casa: el casino saca plata de la economía,
 * no es una forma de ganarla.
 */
export type CasinoGame = "slots" | "roulette" | "blackjack";
/** Apuesta mínima y máxima (pesos enteros). */
export declare const CASINO_MIN_BET = 1;
export declare const CASINO_MAX_BET = 500;
export declare function isValidBet(bet: unknown): bet is number;
/** Símbolos de los rodillos, con su peso (más peso = sale más) y lo que paga el trío (× apuesta). */
export declare const SLOT_SYMBOLS: readonly [{
    readonly id: "cherry";
    readonly emoji: "🍒";
    readonly weight: 30;
    readonly triple: 8;
}, {
    readonly id: "lemon";
    readonly emoji: "🍋";
    readonly weight: 25;
    readonly triple: 14;
}, {
    readonly id: "grape";
    readonly emoji: "🍇";
    readonly weight: 20;
    readonly triple: 20;
}, {
    readonly id: "bell";
    readonly emoji: "🔔";
    readonly weight: 12;
    readonly triple: 40;
}, {
    readonly id: "star";
    readonly emoji: "⭐";
    readonly weight: 8;
    readonly triple: 80;
}, {
    readonly id: "seven";
    readonly emoji: "7️⃣";
    readonly weight: 5;
    readonly triple: 250;
}];
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number]["id"];
/** Dos cerezas (en cualquier lugar, sin trío) devuelven la apuesta. */
export declare const SLOT_TWO_CHERRIES = 1;
/** Un símbolo al azar según los pesos (`random` en [0, 1)). */
export declare function rollSlotSymbol(random: number): SlotSymbol;
/** Cuánto paga una tirada (× apuesta): el trío de su tabla, dos cerezas, o nada. */
export declare function slotsMultiplier(reels: readonly SlotSymbol[]): number;
/** Lo que devuelve la máquina en promedio por cada peso apostado (menos de 1: gana la casa). */
export declare function slotsReturnRate(): number;
export declare function slotEmoji(id: SlotSymbol): string;
export declare const ROULETTE_RED: ReadonlySet<number>;
export type RouletteBet = {
    kind: "red";
} | {
    kind: "black";
} | {
    kind: "even";
} | {
    kind: "odd";
} | {
    kind: "number";
    number: number;
};
export declare function isRouletteBet(value: unknown): value is RouletteBet;
export declare function rouletteColor(number: number): "red" | "black" | "green";
/** Cuánto paga (× apuesta, incluida la apuesta) si sale `number`: 2 por color o paridad, 36 por número. El 0 pierde todo menos el número 0. */
export declare function rouletteMultiplier(bet: RouletteBet, number: number): number;
export declare function rouletteBetLabel(bet: RouletteBet): string;
export declare const CARD_RANKS: readonly ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export declare const CARD_SUITS: readonly ["♠", "♥", "♦", "♣"];
export interface Card {
    rank: (typeof CARD_RANKS)[number];
    suit: (typeof CARD_SUITS)[number];
}
/** Valor de una mano: los ases valen 11 o 1, lo que más convenga sin pasarse de 21. */
export declare function handValue(cards: readonly Card[]): number;
export declare function isBlackjack(cards: readonly Card[]): boolean;
/** Blackjack de entrada paga 3 a 2 (la apuesta más 1,5 veces); ganar normal, 2 veces; empate devuelve. */
export declare const BLACKJACK_NATURAL = 2.5;
/** El crupier pide hasta llegar a esto (se planta en 17). */
export declare const DEALER_STANDS_ON = 17;
//# sourceMappingURL=casino.d.ts.map