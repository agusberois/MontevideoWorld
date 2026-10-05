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

export const GESTURES = {
  mate: { name: "Tomar mate", cry: "🧉", durationMs: 6000, seated: true },
  candombe: { name: "Bailar candombe", cry: "🥁 ¡Candombe!", durationMs: 5000, seated: false },
  goal: { name: "Festejar un gol", cry: "⚽ ¡Goooool!", durationMs: 3000, seated: false },
  wave: { name: "Saludar con la mano", cry: "👋", durationMs: 2500, seated: true },
  clap: { name: "Aplaudir", cry: "👏", durationMs: 3000, seated: true },
  shush: { name: "Pedir silencio", cry: "🤫 ¡Shhh!", durationMs: 3000, seated: true },
} as const satisfies Record<string, GestureDefinition>;

export type GestureId = keyof typeof GESTURES;

export const GESTURE_IDS = Object.keys(GESTURES) as GestureId[];

export function isGestureId(value: unknown): value is GestureId {
  return typeof value === "string" && Object.hasOwn(GESTURES, value);
}

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

export const PAIR_GESTURES = {
  highFive: { name: "Chocar los cinco", invite: "quiere chocar los cinco con vos", cry: "🙌", durationMs: 2000 },
  hug: { name: "Dar un abrazo", invite: "te quiere dar un abrazo", cry: "🤗", durationMs: 2800 },
  shareMate: { name: "Pasar el mate", invite: "te convida un mate", cry: "🧉", durationMs: 5200 },
} as const satisfies Record<string, PairGestureDefinition>;

export type PairGestureId = keyof typeof PAIR_GESTURES;

export const PAIR_GESTURE_IDS = Object.keys(PAIR_GESTURES) as PairGestureId[];

export function isPairGestureId(value: unknown): value is PairGestureId {
  return typeof value === "string" && Object.hasOwn(PAIR_GESTURES, value);
}

/** Cualquier gesto que puede estar en `Player.gesture`. */
export type AnyGestureId = GestureId | PairGestureId;

/** Hasta cuántos tiles de distancia (en cualquier dirección) se puede invitar a un gesto de a dos. */
export const PAIR_GESTURE_RANGE = 1;
/** Cuánto dura la invitación a un gesto de a dos. */
export const PAIR_GESTURE_INVITE_MS = 15_000;

/** Lo que flota y cuánto dura cualquier gesto (solo o de a dos). */
export function gestureInfo(id: AnyGestureId): { name: string; cry: string; durationMs: number } {
  return isPairGestureId(id) ? PAIR_GESTURES[id] : GESTURES[id];
}
