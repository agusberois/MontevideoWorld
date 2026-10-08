"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doorRoutes = doorRoutes;
exports.doorBlocked = doorBlocked;
exports.crossDoor = crossDoor;
exports.leaveRestricted = leaveRestricted;
exports.enterJacuzzi = enterJacuzzi;
const shared_1 = require("@montevideo-world/shared");
const cities_1 = require("@montevideo-world/shared/cities");
const playerStore_1 = require("../../playerStore");
const session_1 = require("../session");
const activities_1 = require("./activities");
/**
 * Puertas (las Termas del Donador y el casino: entrar desde Ciudad Vieja y salir; los bordes de 18
 * de Julio entre Ciudad Vieja y el Centro) y el jacuzzi de adentro.
 * Cruzar una puerta es un viaje sin boleto: se guarda, se emite el pase con el tile de llegada y el
 * cliente cambia de sala (con un fundido, no con el ómnibus).
 */
function doorRoutes(room) {
    return {
        /** Ir hasta la puerta y cruzarla (si ya está al lado, en el acto). Sólo si puede entrar. */
        [shared_1.MessageType.DoorEnter]: (0, session_1.oncePerTick)(shared_1.MessageType.DoorEnter, (session, message) => {
            const door = room.map.getDoor(message.doorId);
            if (!door)
                return;
            const why = doorBlocked(session, door);
            if (why)
                return room.notice(session, why);
            const { player } = session;
            (0, activities_1.stopActivities)(session);
            if (room.map.isNearDoor(door, player.x, player.y)) {
                (0, session_1.halt)(session);
                return crossDoor(room, session, door);
            }
            const approach = room.map.doorApproach(door, { x: player.x, y: player.y });
            const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
            if (path.length === 0)
                return;
            (0, session_1.halt)(session);
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "door", door };
        }),
        /** Clic en el jacuzzi: caminar hasta el borde del lugar libre más cercano y meterse al llegar. */
        [shared_1.MessageType.JacuzziEnter]: (0, session_1.oncePerTick)(shared_1.MessageType.JacuzziEnter, (session, message) => {
            const { player } = session;
            const jacuzzi = room.map.jacuzziAt(message.x, message.y);
            if (!jacuzzi)
                return;
            if (player.bathing && room.map.jacuzziAt(player.x, player.y) === jacuzzi)
                return;
            const from = { x: player.x, y: player.y };
            // El lugar libre más cercano (o el que tocó, si está libre).
            const free = jacuzzi.seats.filter((seat) => !isSeatTaken(room, seat, session));
            if (free.length === 0 || isJacuzziFull(room, jacuzzi, session))
                return room.notice(session, jacuzziFullText);
            const clicked = free.find((seat) => seat.x === message.x && seat.y === message.y);
            const seat = clicked ?? free.reduce((best, seat) => (distance(seat, from) < distance(best, from) ? seat : best));
            const approach = room.map.seatApproach(seat, from);
            if (!approach)
                return;
            (0, activities_1.stopActivities)(session);
            const path = room.map.findPath(from, approach);
            const alreadyThere = player.x === approach.x && player.y === approach.y;
            if (path.length === 0 && !alreadyThere)
                return;
            (0, session_1.halt)(session);
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "jacuzzi", seat };
        }),
    };
}
/** Por qué no puede cruzar la puerta (null = puede). Las de las Termas: sólo donadores y el admin. */
function doorBlocked(session, door) {
    if (door.access === "donor" && !session.player.donor && !session.player.admin) {
        return "♥ El Hotel del Donador es sólo para los que donan al proyecto.";
    }
    if (!session.key)
        return "Para entrar, tu navegador tiene que permitir guardar datos del sitio.";
    return null;
}
/** Cruza la puerta: guarda, emite el pase (aparece en `door.to.at`) y el cliente cambia de sala. */
function crossDoor(room, session, door) {
    if (!session.key)
        return;
    (0, activities_1.stopActivities)(session);
    (0, session_1.halt)(session);
    (0, session_1.standUp)(session.player);
    room.savePlayer(session);
    (0, playerStore_1.issueTravelTicket)(session.key, door.to.cityId, Date.now() + shared_1.TRAVEL_TICKET_MS, Date.now(), { at: door.to.at });
    room.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: door.to.cityId, door: true, walk: door.edge });
}
/** Lo saca de una sala de acceso restringido (le sacaron el donador estando adentro). */
function leaveRestricted(room, session) {
    const exit = publicExit(room.map.city.doors ?? []);
    if (!exit)
        return;
    room.notice(session, "Ya no tenés acceso al Hotel del Donador: te acompañamos a la salida.");
    crossDoor(room, session, exit);
}
/**
 * La puerta a la calle (sin `access`). En un piso de arriba (el piso 2 del hotel) no hay: se usa la
 * de la planta baja a la que lleva su escalera, que deja en el mismo lugar de la calle.
 */
function publicExit(doors) {
    const exit = doors.find((door) => !door.access);
    if (exit)
        return exit;
    for (const door of doors) {
        const below = (0, cities_1.getCity)(door.to.cityId)?.doors?.find((other) => !other.access);
        if (below)
            return below;
    }
    return undefined;
}
/** Al llegar al borde: se mete al jacuzzi si el lugar sigue libre (un tick después, como el banco). */
function enterJacuzzi(room, session, seat) {
    if (isSeatTaken(room, seat, session) || !room.map.isNextTo(seat, session.player.x, session.player.y))
        return;
    const jacuzzi = room.map.jacuzziAt(seat.x, seat.y);
    if (!jacuzzi || isJacuzziFull(room, jacuzzi, session))
        return room.notice(session, jacuzziFullText);
    session.player.x = seat.x;
    session.player.y = seat.y;
    session.player.bathing = true;
    room.notice(session, "Estás en el jacuzzi: recargando energía, saciedad y salud.");
}
const jacuzziFullText = `El jacuzzi está lleno (${shared_1.JACUZZI_CAPACITY}/${shared_1.JACUZZI_CAPACITY}): esperá que alguien salga o probá en el otro.`;
/** ¿Ya hay `JACUZZI_CAPACITY` metidos en este jacuzzi (sin contar a `except`)? */
function isJacuzziFull(room, jacuzzi, except) {
    let inside = 0;
    for (const other of room.sessions.values()) {
        if (other !== except && other.player.bathing && room.map.jacuzziAt(other.player.x, other.player.y) === jacuzzi)
            inside++;
    }
    return inside >= shared_1.JACUZZI_CAPACITY;
}
function isSeatTaken(room, seat, except) {
    for (const other of room.sessions.values()) {
        if (other !== except && other.player.bathing && other.player.x === seat.x && other.player.y === seat.y)
            return true;
    }
    return false;
}
function distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
//# sourceMappingURL=doors.js.map