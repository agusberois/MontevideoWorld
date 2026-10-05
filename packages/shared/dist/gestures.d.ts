/**
 * Gestos del avatar (tecla E o menú): los ven todos. El server pone `Player.gesture` y lo saca solo
 * al pasar `durationMs` (o antes, si camina, se sienta, pesca o vende); el cliente lo anima mientras
 * dura.
 */
export interface GestureDefinition {
    name: string;
    /** Lo que flota sobre la cabeza al empezar (lo ven todos). */
    cry: string;
    durationMs: number;
    /** Se puede hacer sentado en un banco (los que mueven las piernas o saltan, no). */
    seated: boolean;
}
export declare const GESTURES: {
    readonly mate: {
        readonly name: "Tomar mate";
        readonly cry: "🧉";
        readonly durationMs: 6000;
        readonly seated: true;
    };
    readonly candombe: {
        readonly name: "Bailar candombe";
        readonly cry: "🥁 ¡Candombe!";
        readonly durationMs: 5000;
        readonly seated: false;
    };
    readonly goal: {
        readonly name: "Festejar un gol";
        readonly cry: "⚽ ¡Goooool!";
        readonly durationMs: 3000;
        readonly seated: false;
    };
    readonly wave: {
        readonly name: "Saludar con la mano";
        readonly cry: "👋";
        readonly durationMs: 2500;
        readonly seated: true;
    };
    readonly clap: {
        readonly name: "Aplaudir";
        readonly cry: "👏";
        readonly durationMs: 3000;
        readonly seated: true;
    };
    readonly shush: {
        readonly name: "Pedir silencio";
        readonly cry: "🤫 ¡Shhh!";
        readonly durationMs: 3000;
        readonly seated: true;
    };
};
export type GestureId = keyof typeof GESTURES;
export declare const GESTURE_IDS: GestureId[];
export declare function isGestureId(value: unknown): value is GestureId;
/**
 * Gestos de a dos (desde el menú del jugador): uno invita, el otro acepta y los dos se animan juntos,
 * mirándose. Hay que estar al lado (`PAIR_GESTURE_RANGE`). `invite` es lo que lee el invitado
 * ("Juan quiere chocar los cinco"). En el Schema los dos llevan el mismo `gesture`, con
 * `gesturePartner` (el otro) y `gestureLead` (el que invitó: en el mate, el que convida).
 */
export interface PairGestureDefinition {
    name: string;
    invite: string;
    cry: string;
    durationMs: number;
}
export declare const PAIR_GESTURES: {
    readonly highFive: {
        readonly name: "Chocar los cinco";
        readonly invite: "quiere chocar los cinco con vos";
        readonly cry: "🙌";
        readonly durationMs: 2000;
    };
    readonly hug: {
        readonly name: "Dar un abrazo";
        readonly invite: "te quiere dar un abrazo";
        readonly cry: "🤗";
        readonly durationMs: 2800;
    };
    readonly shareMate: {
        readonly name: "Pasar el mate";
        readonly invite: "te convida un mate";
        readonly cry: "🧉";
        readonly durationMs: 5200;
    };
};
export type PairGestureId = keyof typeof PAIR_GESTURES;
export declare const PAIR_GESTURE_IDS: PairGestureId[];
export declare function isPairGestureId(value: unknown): value is PairGestureId;
/** Cualquier gesto que puede estar en `Player.gesture`. */
export type AnyGestureId = GestureId | PairGestureId;
/** Hasta cuántos tiles de distancia (en cualquier dirección) se puede invitar a un gesto de a dos. */
export declare const PAIR_GESTURE_RANGE = 1;
/** Cuánto dura la invitación a un gesto de a dos. */
export declare const PAIR_GESTURE_INVITE_MS = 15000;
/** Lo que flota y cuánto dura cualquier gesto (solo o de a dos). */
export declare function gestureInfo(id: AnyGestureId): {
    name: string;
    cry: string;
    durationMs: number;
};
//# sourceMappingURL=gestures.d.ts.map