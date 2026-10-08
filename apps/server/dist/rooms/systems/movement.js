"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementRoutes = movementRoutes;
exports.isBenchTaken = isBenchTaken;
exports.teleport = teleport;
exports.startFlying = startFlying;
exports.land = land;
exports.stepPlayers = stepPlayers;
const shared_1 = require("@montevideo-world/shared");
const session_1 = require("../session");
const activities_1 = require("./activities");
const doors_1 = require("./doors");
const follow_1 = require("./follow");
const gestures_1 = require("./gestures");
const shops_1 = require("./shops");
const welcome_1 = require("./welcome");
/** Caminar, sentarse, sacudir palmeras y patear picudos; el paso de cada tick (`stepPlayers`). */
function movementRoutes(room) {
    return {
        [shared_1.MessageType.Move]: (0, session_1.oncePerTick)(shared_1.MessageType.Move, (session, message) => {
            const { player } = session;
            // Volando (`/god`): en línea recta a cualquier tile del mapa, por arriba de todo.
            if (player.flying) {
                if (!room.map.inBounds(message.x, message.y))
                    return;
                (0, session_1.halt)(session);
                session.path = room.map.flightPath({ x: player.x, y: player.y }, message, shared_1.GOD_FLIGHT_TILES);
                return;
            }
            if (!room.map.isWalkable(message.x, message.y))
                return;
            // Cualquier otra acción recoge la línea (o deja de vender).
            (0, activities_1.stopActivities)(session);
            // El recorrido que propone el cliente (el que ya está mostrando), si arranca desde acá y es
            // válido paso a paso; si no, el camino más corto. Igual se avanza un tile por tick: no da ventaja.
            const from = { x: player.x, y: player.y };
            const target = { x: message.x, y: message.y };
            const route = message.path ? room.map.followRoute(from, message.path.slice(0, shared_1.MAX_ROUTE_LENGTH)) : null;
            let path = route ?? room.map.findPath(from, target);
            // Si el recorrido no llega al destino (se cortó o se invalidó a mitad), el resto lo completa el server.
            const end = path[path.length - 1] ?? from;
            if (route && (end.x !== target.x || end.y !== target.y))
                path = [...path, ...room.map.findPath(end, target)];
            // Caminar a otro lado cancela sentarse, ir a una tienda o a una palmera. Clic en el propio tile
            // o destino inalcanzable: frena donde está.
            (0, session_1.halt)(session);
            if (path.length === 0)
                return;
            (0, session_1.standUp)(player);
            session.path = path;
        }),
        /** Clic en un banco: caminar hasta enfrente y sentarse al llegar (si sigue libre). */
        [shared_1.MessageType.Sit]: (0, session_1.oncePerTick)(shared_1.MessageType.Sit, (session, message) => {
            const { player } = session;
            const bench = room.map.benchAt(message.x, message.y);
            if (!bench || isBenchTaken(room, bench, session))
                return;
            (0, activities_1.stopActivities)(session);
            if (player.sitting && player.x === bench.x && player.y === bench.y)
                return;
            const approach = room.map.benchApproach(bench);
            if (!approach)
                return;
            const path = room.map.findPath({ x: player.x, y: player.y }, approach);
            const alreadyThere = player.x === approach.x && player.y === approach.y;
            if (path.length === 0 && !alreadyThere)
                return;
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "bench", bench };
        }),
        /** Clic en una palmera: si está al lado la sacude; si no, camina hasta ella y la sacude al llegar. */
        [shared_1.MessageType.PalmShake]: (0, session_1.oncePerTick)(shared_1.MessageType.PalmShake, (session, message) => {
            const { player } = session;
            if (!room.map.isPalm(message.x, message.y))
                return;
            const palm = { x: message.x, y: message.y };
            (0, activities_1.stopActivities)(session);
            if (room.map.isNextTo(palm, player.x, player.y)) {
                (0, session_1.halt)(session);
                return shakePalm(room, session, palm);
            }
            const approach = room.map.approachTile(palm, { x: player.x, y: player.y });
            const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
            if (path.length === 0)
                return;
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "palm", palm };
        }),
        /** Patada a un picudo: hay que estar cerca. Aplastarlo paga `WEEVIL_REWARD`. */
        [shared_1.MessageType.WeevilKick]: (session, message) => {
            const { player } = session;
            const result = room.weevils.kick(message.id, { x: player.x, y: player.y }, Date.now());
            if (result === "far")
                return room.notice(session, "Está lejos: acercate para patearlo.");
            if (result !== "killed")
                return;
            player.kicks += 1;
            if (session.wallet.credit(shared_1.WEEVIL_REWARD))
                room.markWallet(session);
        },
    };
}
function shakePalm(room, session, palm) {
    if (room.weevils.shake(palm, Date.now()) === 0) {
        room.notice(session, "La palmera está tranquila por ahora: probá en un rato.");
    }
}
function isBenchTaken(room, bench, except) {
    for (const other of room.sessions.values()) {
        if (other !== except && other.player.sitting && other.player.x === bench.x && other.player.y === bench.y)
            return true;
    }
    return false;
}
/** Lleva al jugador a `tile` de golpe: corta lo que estaba haciendo (caminar, sentarse, pescar…). */
function teleport(session, tile) {
    (0, activities_1.stopActivities)(session);
    (0, session_1.halt)(session);
    (0, session_1.standUp)(session.player);
    session.player.x = tile.x;
    session.player.y = tile.y;
}
/** `/god`: deja lo que hacía y empieza a volar (los demás clientes dejan de dibujarlo). */
function startFlying(room, session) {
    (0, activities_1.stopActivities)(session);
    (0, session_1.halt)(session);
    (0, session_1.standUp)(session.player);
    session.player.flying = true;
    room.notice(session, "🕊️ Estás volando: nadie te ve. Hacé clic adonde quieras ir; /god otra vez para bajar.");
}
/** Baja del vuelo en la baldosa caminable más cercana y vuelve a ser visible. */
function land(room, session) {
    const { player } = session;
    (0, session_1.halt)(session);
    const tile = room.map.nearestWalkable({ x: player.x, y: player.y });
    if (tile) {
        player.x = tile.x;
        player.y = tile.y;
    }
    player.flying = false;
    room.notice(session, "🪂 Bajaste: ya te ven de nuevo.");
}
/**
 * Cada `STEP_MS`: primero los pedidos de camino que quedaron en cola (`oncePerTick`), después los que ya llegaron (sin camino) hacen lo que tenían pendiente (sentarse
 * un tick después de llegar, así el avatar no salta dos tiles de golpe; sacudir la palmera; abrir la
 * tienda, hacer el gesto) y después cada uno con camino avanza un tile.
 */
function stepPlayers(room) {
    // Tick nuevo: cada uno puede volver a buscar camino; el pedido que quedó en cola va primero.
    for (const session of room.sessions.values()) {
        session.searchedThisTick = false;
        const queued = session.queuedSearch;
        if (!queued || session.closed)
            continue;
        session.queuedSearch = null;
        session.searchedThisTick = true;
        queued();
    }
    // Los que siguen a alguien buscan camino hasta él (si se movió).
    (0, follow_1.stepFollowers)(room);
    for (const session of room.sessions.values()) {
        const { pending, player } = session;
        if (!pending || (0, session_1.isWalking)(session))
            continue;
        session.pending = null;
        if (pending.kind === "bench") {
            if (isBenchTaken(room, pending.bench, session))
                continue;
            player.x = pending.bench.x;
            player.y = pending.bench.y;
            player.sitting = true;
        }
        else if (pending.kind === "palm") {
            if (room.map.isNextTo(pending.palm, player.x, player.y))
                shakePalm(room, session, pending.palm);
        }
        else if (pending.kind === "gesture") {
            (0, gestures_1.startGesture)(session, pending.gesture);
        }
        else if (pending.kind === "door") {
            if (room.map.isNearDoor(pending.door, player.x, player.y))
                (0, doors_1.crossDoor)(room, session, pending.door);
        }
        else if (pending.kind === "jacuzzi") {
            (0, doors_1.enterJacuzzi)(room, session, pending.seat);
        }
        else if (pending.kind === "npc") {
            if (room.map.isNearNpc(pending.npc, player.x, player.y))
                (0, welcome_1.talkToNpc)(room, session, pending.npc);
        }
        else if (room.map.isNearShop(pending.shop, player.x, player.y)) {
            (0, shops_1.openShop)(room, session, pending.shop);
        }
    }
    for (const session of room.sessions.values()) {
        if (!(0, session_1.isWalking)(session))
            continue;
        // Volando: un tramo del vuelo por tick, sin gastar energía ni hambre.
        if (session.player.flying) {
            const next = session.path.shift();
            session.player.x = next.x;
            session.player.y = next.y;
            continue;
        }
        // Cansado: un tile cada `TIRED_STEP_TICKS` ticks (camina más lento, pero llega al banco).
        if (session.stepWait > 0) {
            session.stepWait -= 1;
            continue;
        }
        let steps = 1;
        if (session.player.tired) {
            session.stepWait = shared_1.TIRED_STEP_TICKS - 1;
            session.stepCredit = 0;
        }
        else {
            // Calzado rápido (`walkSpeed`): cada tick suma la velocidad y se avanza un tile por cada punto
            // entero (con 1,5, tres tiles cada dos ticks). Con calzado común es siempre uno.
            session.stepCredit += (0, shared_1.walkSpeed)(session.player.shoes);
            steps = Math.floor(session.stepCredit);
            session.stepCredit -= steps;
        }
        for (let i = 0; i < steps && (0, session_1.isWalking)(session); i++) {
            // Cada paso gasta un poco de energía, pero nunca deja agotado (`walkStep`): siempre se puede caminar.
            session.needs.walkStep();
            session.needs.drainHunger(shared_1.WALK_HUNGER_COST);
            const next = session.path.shift();
            session.player.x = next.x;
            session.player.y = next.y;
        }
        if (!(0, session_1.isWalking)(session))
            session.stepCredit = 0;
    }
}
//# sourceMappingURL=movement.js.map