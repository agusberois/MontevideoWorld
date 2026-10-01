import { MINUTES_PER_DAY, START_MINUTE } from "@montevideo-world/shared";
import { dayLengthMinutes } from "./env";

/**
 * Reloj del juego, global para todo el server (todos los barrios tienen la misma hora). No guarda
 * un contador que haya que avanzar: la hora sale de cuánto tiempo real pasó desde el último ajuste.
 */
export class GameClock {
  private baseMinute = START_MINUTE;
  private baseAt = Date.now();

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
}

export const gameClock = new GameClock(dayLengthMinutes());
