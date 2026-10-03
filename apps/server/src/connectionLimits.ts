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

const connections = new Map<string, number>();
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
}, SWEEP_MS).unref();
