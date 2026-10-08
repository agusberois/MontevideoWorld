"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weather = exports.WeatherClock = void 0;
const shared_1 = require("@montevideo-world/shared");
const env_1 = require("./env");
/**
 * Clima del juego, global para todo el server como el reloj (`gameClock.ts`): todos los barrios
 * tienen el mismo. Cada clima dura unas horas del juego (`Weather.hours`) y después se sortea otro
 * (por `Weather.weight`, nunca el mismo seguido). No hace falta un timer: se avanza al preguntar.
 * El admin lo puede dejar fijo (`force`). Vive en memoria: al reiniciar el server arranca despejado.
 */
class WeatherClock {
    constructor(dayLengthRealMinutes, random = Math.random, now = Date.now()) {
        this.random = random;
        this.currentId = "clear";
        this.mode = "auto";
        this.msPerHour = (dayLengthRealMinutes * 60_000 * 60) / shared_1.MINUTES_PER_DAY;
        this.until = now + this.duration(shared_1.WEATHERS.clear);
    }
    /** El clima de ahora: el forzado por el admin o el que toca (sorteando los que vencieron). */
    current(now = Date.now()) {
        if (this.mode !== "auto")
            return shared_1.WEATHERS[this.mode];
        while (now >= this.until) {
            this.currentId = this.pickNext();
            this.until += this.duration(shared_1.WEATHERS[this.currentId]);
        }
        return shared_1.WEATHERS[this.currentId];
    }
    getMode() {
        return this.mode;
    }
    /** Dejar el clima fijo (admin) o, con "auto", que vuelva a cambiar solo desde el que está. */
    force(mode, now = Date.now()) {
        if (mode === "auto" && this.mode !== "auto") {
            this.currentId = this.mode;
            this.until = now + this.duration(shared_1.WEATHERS[this.currentId]);
        }
        this.mode = mode;
    }
    duration(weather) {
        const [min, max] = weather.hours;
        return (min + this.random() * (max - min)) * this.msPerHour;
    }
    pickNext() {
        const options = shared_1.WEATHER_IDS.filter((id) => id !== this.currentId);
        const total = options.reduce((sum, id) => sum + shared_1.WEATHERS[id].weight, 0);
        let roll = this.random() * total;
        for (const id of options) {
            roll -= shared_1.WEATHERS[id].weight;
            if (roll < 0)
                return id;
        }
        return options[options.length - 1];
    }
}
exports.WeatherClock = WeatherClock;
exports.weather = new WeatherClock((0, env_1.dayLengthMinutes)());
//# sourceMappingURL=weather.js.map