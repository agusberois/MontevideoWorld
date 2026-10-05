import type { TileRect } from "./cities/types";
import { TICKET_ID } from "./items";

/**
 * Primeros pasos: "Bienvenido a Montevideo". Una guía corta que lleva al jugador por lo que hace
 * único al juego. Cada paso es un **objetivo** genérico (llegar a un lugar, comer algo, pescar,
 * vender, viajar): el server lo marca cumplido mirando lo que el jugador hace de verdad
 * (`systems/tutorial.ts`), así los premios no se pueden pedir desde el cliente. Las changas del día
 * pueden usar los mismos objetivos.
 */

/** Lo que hay que hacer en un paso. */
export type TutorialGoal =
  /** Llegar a `within` tiles (o menos) del área, en ese barrio. */
  | { kind: "reach"; cityId: string; area: TileRect; within: number }
  /** Comer (o tomar) este ítem. */
  | { kind: "eat"; itemId: string }
  /** Sacar algún pescado. */
  | { kind: "catch" }
  /** Venderle a esa tienda algo de esa categoría. */
  | { kind: "sell"; shopId: string; category: string }
  /** Viajar a otro barrio en ómnibus. */
  | { kind: "travel" };

/** Adónde apunta la flecha del mapa (un área de tiles de un barrio) y cómo se llama el lugar. */
export interface TutorialTarget {
  cityId: string;
  name: string;
  area: TileRect;
}

export interface TutorialStep {
  title: string;
  /** Qué hacer, en una o dos frases. */
  text: string;
  goal: TutorialGoal;
  /** Plata que da al cumplirlo (la primera vez; repetir la guía con `/guia` no paga). */
  reward: number;
  target: TutorialTarget;
  /**
   * Un paso previo con su texto: mientras falte `missingItemId` en la mochila, se muestra éste (p. ej. "comprá
   * el boleto" hasta tenerlo; después, "andá a la parada").
   */
  before?: { missingItemId: string; text: string; target: TutorialTarget };
}

const CIUDAD_VIEJA = "ciudad-vieja";

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: "El Monumento a Artigas",
    text: "Caminá hasta el Monumento a Artigas, en el medio de la Plaza Independencia. Tocá el piso para caminar.",
    goal: { kind: "reach", cityId: CIUDAD_VIEJA, area: { x: 62, y: 24, width: 3, height: 3 }, within: 2 },
    reward: 15,
    target: { cityId: CIUDAD_VIEJA, name: "Monumento a Artigas", area: { x: 62, y: 24, width: 3, height: 3 } },
  },
  {
    title: "Una torta frita",
    text: "Comprate una torta frita en el Kiosco de la Plaza y comela desde la mochila (H) o la barra rápida.",
    goal: { kind: "eat", itemId: "torta-frita" },
    reward: 15,
    target: { cityId: CIUDAD_VIEJA, name: "Kiosco de la Plaza", area: { x: 54, y: 18, width: 2, height: 2 } },
  },
  {
    title: "A pescar",
    text: "Andá a la Escollera Sarandí, pará en la punta y apretá F (o el botón Pescar) para tirar la caña.",
    goal: { kind: "catch" },
    reward: 20,
    target: { cityId: CIUDAD_VIEJA, name: "Escollera Sarandí", area: { x: 59, y: 46, width: 3, height: 3 } },
  },
  {
    title: "Al Mercado del Puerto",
    text: "Vendé lo que pescaste en la Pescadería del Mercado: ahí pagan el pescado a precio completo.",
    goal: { kind: "sell", shopId: "pescaderia-mercado", category: "fish" },
    reward: 20,
    target: { cityId: CIUDAD_VIEJA, name: "Pescadería del Mercado", area: { x: 8, y: 3, width: 5, height: 5 } },
  },
  {
    title: "Tomate el ómnibus",
    text: "Ya tenés boleto: andá a una parada (como la de la Plaza Independencia) y tomate el ómnibus a otro barrio.",
    goal: { kind: "travel" },
    reward: 30,
    target: { cityId: CIUDAD_VIEJA, name: "Parada Plaza Independencia", area: { x: 52, y: 37, width: 1, height: 1 } },
    before: {
      missingItemId: TICKET_ID,
      text: "Para viajar entre barrios hace falta un boleto STM: comprá uno en la Agencia STM, sobre la Rambla 25 de Agosto.",
      target: { cityId: CIUDAD_VIEJA, name: "Agencia STM", area: { x: 27, y: 3, width: 2, height: 2 } },
    },
  },
];

/** Prenda de regalo al terminar la guía (la primera vez): sólo se consigue así. */
export const TUTORIAL_GIFT_ID = "gorra-celeste";

/** Total en plata de la guía (para mostrarlo al empezar). */
export const TUTORIAL_TOTAL_REWARD = TUTORIAL_STEPS.reduce((sum, step) => sum + step.reward, 0);

/**
 * Estado de la guía de un jugador. Lo guarda el server con el progreso (`PlayerRecord.tutorial`) y
 * se lo manda sólo a él (`tutorial`).
 * - `active`: haciendo el paso `step` (0 = el primero).
 * - `done`: la terminó. `skipped`: la salteó (no vuelve a aparecer; `/guia` la vuelve a abrir).
 * - `replay`: la está repitiendo con `/guia`: los pasos no pagan ni hay regalo.
 */
export interface TutorialState {
  status: "active" | "done" | "skipped";
  step: number;
  replay: boolean;
}

export const NEW_TUTORIAL: TutorialState = { status: "active", step: 0, replay: false };

/** Lo que viene de un guardado (o de la red) convertido en un estado válido; sin guardado, la guía desde el principio. */
export function sanitizeTutorial(value: unknown): TutorialState {
  if (typeof value !== "object" || value === null) return { ...NEW_TUTORIAL };
  const { status, step, replay } = value as Record<string, unknown>;
  if (status !== "active" && status !== "done" && status !== "skipped") return { ...NEW_TUTORIAL };
  const index = Number.isInteger(step) && (step as number) >= 0 && (step as number) < TUTORIAL_STEPS.length ? (step as number) : 0;
  return { status, step: status === "active" ? index : 0, replay: replay === true };
}

/** Lo que hay que mostrar del paso ahora (texto y adónde apunta), según lo que tenga en la mochila. */
export function tutorialView(step: TutorialStep, itemIds: readonly string[]): { text: string; target: TutorialTarget } {
  if (step.before && !itemIds.includes(step.before.missingItemId)) return { text: step.before.text, target: step.before.target };
  return { text: step.text, target: step.target };
}
