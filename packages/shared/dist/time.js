"use strict";
/**
 * Hora del juego. El server lleva un reloj global (`minuteOfDay`, 0–1439) que avanza solo; la luz
 * del barrio se deriva de la hora con `darknessAt`, igual en todos los clientes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOCK_PRESETS = exports.START_MINUTE = exports.DEFAULT_DAY_LENGTH_MINUTES = exports.MINUTES_PER_DAY = void 0;
exports.darknessAt = darknessAt;
exports.formatClock = formatClock;
exports.isValidMinuteOfDay = isValidMinuteOfDay;
exports.MINUTES_PER_DAY = 24 * 60;
/** Duración por defecto de un día del juego, en minutos reales (1 hora del juego = 1 minuto real). */
exports.DEFAULT_DAY_LENGTH_MINUTES = 24;
/** Hora a la que arranca el reloj cuando se inicia el server. */
exports.START_MINUTE = 10 * 60;
const at = (hours, minutes = 0) => hours * 60 + minutes;
/** Amanece entre estas horas (va aclarando) y oscurece entre las de atardecer. */
const DAWN_START = at(6);
const DAWN_END = at(7, 30);
const DUSK_START = at(18);
const DUSK_END = at(20, 30);
/** Atajos del panel de admin para mover el reloj. */
exports.CLOCK_PRESETS = [
    { label: "Amanecer", phase: "dawn", minute: at(6, 30) },
    { label: "Mediodía", phase: "day", minute: at(12) },
    { label: "Atardecer", phase: "dusk", minute: at(19) },
    { label: "Noche", phase: "night", minute: at(22, 30) },
];
function smoothstep(t) {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
}
/** 0 = pleno día, 1 = noche cerrada. Transiciones suaves al amanecer y al atardecer. */
function darknessAt(minuteOfDay) {
    const m = ((minuteOfDay % exports.MINUTES_PER_DAY) + exports.MINUTES_PER_DAY) % exports.MINUTES_PER_DAY;
    if (m < DAWN_START || m >= DUSK_END)
        return 1;
    if (m < DAWN_END)
        return 1 - smoothstep((m - DAWN_START) / (DAWN_END - DAWN_START));
    if (m < DUSK_START)
        return 0;
    return smoothstep((m - DUSK_START) / (DUSK_END - DUSK_START));
}
/** "18:42" */
function formatClock(minuteOfDay) {
    const m = Math.floor(((minuteOfDay % exports.MINUTES_PER_DAY) + exports.MINUTES_PER_DAY) % exports.MINUTES_PER_DAY);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function isValidMinuteOfDay(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < exports.MINUTES_PER_DAY;
}
//# sourceMappingURL=time.js.map