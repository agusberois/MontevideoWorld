/**
 * Hora del juego. El server lleva un reloj global (`minuteOfDay`, 0–1439) que avanza solo; la luz
 * del barrio se deriva de la hora con `darknessAt`, igual en todos los clientes.
 */

export const MINUTES_PER_DAY = 24 * 60;

/** Duración por defecto de un día del juego, en minutos reales (1 hora del juego = 1 minuto real). */
export const DEFAULT_DAY_LENGTH_MINUTES = 24;

/** Hora a la que arranca el reloj cuando se inicia el server. */
export const START_MINUTE = 10 * 60;

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

/** Amanece entre estas horas (va aclarando) y oscurece entre las de atardecer. */
const DAWN_START = at(6);
const DAWN_END = at(7, 30);
const DUSK_START = at(18);
const DUSK_END = at(20, 30);

/** Atajos del panel de admin para mover el reloj. */
export const CLOCK_PRESETS = [
  { label: "Amanecer", phase: "dawn", minute: at(6, 30) },
  { label: "Mediodía", phase: "day", minute: at(12) },
  { label: "Atardecer", phase: "dusk", minute: at(19) },
  { label: "Noche", phase: "night", minute: at(22, 30) },
] as const;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** 0 = pleno día, 1 = noche cerrada. Transiciones suaves al amanecer y al atardecer. */
export function darknessAt(minuteOfDay: number): number {
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (m < DAWN_START || m >= DUSK_END) return 1;
  if (m < DAWN_END) return 1 - smoothstep((m - DAWN_START) / (DAWN_END - DAWN_START));
  if (m < DUSK_START) return 0;
  return smoothstep((m - DUSK_START) / (DUSK_END - DUSK_START));
}

/** "18:42" */
export function formatClock(minuteOfDay: number): string {
  const m = Math.floor(((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function isValidMinuteOfDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}
