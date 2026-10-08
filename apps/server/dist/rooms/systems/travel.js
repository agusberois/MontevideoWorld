"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.travelRoutes = travelRoutes;
exports.cityOccupancy = cityOccupancy;
exports.updateJail = updateJail;
exports.jail = jail;
const shared_1 = require("@montevideo-world/shared");
const cities_1 = require("@montevideo-world/shared/cities");
const bans_1 = require("../../bans");
const metrics_1 = require("../../metrics");
const playerStore_1 = require("../../playerStore");
const activities_1 = require("./activities");
const movement_1 = require("./movement");
const trading_1 = require("./trading");
/** Viajes entre barrios (con boleto STM) y la cárcel (`/ban`). */
function travelRoutes(room) {
    return {
        /**
         * Viajar: el barrio existe y no es éste, hay clave (sin clave no se guarda la mochila y no se
         * podría llevar al otro barrio) y un boleto STM en la mochila (`TICKET_ID`, se compra en la
         * Agencia STM). Se gasta el boleto, se guarda el progreso y se emite el pase; el cliente sale y
         * entra al destino.
         */
        [shared_1.MessageType.TravelRequest]: (session, message) => {
            const destination = (0, cities_1.getCity)(message.cityId);
            if (!destination || destination.id === room.map.city.id)
                return;
            if (destination.hidden)
                return room.notice(session, `${destination.name} no está abierto por ahora.`);
            // A las Termas no se va en ómnibus: se entra por la puerta del edificio (sólo donadores).
            if (destination.access)
                return room.notice(session, `A ${destination.name} se entra por la puerta del edificio, en Ciudad Vieja.`);
            const jailedUntil = bans_1.bans.until(session.key, session.player.name);
            if (jailedUntil) {
                return room.notice(session, `🚔 Estás preso: no podés ir a ningún lado. Te quedan ${(0, shared_1.formatJailLeft)((jailedUntil - Date.now()) / 1000)}.`);
            }
            if (!session.key)
                return room.notice(session, "Para viajar, tu navegador tiene que permitir guardar datos del sitio.");
            if (!session.inventory.remove(shared_1.TICKET_ID)) {
                return room.notice(session, `🚌 Necesitás un boleto STM para viajar. Se compran en ${(0, shared_1.whereToBuy)(shared_1.TICKET_ID)}.`);
            }
            room.markInventory(session);
            room.savePlayer(session);
            (0, playerStore_1.issueTravelTicket)(session.key, destination.id, Date.now() + shared_1.TRAVEL_TICKET_MS);
            room.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: destination.id });
        },
        /** Lista de barrios: cuántos juegan en cada uno ahora (todas las copias juntas). */
        [shared_1.MessageType.CitiesRequest]: (session) => room.sendTo(session, shared_1.MessageType.Cities, { cities: cityOccupancy() }),
    };
}
/** Jugadores y salas abiertas por barrio, de todas las salas del proceso (`liveRooms`). */
function cityOccupancy() {
    const byCity = new Map();
    for (const source of metrics_1.liveRooms) {
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
function updateJail(room) {
    if (room.map.city.id !== shared_1.JAIL_CITY_ID)
        return;
    const now = Date.now();
    for (const session of room.sessions.values()) {
        const { player } = session;
        const until = bans_1.bans.until(session.key, player.name, now);
        const left = until ? Math.ceil((until - now) / 1000) : 0;
        if (left === player.jailLeft)
            continue;
        const wasJailed = player.jailLeft > 0;
        player.jailLeft = left;
        if (!wasJailed || left > 0)
            continue;
        room.notice(session, "🔓 ¡Quedaste libre! Te llevan a Ciudad Vieja. Portate bien, eh.");
        room.broadcastSystem(`🔓 ${player.name} cumplió su condena y salió del COMCAR`);
        room.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: shared_1.SPAWN_CITY_ID });
    }
}
/**
 * Preso al COMCAR (`/ban`) hasta `until` (0 = liberarlo). Se anota por clave y por nombre. Si no
 * está en el COMCAR, el cliente viaja solo (`travel:ok`); si no lo hace en `JAIL_TRAVEL_GRACE_MS`,
 * se lo desconecta (al volver a entrar, el server lo manda al COMCAR). Liberarlo estando adentro
 * lo resuelve `updateJail` en el próximo segundo.
 */
function jail(room, session, until) {
    const { player } = session;
    bans_1.bans.set(session.key ? (0, playerStore_1.playerId)(session.key) : null, player.name, until);
    room.savePlayer(session);
    if (room.map.city.id === shared_1.JAIL_CITY_ID) {
        // Estaba de visita: lo meten adentro.
        const cell = until ? room.randomPrisonTile() : undefined;
        if (cell && !isInYard(room, session)) {
            (0, movement_1.teleport)(session, cell);
            room.broadcastSystem(`🚔 Se llevaron preso a ${player.name}: pasó de visita a estar adentro`);
        }
        updateJail(room);
        if (until)
            room.notice(session, `🚔 Cambió tu condena: te quedan ${(0, shared_1.formatJailLeft)((until - Date.now()) / 1000)}.`);
        return;
    }
    if (!until)
        return;
    (0, activities_1.stopActivities)(session);
    (0, trading_1.cancelTrade)(room, session, "leave");
    room.notice(session, `🚔 ¡Quedaste preso! Te llevan al COMCAR por ${(0, shared_1.formatJailLeft)((until - Date.now()) / 1000)}.`);
    room.broadcastSystem(`🚔 Se llevaron preso a ${player.name} al COMCAR`);
    room.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: shared_1.JAIL_CITY_ID });
    room.clock.setTimeout(() => {
        if (room.sessions.get(session.client.sessionId) === session)
            room.closeSession(session, shared_1.JAILED_KICK_CODE);
    }, shared_1.JAIL_TRAVEL_GRACE_MS);
}
/** ¿Está del lado de adentro de la cárcel? (camino posible hasta el patio). */
function isInYard(room, session) {
    const yard = room.prisonTiles[0];
    if (!yard)
        return false;
    const { x, y } = session.player;
    return (x === yard.x && y === yard.y) || room.map.findPath({ x, y }, yard).length > 0;
}
//# sourceMappingURL=travel.js.map