/**
 * Límites por IP para entrar al juego (ver `CityRoom.onAuth`, que corre en el pedido HTTP de
 * matchmaking, antes de reservar el asiento):
 *
 * - **Conexiones abiertas**: hasta `MAX_CONNECTIONS_PER_IP` jugadores conectados a la vez desde una
 *   misma IP (cuenta desde que la sesión queda creada en `onJoin` hasta `onLeave`). Ojo con NAT: una
 *   casa, un colegio o un ciber comparten IP; 8 es un punto de partida, medirlo con jugadores reales.
 * - **Pedidos de entrada**: un balde de `JOIN_BURST` fichas que se recarga una cada
 *   `JOIN_REFILL_MS`. Cada reserva de asiento ocupa un lugar en la sala hasta 15 s aunque nunca se
 *   conecte: sin esto, una IP podría llenar todas las copias de un barrio a pedidos.
 *
 * - **Claves nuevas**: hasta `NEW_KEYS_PER_HOUR` claves **distintas** sin progreso guardado por IP
 *   en una hora. Cada clave que llega a guardarse es un registro más en `players.json` (para siempre
 *   si tiene progreso): sin esto, un script entraba con claves al azar, vendía la caña del kit y
 *   sumaba registros sin techo. Se cuentan distintas para que un jugador nuevo que viaja entre
 *   barrios (cada viaje es una entrada) no gaste el cupo.
 *
 * La IP sale de `X-Real-IP` / `X-Forwarded-For` (así la arma Colyseus): en producción Caddy tiene que
 * **pisar** `X-Real-IP` (`deploy/Caddyfile`), si no, cualquiera pone la que quiera. En memoria del
 * proceso, como `activeSessions` (una sola instancia).
 */

export const MAX_CONNECTIONS_PER_IP = 8;
const JOIN_BURST = 8;
const JOIN_REFILL_MS = 4000;
/** Cada cuánto se olvidan los baldes ya llenos (para que el `Map` no crezca con IPs viejas). */
const SWEEP_MS = 60_000;
/** Un aviso por IP cada tanto, para no llenar el log si alguien insiste. */
const WARN_EVERY_MS = 60_000;

const NEW_KEYS_PER_HOUR = 20;
const NEW_KEY_WINDOW_MS = 60 * 60 * 1000;

const connections = new Map<string, number>();
/** IP → clave nueva → cuándo se vio por primera vez (en la última hora). */
const newKeys = new Map<string, Map<string, number>>();
const joinBuckets = new Map<string, { tokens: number; at: number }>();
const lastWarned = new Map<string, number>();

/** IP del pedido tal como la da Colyseus (`context.ip`): la primera de la lista si vienen varias. */
export function clientIp(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() ? value.split(",")[0].trim() : "?";
}

/** ¿Puede entrar alguien más desde esta IP? Devuelve el motivo si no (y gasta una ficha si sí). */
export function admitJoin(ip: string, now = Date.now()): string | null {
  if ((connections.get(ip) ?? 0) >= MAX_CONNECTIONS_PER_IP) {
    warn(ip, now, `${MAX_CONNECTIONS_PER_IP} conexiones abiertas`);
    return "Hay demasiadas conexiones desde tu red. Cerrá alguna pestaña y probá de nuevo.";
  }
  const bucket = joinBuckets.get(ip) ?? { tokens: JOIN_BURST, at: now };
  bucket.tokens = Math.min(JOIN_BURST, bucket.tokens + (now - bucket.at) / JOIN_REFILL_MS);
  bucket.at = now;
  joinBuckets.set(ip, bucket);
  if (bucket.tokens < 1) {
    warn(ip, now, "demasiados pedidos de entrada");
    return "Demasiados intentos de entrar seguidos. Esperá unos segundos y probá de nuevo.";
  }
  bucket.tokens -= 1;
  return null;
}

/**
 * ¿Puede entrar con esta clave sin progreso guardado? Una clave ya vista en la última hora desde esa
 * IP no cuenta otra vez. Devuelve el motivo si no.
 */
export function admitNewKey(ip: string, key: string, now = Date.now()): string | null {
  const seen = newKeys.get(ip) ?? new Map<string, number>();
  for (const [other, at] of seen) if (now - at >= NEW_KEY_WINDOW_MS) seen.delete(other);
  if (!seen.has(key)) {
    if (seen.size >= NEW_KEYS_PER_HOUR) {
      warn(ip, now, `${NEW_KEYS_PER_HOUR} claves nuevas en una hora`);
      return "Entraron demasiados jugadores nuevos desde tu red. Probá de nuevo más tarde.";
    }
    seen.set(key, now);
  }
  newKeys.set(ip, seen);
  return null;
}

/** Quedó conectado (sesión creada en `onJoin`). */
export function connectionOpened(ip: string) {
  connections.set(ip, (connections.get(ip) ?? 0) + 1);
}

/** Se fue (`onLeave` de una sesión que se había abierto). */
export function connectionClosed(ip: string) {
  const left = (connections.get(ip) ?? 0) - 1;
  if (left > 0) connections.set(ip, left);
  else connections.delete(ip);
}

function warn(ip: string, now: number, reason: string) {
  if (now - (lastWarned.get(ip) ?? 0) < WARN_EVERY_MS) return;
  lastWarned.set(ip, now);
  console.warn(`[Conexiones] se rechazó una entrada desde ${ip}: ${reason}`);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of joinBuckets) {
    if (bucket.tokens + (now - bucket.at) / JOIN_REFILL_MS >= JOIN_BURST) joinBuckets.delete(ip);
  }
  for (const [ip, at] of lastWarned) if (now - at >= WARN_EVERY_MS) lastWarned.delete(ip);
  for (const [ip, seen] of newKeys) {
    for (const [key, at] of seen) if (now - at >= NEW_KEY_WINDOW_MS) seen.delete(key);
    if (seen.size === 0) newKeys.delete(ip);
  }
}, SWEEP_MS).unref();
