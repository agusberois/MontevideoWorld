/**
 * Probabilidades y mejoras dichas en palabras para el jugador: los textos de tiendas, mochila y
 * actividades no muestran porcentajes, sólo dan la idea (los números quedan para el log del server).
 */

/** Una probabilidad en palabras: "casi nunca", "de vez en cuando", "a veces", "seguido" o "muy seguido". */
export function oddsLabel(chance: number): string {
  if (chance < 0.05) return "casi nunca";
  if (chance <= 0.1) return "de vez en cuando";
  if (chance < 0.18) return "a veces";
  if (chance < 0.25) return "seguido";
  return "muy seguido";
}

/** Cuánto más rápido (`gain`: 0,2 = 20 % más), en palabras: "un poco más rápido" … "mucho más rápido". */
export function fasterLabel(gain: number): string {
  if (gain <= 0.1) return "un poco más rápido";
  if (gain <= 0.2) return "más rápido";
  if (gain <= 0.35) return "bastante más rápido";
  return "mucho más rápido";
}
