import { AdminNearbyMessage, MAKER_RANGE, MessageType, formatClock, getItem } from "@montevideo-world/shared";
import { auditAdmin, logText } from "../../audit";
import { gameClock } from "../../gameClock";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import type { MessageRoutes } from "./types";

/** Sólo admins: reloj del juego, partido del Centenario y el maker. Los demás se ignoran. */
export function adminRoutes(room: CityRoom) {
  return {
    /** Mover el reloj del juego; desde ahí sigue solo y lo ven todos (Schema). */
    [MessageType.AdminSetTime]: (session, message) => {
      auditAdmin(session, room.label, `admin:time ${formatClock(message.minuteOfDay)}`, session.player.admin);
      if (!session.player.admin) return;
      gameClock.set(message.minuteOfDay);
      room.syncClock();
      room.broadcastSystem(`🕒 ${session.player.name} movió el reloj a las ${formatClock(message.minuteOfDay)}`);
    },

    /**
     * Forzar el partido, para todos los barrios como el reloj. Cada sala lo copia al Schema en su
     * `syncClock` (a más tardar en un segundo); ésta, en el acto.
     */
    [MessageType.AdminMatch]: (session, message) => {
      auditAdmin(session, room.label, `admin:match ${message.mode} ${logText(message.name ?? "")}`, session.player.admin);
      if (!session.player.admin || !gameClock.forceMatch(message.mode, message.name)) return;
      const text =
        message.mode === "on"
          ? `forzó el partido ${message.name}`
          : message.mode === "off"
            ? "suspendió los partidos"
            : "dejó los partidos según el horario";
      room.broadcastSystem(`⚽ ${session.player.name} ${text}`);
      room.syncClock();
    },

    [MessageType.AdminNearbyRequest]: (session) => {
      if (!session.player.admin) return auditAdmin(session, room.label, "admin:nearby", false);
      sendNearby(room, session);
    },

    /**
     * Maker: crea ítems del catálogo en la mochila propia o en la de un jugador cercano (se vuelve a
     * medir la distancia acá: la lista del cliente puede estar vieja). Las herramientas salen nuevas;
     * lo que no entra en la mochila no se crea. Queda en el log del server.
     */
    [MessageType.AdminGive]: (session, message) => {
      const admin = session.player;
      const item = getItem(message.itemId);
      if (!admin.admin) {
        auditAdmin(session, room.label, `admin:give ${logText(message.itemId, 40)} × ${message.quantity}`, false);
        return;
      }
      if (!item) return;

      const target = message.targetId ? room.sessions.get(message.targetId) : session;
      if (!target) return room.notice(session, "Ese jugador ya no está en el barrio.");
      const self = target === session;
      if (Math.max(Math.abs(target.player.x - admin.x), Math.abs(target.player.y - admin.y)) > MAKER_RANGE) {
        sendNearby(room, session);
        return room.notice(session, `${target.player.name} se alejó: tiene que estar a ${MAKER_RANGE} tiles o menos.`);
      }

      let made = 0;
      while (made < message.quantity && target.inventory.add(item.id)) made += 1;
      if (made === 0) return room.notice(session, self ? "No tenés lugar en la mochila." : `${target.player.name} no tiene lugar en la mochila.`);
      room.markInventory(target);
      auditAdmin(session, room.label, `admin:give ${made} × ${item.id} para ${self ? "sí mismo" : `${logText(target.player.name)} (${target.client.sessionId})`}`);

      const what = `${made} × ${item.name}`;
      const full = made < message.quantity ? ` (${message.quantity - made} no entraron: mochila llena)` : "";
      if (self) return room.notice(session, `🛠️ Creaste ${what}${full}.`);
      room.notice(session, `🛠️ Le creaste ${what} a ${target.player.name}${full}.`);
      room.notice(target, `🎁 ${admin.name} te dio ${what}.`);
    },
  } satisfies Partial<MessageRoutes>;
}

/** Maker: los jugadores a `MAKER_RANGE` tiles o menos, del más cerca al más lejos. */
function sendNearby(room: CityRoom, session: PlayerSession) {
  const admin = session.player;
  if (!admin.admin) return;
  const players: AdminNearbyMessage["players"] = [];
  for (const [sessionId, other] of room.sessions) {
    if (other === session) continue;
    const distance = Math.max(Math.abs(other.player.x - admin.x), Math.abs(other.player.y - admin.y));
    if (distance <= MAKER_RANGE) players.push({ sessionId, name: other.player.name, distance });
  }
  players.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "es"));
  room.sendTo(session, MessageType.AdminNearby, { players });
}
