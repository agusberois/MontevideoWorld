import {
  CityOccupancy,
  JAILED_KICK_CODE,
  JAIL_CITY_ID,
  JAIL_TRAVEL_GRACE_MS,
  MessageType,
  SPAWN_CITY_ID,
  TICKET_ID,
  TRAVEL_TICKET_MS,
  formatJailLeft,
  whereToBuy,
} from "@montevideo-world/shared";
import { getCity } from "@montevideo-world/shared/cities";
import { bans } from "../../bans";
import { liveRooms } from "../../metrics";
import { issueTravelTicket, playerId } from "../../playerStore";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import { stopActivities } from "./activities";
import { teleport } from "./movement";
import { cancelTrade } from "./trading";
import type { MessageRoutes } from "./types";

/** Viajes entre barrios (con boleto STM) y la cárcel (`/ban`). */
export function travelRoutes(room: CityRoom) {
  return {
    /**
     * Viajar: el barrio existe y no es éste, hay clave (sin clave no se guarda la mochila y no se
     * podría llevar al otro barrio) y un boleto STM en la mochila (`TICKET_ID`, se compra en la
     * Agencia STM). Se gasta el boleto, se guarda el progreso y se emite el pase; el cliente sale y
     * entra al destino.
     */
    [MessageType.TravelRequest]: (session, message) => {
      const destination = getCity(message.cityId);
      if (!destination || destination.id === room.map.city.id) return;
      if (destination.hidden) return room.notice(session, `${destination.name} no está abierto por ahora.`);
      // A las Termas no se va en ómnibus: se entra por la puerta del edificio (sólo donadores).
      if (destination.access) return room.notice(session, `A ${destination.name} se entra por la puerta del edificio, en Ciudad Vieja.`);
      const jailedUntil = bans.until(session.key, session.player.name);
      if (jailedUntil) {
        return room.notice(session, `🚔 Estás preso: no podés ir a ningún lado. Te quedan ${formatJailLeft((jailedUntil - Date.now()) / 1000)}.`);
      }
      if (!session.key) return room.notice(session, "Para viajar, tu navegador tiene que permitir guardar datos del sitio.");
      if (!session.inventory.remove(TICKET_ID)) {
        return room.notice(session, `🚌 Necesitás un boleto STM para viajar. Se compran en ${whereToBuy(TICKET_ID)}.`);
      }
      room.markInventory(session);
      room.savePlayer(session);
      issueTravelTicket(session.key, destination.id, Date.now() + TRAVEL_TICKET_MS);
      room.sendTo(session, MessageType.TravelApproved, { cityId: destination.id });
    },

    /** Lista de barrios: cuántos juegan en cada uno ahora (todas las copias juntas). */
    [MessageType.CitiesRequest]: (session) => room.sendTo(session, MessageType.Cities, { cities: cityOccupancy() }),
  } satisfies Partial<MessageRoutes>;
}

/** Jugadores y salas abiertas por barrio, de todas las salas del proceso (`liveRooms`). */
export function cityOccupancy(): CityOccupancy[] {
  const byCity = new Map<string, CityOccupancy>();
  for (const source of liveRooms) {
    const { cityId, players } = source.stats();
    const entry = byCity.get(cityId) ?? { cityId, players: 0, copies: 0 };
    entry.players += players;
    entry.copies += 1;
    byCity.set(cityId, entry);
  }
  return [...byCity.values()];
}

/**
 * En el COMCAR, una vez por segundo: cuánto le queda a cada preso (`Player.jailLeft`, lo muestra el
 * cliente) y, al que cumplió (o liberó el admin), lo manda a Ciudad Vieja.
 */
export function updateJail(room: CityRoom) {
  if (room.map.city.id !== JAIL_CITY_ID) return;
  const now = Date.now();
  for (const session of room.sessions.values()) {
    const { player } = session;
    const until = bans.until(session.key, player.name, now);
    const left = until ? Math.ceil((until - now) / 1000) : 0;
    if (left === player.jailLeft) continue;
    const wasJailed = player.jailLeft > 0;
    player.jailLeft = left;
    if (!wasJailed || left > 0) continue;
    room.notice(session, "🔓 ¡Quedaste libre! Te llevan a Ciudad Vieja. Portate bien, eh.");
    room.broadcastSystem(`🔓 ${player.name} cumplió su condena y salió del COMCAR`);
    room.sendTo(session, MessageType.TravelApproved, { cityId: SPAWN_CITY_ID });
  }
}

/**
 * Preso al COMCAR (`/ban`) hasta `until` (0 = liberarlo). Se anota por clave y por nombre. Si no
 * está en el COMCAR, el cliente viaja solo (`travel:ok`); si no lo hace en `JAIL_TRAVEL_GRACE_MS`,
 * se lo desconecta (al volver a entrar, el server lo manda al COMCAR). Liberarlo estando adentro
 * lo resuelve `updateJail` en el próximo segundo.
 */
export function jail(room: CityRoom, session: PlayerSession, until: number) {
  const { player } = session;
  bans.set(session.key ? playerId(session.key) : null, player.name, until);
  room.savePlayer(session);
  if (room.map.city.id === JAIL_CITY_ID) {
    // Estaba de visita: lo meten adentro.
    const cell = until ? room.randomPrisonTile() : undefined;
    if (cell && !isInYard(room, session)) {
      teleport(session, cell);
      room.broadcastSystem(`🚔 Se llevaron preso a ${player.name}: pasó de visita a estar adentro`);
    }
    updateJail(room);
    if (until) room.notice(session, `🚔 Cambió tu condena: te quedan ${formatJailLeft((until - Date.now()) / 1000)}.`);
    return;
  }
  if (!until) return;
  stopActivities(session);
  cancelTrade(room, session, "leave");
  room.notice(session, `🚔 ¡Quedaste preso! Te llevan al COMCAR por ${formatJailLeft((until - Date.now()) / 1000)}.`);
  room.broadcastSystem(`🚔 Se llevaron preso a ${player.name} al COMCAR`);
  room.sendTo(session, MessageType.TravelApproved, { cityId: JAIL_CITY_ID });
  room.clock.setTimeout(() => {
    if (room.sessions.get(session.client.sessionId) === session) room.closeSession(session, JAILED_KICK_CODE);
  }, JAIL_TRAVEL_GRACE_MS);
}

/** ¿Está del lado de adentro de la cárcel? (camino posible hasta el patio). */
function isInYard(room: CityRoom, session: PlayerSession): boolean {
  const yard = room.prisonTiles[0];
  if (!yard) return false;
  const { x, y } = session.player;
  return (x === yard.x && y === yard.y) || room.map.findPath({ x, y }, yard).length > 0;
}
