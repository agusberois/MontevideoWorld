import type { TileRect } from "./cities/types";
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
{
    kind: "reach";
    cityId: string;
    area: TileRect;
    within: number;
}
/** Comer (o tomar) este ítem. */
 | {
    kind: "eat";
    itemId: string;
}
/** Sacar algún pescado. */
 | {
    kind: "catch";
}
/** Venderle a esa tienda algo de esa categoría. */
 | {
    kind: "sell";
    shopId: string;
    category: string;
}
/** Viajar a otro barrio en ómnibus. */
 | {
    kind: "travel";
};
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
    before?: {
        missingItemId: string;
        text: string;
        target: TutorialTarget;
    };
}
export declare const TUTORIAL_STEPS: readonly TutorialStep[];
/** Prenda de regalo al terminar la guía (la primera vez): sólo se consigue así. */
export declare const TUTORIAL_GIFT_ID = "gorra-celeste";
/** Total en plata de la guía (para mostrarlo al empezar). */
export declare const TUTORIAL_TOTAL_REWARD: number;
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
export declare const NEW_TUTORIAL: TutorialState;
/** Lo que viene de un guardado (o de la red) convertido en un estado válido; sin guardado, la guía desde el principio. */
export declare function sanitizeTutorial(value: unknown): TutorialState;
/** Lo que hay que mostrar del paso ahora (texto y adónde apunta), según lo que tenga en la mochila. */
export declare function tutorialView(step: TutorialStep, itemIds: readonly string[]): {
    text: string;
    target: TutorialTarget;
};
//# sourceMappingURL=tutorial.d.ts.map