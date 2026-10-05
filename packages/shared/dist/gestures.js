"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAIR_GESTURE_INVITE_MS = exports.PAIR_GESTURE_RANGE = exports.PAIR_GESTURE_IDS = exports.PAIR_GESTURES = exports.GESTURE_IDS = exports.GESTURES = void 0;
exports.isGestureId = isGestureId;
exports.isPairGestureId = isPairGestureId;
exports.gestureInfo = gestureInfo;
exports.GESTURES = {
    mate: { name: "Tomar mate", cry: "🧉", durationMs: 6000, seated: true },
    candombe: { name: "Bailar candombe", cry: "🥁 ¡Candombe!", durationMs: 5000, seated: false },
    goal: { name: "Festejar un gol", cry: "⚽ ¡Goooool!", durationMs: 3000, seated: false },
    wave: { name: "Saludar con la mano", cry: "👋", durationMs: 2500, seated: true },
    clap: { name: "Aplaudir", cry: "👏", durationMs: 3000, seated: true },
    shush: { name: "Pedir silencio", cry: "🤫 ¡Shhh!", durationMs: 3000, seated: true },
};
exports.GESTURE_IDS = Object.keys(exports.GESTURES);
function isGestureId(value) {
    return typeof value === "string" && Object.hasOwn(exports.GESTURES, value);
}
exports.PAIR_GESTURES = {
    highFive: { name: "Chocar los cinco", invite: "quiere chocar los cinco con vos", cry: "🙌", durationMs: 2000 },
    hug: { name: "Dar un abrazo", invite: "te quiere dar un abrazo", cry: "🤗", durationMs: 2800 },
    shareMate: { name: "Pasar el mate", invite: "te convida un mate", cry: "🧉", durationMs: 5200 },
};
exports.PAIR_GESTURE_IDS = Object.keys(exports.PAIR_GESTURES);
function isPairGestureId(value) {
    return typeof value === "string" && Object.hasOwn(exports.PAIR_GESTURES, value);
}
/** Hasta cuántos tiles de distancia (en cualquier dirección) se puede invitar a un gesto de a dos. */
exports.PAIR_GESTURE_RANGE = 1;
/** Cuánto dura la invitación a un gesto de a dos. */
exports.PAIR_GESTURE_INVITE_MS = 15_000;
/** Lo que flota y cuánto dura cualquier gesto (solo o de a dos). */
function gestureInfo(id) {
    return isPairGestureId(id) ? exports.PAIR_GESTURES[id] : exports.GESTURES[id];
}
//# sourceMappingURL=gestures.js.map