"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyTag = keyTag;
exports.logText = logText;
exports.auditJoin = auditJoin;
exports.auditAdmin = auditAdmin;
const playerStore_1 = require("./playerStore");
/**
 * Registro de auditoría en el log del server: quién entró y qué hizo cada admin (o quién intentó
 * algo de admin sin serlo). Cada línea dice quién (nombre, sessionId, IP y un hash corto de la clave:
 * identifica al jugador entre sesiones sin dejar la clave en el log) y dónde (barrio y copia).
 *
 * `[Join]  "Juan" (abc123, 1.2.3.4, clave 9f2c41d0 conocida) → ciudad-vieja#1 (roomId)`
 * `[Admin] "AGOSHO" (abc123, 1.2.3.4, clave 9f2c41d0) en ciudad-vieja#1 (roomId): /plata 500 Juan`
 * `[Admin] DENEGADO "Pepe" (…) en …: admin:give caña-pro × 1` (cliente modificado)
 */
/** Hash corto de la clave del jugador (las 8 primeras letras de su `playerId`), o "sin clave". */
function keyTag(key) {
    return key ? (0, playerStore_1.playerId)(key).slice(0, 8) : "sin clave";
}
/**
 * Texto que viene del cliente, listo para el log: entre comillas, recortado y con los caracteres
 * invisibles (marcas bidi, ancho cero) escapados, para que no puedan falsear ni dar vuelta la línea.
 */
function logText(text, max = 200) {
    return JSON.stringify(text.slice(0, max)).replace(/\p{Cf}/gu, (char) => `\\u${char.codePointAt(0).toString(16).padStart(4, "0")}`);
}
function who(session) {
    return `${logText(session.player.name)} (${session.client.sessionId}, ${session.ip}, clave ${keyTag(session.key)})`;
}
/** Entró un jugador: con qué clave (nueva = sin progreso guardado) y si es admin. */
function auditJoin(session, where, known) {
    const key = session.key ? `${known ? "conocida" : "nueva"}` : "";
    const admin = session.player.admin ? " ★admin" : "";
    console.log(`[Join] ${logText(session.player.name)} (${session.client.sessionId}, ${session.ip}, clave ${keyTag(session.key)}${key ? ` ${key}` : ""}) → ${where}${admin}`);
}
/**
 * Una acción de admin (`allowed`) o un intento sin serlo (`!allowed`: el cliente normal no manda
 * mensajes de admin si no lo es, así que suele ser un cliente modificado).
 */
function auditAdmin(session, where, action, allowed = true) {
    const line = `[Admin] ${allowed ? "" : "DENEGADO "}${who(session)} en ${where}: ${action}`;
    if (allowed)
        console.log(line);
    else
        console.warn(line);
}
//# sourceMappingURL=audit.js.map