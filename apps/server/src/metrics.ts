/**
 * Métricas baratas del server para `/health`: cuánto tardan los ticks (de todas las salas) y qué
 * salas hay abiertas. Nada de alocar por tick: cada medición se escribe en un buffer circular fijo.
 */

/** Un tick que tarda más que esto cuenta como lento (`slowTotal` en `/health`). */
export const SLOW_TICK_MS = 20;
/**
 * Un tick lento suelto suele ser una pausa del GC o del sistema (medido: _scavenges_ de hasta ~18 ms
 * con 50 bots en una MacBook) y no dice nada del código. Se avisa en el log cuando se repiten
 * (`SLOW_TICK_REPEAT` en `SLOW_TICK_WINDOW_MS`) o cuando uno es muy lento (`VERY_SLOW_TICK_MS`), y
 * como mucho un aviso por tipo de tick cada `SLOW_TICK_WINDOW_MS`.
 */
const SLOW_TICK_REPEAT = 3;
const VERY_SLOW_TICK_MS = 100;
const SLOW_TICK_WINDOW_MS = 10_000;
/** Cuántas mediciones recientes se guardan por tipo de tick (todas las salas juntas). */
const WINDOW_SAMPLES = 1024;

export interface TickSummary {
  /** Mediciones en la ventana (las últimas `WINDOW_SAMPLES`). */
  samples: number;
  avgMs: number;
  maxMs: number;
  /** Ticks más lentos que `SLOW_TICK_MS` desde que arrancó el server. */
  slowTotal: number;
}

/** Duraciones de un tipo de tick (p. ej. el movimiento de jugadores), en una ventana reciente. */
export class TickStats {
  private readonly samples = new Float64Array(WINDOW_SAMPLES);
  private count = 0;
  private next = 0;
  private slowTotal = 0;
  /** Ticks lentos en la ventana actual (desde `windowStart`) y el peor de ellos. */
  private windowSlow = 0;
  private windowWorst = 0;
  private windowStart = 0;
  private lastWarnAt = -Infinity;

  constructor(private readonly name: string) {}

  /** Anotar un tick de `ms` (de la sala `roomLabel`, para el aviso). */
  record(ms: number, roomLabel: string) {
    this.samples[this.next] = ms;
    this.next = (this.next + 1) % WINDOW_SAMPLES;
    if (this.count < WINDOW_SAMPLES) this.count += 1;
    if (ms <= SLOW_TICK_MS) return;

    this.slowTotal += 1;
    const now = Date.now();
    if (now - this.windowStart > SLOW_TICK_WINDOW_MS) {
      this.windowStart = now;
      this.windowSlow = 0;
      this.windowWorst = 0;
    }
    this.windowSlow += 1;
    this.windowWorst = Math.max(this.windowWorst, ms);
    if (this.windowSlow < SLOW_TICK_REPEAT && ms < VERY_SLOW_TICK_MS) return;
    if (now - this.lastWarnAt < SLOW_TICK_WINDOW_MS) return;
    console.warn(
      `[Métricas] tick de ${this.name} lento en ${roomLabel}: ${ms.toFixed(1)} ms ` +
        `(${this.windowSlow} de más de ${SLOW_TICK_MS} ms en los últimos ${SLOW_TICK_WINDOW_MS / 1000} s, el peor ${this.windowWorst.toFixed(1)} ms)`,
    );
    this.lastWarnAt = now;
    this.windowStart = now;
    this.windowSlow = 0;
    this.windowWorst = 0;
  }

  summary(): TickSummary {
    let total = 0;
    let max = 0;
    for (let i = 0; i < this.count; i++) {
      total += this.samples[i];
      if (this.samples[i] > max) max = this.samples[i];
    }
    return {
      samples: this.count,
      avgMs: this.count > 0 ? round(total / this.count) : 0,
      maxMs: round(max),
      slowTotal: this.slowTotal,
    };
  }
}

export const tickMetrics = {
  /** `CityRoom.stepPlayers`: caminar, sentarse, llegar a tiendas y palmeras, energía (cada 250 ms). */
  players: new TickStats("jugadores"),
  /** `WeevilManager.tick` (cada 100 ms, sólo con picudos en la sala). */
  weevils: new TickStats("picudos"),
};

/** Lo que cada sala cuenta de sí misma en `/health`. */
export interface RoomStats {
  roomId: string;
  cityId: string;
  /** Número de copia del barrio (1 = la primera; ver `GameState.copy`). */
  copy: number;
  players: number;
  weevils: number;
  /** Mensajes descartados por el límite de frecuencia y clientes desconectados por abusar. */
  rateLimited: number;
  kicked: number;
}

export interface RoomStatsSource {
  stats(): RoomStats;
}

/** Salas abiertas en este proceso (se anotan al crearse y se borran al cerrarse). */
export const liveRooms = new Set<RoomStatsSource>();

export function round(ms: number) {
  return Math.round(ms * 100) / 100;
}
