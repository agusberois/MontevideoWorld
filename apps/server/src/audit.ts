import { playerId } from "./playerStore";
import type { PlayerSession } from "./rooms/session";

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
export function keyTag(key: string | null): string {
  return key ? playerId(key).slice(0, 8) : "sin clave";
}

/**
 * Texto que viene del cliente, listo para el log: entre comillas, recortado y con los caracteres
 * invisibles (marcas bidi, ancho cero) escapados, para que no puedan falsear ni dar vuelta la línea.
 */
export function logText(text: string, max = 200): string {
  return JSON.stringify(text.slice(0, max)).replace(/\p{Cf}/gu, (char) => `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`);
}

function who(session: PlayerSession): string {
  return `${logText(session.player.name)} (${session.client.sessionId}, ${session.ip}, clave ${keyTag(session.key)})`;
}

/** Entró un jugador: con qué clave (nueva = sin progreso guardado) y si es admin. */
export function auditJoin(session: PlayerSession, where: string, known: boolean) {
  const key = session.key ? `${known ? "conocida" : "nueva"}` : "";
  const admin = session.player.admin ? " ★admin" : "";
  console.log(
    `[Join] ${logText(session.player.name)} (${session.client.sessionId}, ${session.ip}, clave ${keyTag(session.key)}${key ? ` ${key}` : ""}) → ${where}${admin}`,
  );
}

/**
 * Una acción de admin (`allowed`) o un intento sin serlo (`!allowed`: el cliente normal no manda
 * mensajes de admin si no lo es, así que suele ser un cliente modificado).
 */
export function auditAdmin(session: PlayerSession, where: string, action: string, allowed = true) {
  const line = `[Admin] ${allowed ? "" : "DENEGADO "}${who(session)} en ${where}: ${action}`;
  if (allowed) console.log(line);
  else console.warn(line);
}
