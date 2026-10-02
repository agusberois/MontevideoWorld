import { MINUTES_PER_DAY, Match, MatchMode, START_MINUTE, getMatch, matchAt } from "@montevideo-world/shared";
import { dayLengthMinutes } from "./env";

/**
 * Reloj del juego, global para todo el server (todos los barrios tienen la misma hora). No guarda
 * un contador que haya que avanzar: la hora sale de cuánto tiempo real pasó desde el último ajuste.
 */
export class GameClock {
  private baseMinute = START_MINUTE;
  private baseAt = Date.now();

  /** Partido forzado por el admin (global, como la hora): ver `MatchMode`. */
  private matchMode: MatchMode = "auto";
  private forcedMatch: Match | undefined;

  /** Milisegundos reales por minuto del juego. */
  private readonly msPerMinute: number;

  constructor(dayLengthRealMinutes: number) {
    this.msPerMinute = (dayLengthRealMinutes * 60_000) / MINUTES_PER_DAY;
  }

  /** Minuto del día actual (con decimales), 0 ≤ m < 1440. */
  minuteOfDay(now = Date.now()): number {
    const minute = this.baseMinute + (now - this.baseAt) / this.msPerMinute;
    return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  }

  /** Mover el reloj (admin): desde `minute` sigue avanzando solo. */
  set(minute: number) {
    this.baseMinute = minute;
    this.baseAt = Date.now();
  }

  /** El partido que se juega ahora: el del horario o el que forzó el admin. */
  currentMatch(): Match | undefined {
    if (this.matchMode === "on") return this.forcedMatch;
    if (this.matchMode === "off") return undefined;
    return matchAt(this.minuteOfDay());
  }

  getMatchMode(): MatchMode {
    return this.matchMode;
  }

  /** Forzar el partido (admin). Con "on" hace falta un partido de `MATCHES`; devuelve false si no. */
  forceMatch(mode: MatchMode, name?: string): boolean {
    const match = mode === "on" ? getMatch(name ?? "") : undefined;
    if (mode === "on" && !match) return false;
    this.matchMode = mode;
    this.forcedMatch = match;
    return true;
  }
}

export const gameClock = new GameClock(dayLengthMinutes());
