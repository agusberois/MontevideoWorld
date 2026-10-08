"use strict";
/**
 * Métricas baratas del server para `/health`: cuánto tardan los ticks (de todas las salas) y qué
 * salas hay abiertas. Nada de alocar por tick: cada medición se escribe en un buffer circular fijo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveRooms = exports.tickMetrics = exports.TickStats = exports.SLOW_TICK_MS = void 0;
exports.round = round;
/** Un tick que tarda más que esto cuenta como lento (`slowTotal` en `/health`). */
exports.SLOW_TICK_MS = 20;
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
/** Duraciones de un tipo de tick (p. ej. el movimiento de jugadores), en una ventana reciente. */
class TickStats {
    constructor(name) {
        this.name = name;
        this.samples = new Float64Array(WINDOW_SAMPLES);
        this.count = 0;
        this.next = 0;
        this.slowTotal = 0;
        /** Ticks lentos en la ventana actual (desde `windowStart`) y el peor de ellos. */
        this.windowSlow = 0;
        this.windowWorst = 0;
        this.windowStart = 0;
        this.lastWarnAt = -Infinity;
    }
    /** Anotar un tick de `ms` (de la sala `roomLabel`, para el aviso). */
    record(ms, roomLabel) {
        this.samples[this.next] = ms;
        this.next = (this.next + 1) % WINDOW_SAMPLES;
        if (this.count < WINDOW_SAMPLES)
            this.count += 1;
        if (ms <= exports.SLOW_TICK_MS)
            return;
        this.slowTotal += 1;
        const now = Date.now();
        if (now - this.windowStart > SLOW_TICK_WINDOW_MS) {
            this.windowStart = now;
            this.windowSlow = 0;
            this.windowWorst = 0;
        }
        this.windowSlow += 1;
        this.windowWorst = Math.max(this.windowWorst, ms);
        if (this.windowSlow < SLOW_TICK_REPEAT && ms < VERY_SLOW_TICK_MS)
            return;
        if (now - this.lastWarnAt < SLOW_TICK_WINDOW_MS)
            return;
        console.warn(`[Métricas] tick de ${this.name} lento en ${roomLabel}: ${ms.toFixed(1)} ms ` +
            `(${this.windowSlow} de más de ${exports.SLOW_TICK_MS} ms en los últimos ${SLOW_TICK_WINDOW_MS / 1000} s, el peor ${this.windowWorst.toFixed(1)} ms)`);
        this.lastWarnAt = now;
        this.windowStart = now;
        this.windowSlow = 0;
        this.windowWorst = 0;
    }
    summary() {
        let total = 0;
        let max = 0;
        for (let i = 0; i < this.count; i++) {
            total += this.samples[i];
            if (this.samples[i] > max)
                max = this.samples[i];
        }
        return {
            samples: this.count,
            avgMs: this.count > 0 ? round(total / this.count) : 0,
            maxMs: round(max),
            slowTotal: this.slowTotal,
        };
    }
}
exports.TickStats = TickStats;
exports.tickMetrics = {
    /** `CityRoom.stepPlayers`: caminar, sentarse, llegar a tiendas y palmeras, energía (cada 250 ms). */
    players: new TickStats("jugadores"),
    /** `WeevilManager.tick` (cada 100 ms, sólo con picudos en la sala). */
    weevils: new TickStats("picudos"),
};
/** Salas abiertas en este proceso (se anotan al crearse y se borran al cerrarse). */
exports.liveRooms = new Set();
function round(ms) {
    return Math.round(ms * 100) / 100;
}
//# sourceMappingURL=metrics.js.map