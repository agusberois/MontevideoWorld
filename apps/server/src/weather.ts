import { MINUTES_PER_DAY, WEATHERS, WEATHER_IDS, Weather, WeatherId, WeatherMode } from "@montevideo-world/shared";
import { dayLengthMinutes } from "./env";

/**
 * Clima del juego, global para todo el server como el reloj (`gameClock.ts`): todos los barrios
 * tienen el mismo. Cada clima dura unas horas del juego (`Weather.hours`) y después se sortea otro
 * (por `Weather.weight`, nunca el mismo seguido). No hace falta un timer: se avanza al preguntar.
 * El admin lo puede dejar fijo (`force`). Vive en memoria: al reiniciar el server arranca despejado.
 */
export class WeatherClock {
  private currentId: WeatherId = "clear";
  private until: number;
  private mode: WeatherMode = "auto";

  /** Milisegundos reales por hora del juego. */
  private readonly msPerHour: number;

  constructor(
    dayLengthRealMinutes: number,
    private readonly random: () => number = Math.random,
    now = Date.now(),
  ) {
    this.msPerHour = (dayLengthRealMinutes * 60_000 * 60) / MINUTES_PER_DAY;
    this.until = now + this.duration(WEATHERS.clear);
  }

  /** El clima de ahora: el forzado por el admin o el que toca (sorteando los que vencieron). */
  current(now = Date.now()): Weather {
    if (this.mode !== "auto") return WEATHERS[this.mode];
    while (now >= this.until) {
      this.currentId = this.pickNext();
      this.until += this.duration(WEATHERS[this.currentId]);
    }
    return WEATHERS[this.currentId];
  }

  getMode(): WeatherMode {
    return this.mode;
  }

  /** Dejar el clima fijo (admin) o, con "auto", que vuelva a cambiar solo desde el que está. */
  force(mode: WeatherMode, now = Date.now()) {
    if (mode === "auto" && this.mode !== "auto") {
      this.currentId = this.mode;
      this.until = now + this.duration(WEATHERS[this.currentId]);
    }
    this.mode = mode;
  }

  private duration(weather: Weather): number {
    const [min, max] = weather.hours;
    return (min + this.random() * (max - min)) * this.msPerHour;
  }

  private pickNext(): WeatherId {
    const options = WEATHER_IDS.filter((id) => id !== this.currentId);
    const total = options.reduce((sum, id) => sum + WEATHERS[id].weight, 0);
    let roll = this.random() * total;
    for (const id of options) {
      roll -= WEATHERS[id].weight;
      if (roll < 0) return id;
    }
    return options[options.length - 1];
  }
}

export const weather = new WeatherClock(dayLengthMinutes());
