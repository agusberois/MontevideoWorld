import type { CityInfo } from "../types";

/**
 * Casino de Ciudad Vieja por dentro: se entra por la puerta del edificio (cualquiera, sin boleto).
 * Por ahora es el salón vacío; los juegos vienen después.
 */

/** Las tragamonedas, en fila contra la pared norte (x de cada una). */
const SLOTS = [4, 6, 8, 10, 12, 14];
const ROULETTE = { x: 5, y: 7, width: 3, height: 3 };
const BLACKJACK = { x: 12, y: 7, width: 3, height: 3 };

export const WIDTH = 20;
export const HEIGHT = 16;

export const CASINO_INFO = {
  id: "casino",
  name: "Casino Victoria Plaza",
  access: "door",
  indoor: true,
  description: "El casino Victoria Plaza: tragamonedas, ruleta y blackjack.",
  landmarks: [
    ...SLOTS.map((x, i) => ({ id: `tragamonedas-${i + 1}`, name: "Tragamonedas", description: "Máquina tragamonedas.", kind: "slotMachine" as const, area: { x, y: 2, width: 1, height: 1 } })),
    { id: "ruleta", name: "Ruleta", description: "Mesa de ruleta europea.", kind: "rouletteTable", area: ROULETTE },
    { id: "blackjack", name: "Blackjack", description: "Mesa de blackjack.", kind: "blackjackTable", area: BLACKJACK },
  ],
  shops: [
    ...SLOTS.map((x, i) => ({
      id: `slots-${i + 1}`,
      name: "Tragamonedas",
      description: "Apostá y tirá la palanca: tres iguales pagan.",
      area: { x, y: 2, width: 1, height: 1 },
      building: "none" as const,
      stock: [],
      buys: [],
      casino: "slots" as const,
    })),
    { id: "mesa-ruleta", name: "Ruleta", description: "Rojo, negro, par, impar o un número.", area: ROULETTE, building: "none", stock: [], buys: [], casino: "roulette" },
    { id: "mesa-blackjack", name: "Blackjack", description: "Llegá a 21 sin pasarte y ganale al crupier.", area: BLACKJACK, building: "none", stock: [], buys: [], casino: "blackjack" },
  ],
} satisfies CityInfo;
