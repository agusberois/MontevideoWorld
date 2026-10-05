import { Door, MessageType, TRAVEL_TICKET_MS, TilePoint } from "@montevideo-world/shared";
import { issueTravelTicket } from "../../playerStore";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, halt, oncePerTick, standUp } from "../session";
import { stopActivities } from "./activities";
import type { MessageRoutes } from "./types";

/**
 * Puertas (las Termas del Donador: entrar desde Ciudad Vieja y salir) y el jacuzzi de adentro.
 * Cruzar una puerta es un viaje sin boleto: se guarda, se emite el pase con el tile de llegada y el
 * cliente cambia de sala (con un fundido, no con el ómnibus).
 */
export function doorRoutes(room: CityRoom) {
  return {
    /** Ir hasta la puerta y cruzarla (si ya está al lado, en el acto). Sólo si puede entrar. */
    [MessageType.DoorEnter]: oncePerTick(MessageType.DoorEnter, (session, message) => {
      const door = room.map.getDoor(message.doorId);
      if (!door) return;
      const why = doorBlocked(session, door);
      if (why) return room.notice(session, why);
      const { player } = session;
      stopActivities(session);
      if (room.map.isNearDoor(door, player.x, player.y)) {
        halt(session);
        return crossDoor(room, session, door);
      }
      const approach = room.map.doorApproach(door, { x: player.x, y: player.y });
      const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
      if (path.length === 0) return;
      halt(session);
      standUp(player);
      session.path = path;
      session.pending = { kind: "door", door };
    }),

    /** Clic en el jacuzzi: caminar hasta el borde del lugar libre más cercano y meterse al llegar. */
    [MessageType.JacuzziEnter]: oncePerTick(MessageType.JacuzziEnter, (session, message) => {
      const { player } = session;
      const jacuzzi = room.map.jacuzziAt(message.x, message.y);
      if (!jacuzzi) return;
      if (player.bathing && room.map.jacuzziAt(player.x, player.y) === jacuzzi) return;
      const from = { x: player.x, y: player.y };
      // El lugar libre más cercano (o el que tocó, si está libre).
      const free = jacuzzi.seats.filter((seat) => !isSeatTaken(room, seat, session));
      if (free.length === 0) return room.notice(session, "El jacuzzi está lleno: esperá que alguien salga.");
      const clicked = free.find((seat) => seat.x === message.x && seat.y === message.y);
      const seat = clicked ?? free.reduce((best, seat) => (distance(seat, from) < distance(best, from) ? seat : best));
      const approach = room.map.seatApproach(seat, from);
      if (!approach) return;
      stopActivities(session);
      const path = room.map.findPath(from, approach);
      const alreadyThere = player.x === approach.x && player.y === approach.y;
      if (path.length === 0 && !alreadyThere) return;
      halt(session);
      standUp(player);
      session.path = path;
      session.pending = { kind: "jacuzzi", seat };
    }),
  } satisfies Partial<MessageRoutes>;
}

/** Por qué no puede cruzar la puerta (null = puede). Las de las Termas: sólo donadores y el admin. */
export function doorBlocked(session: PlayerSession, door: Door): string | null {
  if (door.access === "donor" && !session.player.donor && !session.player.admin) {
    return "♥ El Hotel del Donador es sólo para los que donan al proyecto.";
  }
  if (!session.key) return "Para entrar, tu navegador tiene que permitir guardar datos del sitio.";
  return null;
}

/** Cruza la puerta: guarda, emite el pase (aparece en `door.to.at`) y el cliente cambia de sala. */
export function crossDoor(room: CityRoom, session: PlayerSession, door: Door) {
  if (!session.key) return;
  stopActivities(session);
  halt(session);
  standUp(session.player);
  room.savePlayer(session);
  issueTravelTicket(session.key, door.to.cityId, Date.now() + TRAVEL_TICKET_MS, Date.now(), { at: door.to.at });
  room.sendTo(session, MessageType.TravelApproved, { cityId: door.to.cityId, door: true });
}

/** Lo saca de una sala de acceso restringido (le sacaron el donador estando adentro). */
export function leaveRestricted(room: CityRoom, session: PlayerSession) {
  const exit = room.map.city.doors?.find((door) => !door.access);
  if (!exit) return;
  room.notice(session, "Ya no tenés acceso al Hotel del Donador: te acompañamos a la salida.");
  crossDoor(room, session, exit);
}

/** Al llegar al borde: se mete al jacuzzi si el lugar sigue libre (un tick después, como el banco). */
export function enterJacuzzi(room: CityRoom, session: PlayerSession, seat: TilePoint) {
  if (isSeatTaken(room, seat, session) || !room.map.isNextTo(seat, session.player.x, session.player.y)) return;
  session.player.x = seat.x;
  session.player.y = seat.y;
  session.player.bathing = true;
}

function isSeatTaken(room: CityRoom, seat: TilePoint, except: PlayerSession): boolean {
  for (const other of room.sessions.values()) {
    if (other !== except && other.player.bathing && other.player.x === seat.x && other.player.y === seat.y) return true;
  }
  return false;
}

function distance(a: TilePoint, b: TilePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
