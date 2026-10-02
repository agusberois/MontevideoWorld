/** Cárcel (COMCAR): reglas de `/ban` que comparten el server y el cliente. */

/** `/ban`: máximo de minutos de cárcel (una semana). */
export const MAX_BAN_MINUTES = 7 * 24 * 60;
/**
 * Código con el que el server rechaza entrar a un barrio a quien está preso: el cliente entra
 * entonces al COMCAR (`JAIL_CITY_ID`).
 */
export const JAILED_JOIN_CODE = 4030;
/** Código con el que se desconecta al preso que no fue al COMCAR cuando se lo mandó (cliente modificado). */
export const JAILED_KICK_CODE = 4003;
/** Cuánto se espera a que el preso viaje solo al COMCAR antes de desconectarlo. */
export const JAIL_TRAVEL_GRACE_MS = 15_000;

/** Tiempo de condena que queda, para mostrar: "4:05", "1 h 20 min", "2 días 3 h". */
export function formatJailLeft(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const hours = Math.floor(s / 3600);
  if (hours < 24) return `${hours} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} min`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "día" : "días"} ${hours % 24} h`;
}
