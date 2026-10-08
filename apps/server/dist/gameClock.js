"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameClock = exports.GameClock = void 0;
const shared_1 = require("@montevideo-world/shared");
const env_1 = require("./env");
/**
 * Reloj del juego, global para todo el server (todos los barrios tienen la misma hora). No guarda
 * un contador que haya que avanzar: la hora sale de cuánto tiempo real pasó desde el último ajuste.
 */
class GameClock {
    constructor(dayLengthRealMinutes) {
        this.baseMinute = shared_1.START_MINUTE;
        this.baseAt = Date.now();
        /** Partido forzado por el admin (global, como la hora): ver `MatchMode`. */
        this.matchMode = "auto";
        this.msPerMinute = (dayLengthRealMinutes * 60_000) / shared_1.MINUTES_PER_DAY;
    }
    /** Minuto del día actual (con decimales), 0 ≤ m < 1440. */
    minuteOfDay(now = Date.now()) {
        const minute = this.baseMinute + (now - this.baseAt) / this.msPerMinute;
        return ((minute % shared_1.MINUTES_PER_DAY) + shared_1.MINUTES_PER_DAY) % shared_1.MINUTES_PER_DAY;
    }
    /** Mover el reloj (admin): desde `minute` sigue avanzando solo. */
    set(minute) {
        this.baseMinute = minute;
        this.baseAt = Date.now();
    }
    /** El partido que se juega ahora: el del horario o el que forzó el admin. */
    currentMatch() {
        if (this.matchMode === "on")
            return this.forcedMatch;
        if (this.matchMode === "off")
            return undefined;
        return (0, shared_1.matchAt)(this.minuteOfDay());
    }
    getMatchMode() {
        return this.matchMode;
    }
    /** Forzar el partido (admin). Con "on" hace falta un partido de `MATCHES`; devuelve false si no. */
    forceMatch(mode, name) {
        const match = mode === "on" ? (0, shared_1.getMatch)(name ?? "") : undefined;
        if (mode === "on" && !match)
            return false;
        this.matchMode = mode;
        this.forcedMatch = match;
        return true;
    }
}
exports.GameClock = GameClock;
exports.gameClock = new GameClock((0, env_1.dayLengthMinutes)());
//# sourceMappingURL=gameClock.js.map