import { MessageType, TilePoint } from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, halt, standUp } from "../session";
import { stopActivities } from "./activities";
import type { MessageRoutes } from "./types";

/**
 * Seguir a otro jugador del barrio (clic en él → Seguir, o `/seguir <nombre>`): el que sigue camina
 * solo hasta quedar pegado al otro y lo vuelve a alcanzar cada vez que se mueve (`stepFollowers`,
 * cada tick). A quién sigue va en el Schema (`player.following`) para que el cliente lo muestre.
 * Cualquier otra acción (`halt`: caminar, sentarse, entrar a una tienda…) deja de seguir; si el otro
 * se va del barrio o se pone a volar, también, con aviso.
 */
export function followRoutes(room: CityRoom) {
  return {
    [MessageType.Follow]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (target) startFollowing(room, session, target);
    },
    [MessageType.Unfollow]: (session) => stopFollowing(room, session),
  } satisfies Partial<MessageRoutes>;
}

/** Empieza a seguir a `target` (avisa si no se puede). */
export function startFollowing(room: CityRoom, session: PlayerSession, target: PlayerSession) {
  const { player } = session;
  if (target === session) return room.notice(session, "No te podés seguir a vos mismo.");
  if (target.closed || target.player.flying) return room.notice(session, `${target.player.name} no está en el barrio.`);
  if (player.flying) return room.notice(session, "Volando no podés seguir a nadie: bajá primero (/god).");
  if (player.following === target.player.sessionId) return;
  halt(session);
  session.follow = { name: target.player.name, seen: null };
  player.following = target.player.sessionId;
  room.notice(session, `👣 Seguís a ${target.player.name}. Hacé clic en el piso (o /seguir) para dejar de seguirlo.`);
}

/** Deja de seguir (se queda donde está). */
export function stopFollowing(room: CityRoom, session: PlayerSession) {
  if (!session.follow) return;
  const { name } = session.follow;
  halt(session);
  room.notice(session, `Dejaste de seguir a ${name}.`);
}

/**
 * Cada tick (antes de mover a nadie): cada uno que sigue a alguien, si quedó lejos, busca camino
 * hasta pegarse a él. Sólo busca de nuevo si el otro cambió de tile (si no hay camino, espera a que
 * se mueva), y a lo sumo una vez por tick (como `oncePerTick`).
 */
export function stepFollowers(room: CityRoom) {
  for (const session of room.sessions.values()) {
    const follow = session.follow;
    if (!follow || session.closed) continue;
    const target = room.sessions.get(session.player.following);
    if (!target || target.closed || target.player.flying) {
      halt(session);
      room.notice(session, `${follow.name} se fue del barrio: dejaste de seguirlo.`);
      continue;
    }
    const { player } = session;
    const to: TilePoint = { x: target.player.x, y: target.player.y };
    const moved = !follow.seen || follow.seen.x !== to.x || follow.seen.y !== to.y;
    if (!moved) continue;
    if (room.map.isNextTo(to, player.x, player.y) || (player.x === to.x && player.y === to.y)) {
      // Ya está pegado: frena acá (no hace falta pisarle el tile).
      session.path = [];
      follow.seen = to;
      continue;
    }
    if (session.searchedThisTick) continue;
    session.searchedThisTick = true;
    follow.seen = to;
    const from = { x: player.x, y: player.y };
    // Si el otro está en un tile que no se camina (sentado en un banco, en el jacuzzi), hasta el de al lado.
    const walkable = room.map.isWalkable(to.x, to.y);
    const goal = walkable ? to : room.map.approachTile(to, from);
    if (!goal) continue;
    const path = room.map.findPath(from, goal);
    // Hasta el tile de antes del suyo: queda pegado, no encima.
    if (walkable) path.pop();
    if (path.length === 0) continue;
    stopActivities(session);
    standUp(player);
    session.pending = null;
    session.path = path;
  }
}
