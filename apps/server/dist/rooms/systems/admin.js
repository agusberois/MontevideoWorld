"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const shared_1 = require("@montevideo-world/shared");
const audit_1 = require("../../audit");
const gameClock_1 = require("../../gameClock");
const weather_1 = require("../../weather");
/** Sólo admins: reloj del juego, partido del Centenario, clima y el maker. Los demás se ignoran. */
function adminRoutes(room) {
    return {
        /** Mover el reloj del juego; desde ahí sigue solo y lo ven todos (Schema). */
        [shared_1.MessageType.AdminSetTime]: (session, message) => {
            (0, audit_1.auditAdmin)(session, room.label, `admin:time ${(0, shared_1.formatClock)(message.minuteOfDay)}`, session.player.admin);
            if (!session.player.admin)
                return;
            gameClock_1.gameClock.set(message.minuteOfDay);
            room.syncClock();
            room.broadcastSystem(`🕒 ${session.player.name} movió el reloj a las ${(0, shared_1.formatClock)(message.minuteOfDay)}`);
        },
        /**
         * Forzar el partido, para todos los barrios como el reloj. Cada sala lo copia al Schema en su
         * `syncClock` (a más tardar en un segundo); ésta, en el acto.
         */
        [shared_1.MessageType.AdminMatch]: (session, message) => {
            (0, audit_1.auditAdmin)(session, room.label, `admin:match ${message.mode} ${(0, audit_1.logText)(message.name ?? "")}`, session.player.admin);
            if (!session.player.admin || !gameClock_1.gameClock.forceMatch(message.mode, message.name))
                return;
            const text = message.mode === "on"
                ? `forzó el partido ${message.name}`
                : message.mode === "off"
                    ? "suspendió los partidos"
                    : "dejó los partidos según el horario";
            room.broadcastSystem(`⚽ ${session.player.name} ${text}`);
            room.syncClock();
        },
        /** Dejar el clima fijo o que vuelva a cambiar solo: para todos los barrios, como el partido. */
        [shared_1.MessageType.AdminWeather]: (session, message) => {
            (0, audit_1.auditAdmin)(session, room.label, `admin:weather ${message.mode}`, session.player.admin);
            if (!session.player.admin)
                return;
            weather_1.weather.force(message.mode);
            const text = message.mode === "auto" ? "dejó que el clima cambie solo" : `puso el clima en ${shared_1.WEATHERS[message.mode].name.toLowerCase()}`;
            room.broadcastSystem(`🌦️ ${session.player.name} ${text}`);
            room.syncClock();
        },
        [shared_1.MessageType.AdminNearbyRequest]: (session) => {
            if (!session.player.admin)
                return (0, audit_1.auditAdmin)(session, room.label, "admin:nearby", false);
            sendNearby(room, session);
        },
        /**
         * Maker: crea ítems del catálogo en la mochila propia o en la de un jugador cercano (se vuelve a
         * medir la distancia acá: la lista del cliente puede estar vieja). Las herramientas salen nuevas;
         * lo que no entra en la mochila no se crea. Queda en el log del server.
         */
        [shared_1.MessageType.AdminGive]: (session, message) => {
            const admin = session.player;
            const item = (0, shared_1.getItem)(message.itemId);
            if (!admin.admin) {
                (0, audit_1.auditAdmin)(session, room.label, `admin:give ${(0, audit_1.logText)(message.itemId, 40)} × ${message.quantity}`, false);
                return;
            }
            if (!item)
                return;
            const target = message.targetId ? room.sessions.get(message.targetId) : session;
            if (!target)
                return room.notice(session, "Ese jugador ya no está en el barrio.");
            const self = target === session;
            if (Math.max(Math.abs(target.player.x - admin.x), Math.abs(target.player.y - admin.y)) > shared_1.MAKER_RANGE) {
                sendNearby(room, session);
                return room.notice(session, `${target.player.name} se alejó: tiene que estar a ${shared_1.MAKER_RANGE} tiles o menos.`);
            }
            let made = 0;
            while (made < message.quantity && target.inventory.add(item.id))
                made += 1;
            if (made === 0)
                return room.notice(session, self ? "No tenés lugar en la mochila." : `${target.player.name} no tiene lugar en la mochila.`);
            room.markInventory(target);
            (0, audit_1.auditAdmin)(session, room.label, `admin:give ${made} × ${item.id} para ${self ? "sí mismo" : `${(0, audit_1.logText)(target.player.name)} (${target.client.sessionId})`}`);
            const what = `${made} × ${item.name}`;
            const full = made < message.quantity ? ` (${message.quantity - made} no entraron: mochila llena)` : "";
            if (self)
                return room.notice(session, `🛠️ Creaste ${what}${full}.`);
            room.notice(session, `🛠️ Le creaste ${what} a ${target.player.name}${full}.`);
            room.notice(target, `🎁 ${admin.name} te dio ${what}.`);
        },
    };
}
/** Maker: los jugadores a `MAKER_RANGE` tiles o menos, del más cerca al más lejos. */
function sendNearby(room, session) {
    const admin = session.player;
    if (!admin.admin)
        return;
    const players = [];
    for (const [sessionId, other] of room.sessions) {
        if (other === session)
            continue;
        const distance = Math.max(Math.abs(other.player.x - admin.x), Math.abs(other.player.y - admin.y));
        if (distance <= shared_1.MAKER_RANGE)
            players.push({ sessionId, name: other.player.name, distance });
    }
    players.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "es"));
    room.sendTo(session, shared_1.MessageType.AdminNearby, { players });
}
//# sourceMappingURL=admin.js.map