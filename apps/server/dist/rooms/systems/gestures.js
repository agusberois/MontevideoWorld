"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gestureRoutes = gestureRoutes;
exports.startGesture = startGesture;
exports.stepGestures = stepGestures;
const shared_1 = require("@montevideo-world/shared");
const session_1 = require("../session");
/**
 * Gestos (tomar mate, bailar candombe…) y gestos de a dos (chocar los cinco, abrazo, pasar el mate):
 * `player.gesture` lo ven todos mientras dura.
 */
function gestureRoutes(room) {
    return {
        [shared_1.MessageType.Gesture]: (session, message) => {
            const why = gestureBlocked(session, message.gesture);
            if (why)
                return room.notice(session, why);
            // Caminando: lo hace al llegar (como sentarse o abrir la tienda); caminar a otro lado lo cancela.
            if ((0, session_1.isWalking)(session)) {
                session.pending = { kind: "gesture", gesture: message.gesture };
                return;
            }
            startGesture(session, message.gesture);
        },
        /** Invitar a quien está al lado a un gesto de a dos: al otro le llega `gesture:invite`. */
        [shared_1.MessageType.GesturePairRequest]: (session, message) => {
            const target = room.sessions.get(message.targetId);
            if (!target || target === session || target.closed)
                return;
            const name = shared_1.PAIR_GESTURES[message.gesture].name.toLocaleLowerCase("es");
            const why = pairBlocked(session, target, message.gesture);
            if (why)
                return room.notice(session, why);
            const now = Date.now();
            const asked = session.pairRequest;
            if (asked && asked.targetId === message.targetId && asked.expiresAt > now) {
                return room.notice(session, `Ya le pediste a ${target.player.name}: esperá que responda.`);
            }
            session.pairRequest = { targetId: message.targetId, gesture: message.gesture, expiresAt: now + shared_1.PAIR_GESTURE_INVITE_MS };
            room.sendTo(target, shared_1.MessageType.GesturePairInvite, {
                fromId: session.client.sessionId,
                fromName: session.player.name,
                gesture: message.gesture,
                expiresInMs: shared_1.PAIR_GESTURE_INVITE_MS,
            });
            room.notice(session, `Le pediste a ${target.player.name} ${name}.`);
        },
        /** Respuesta del invitado: si acepta y siguen al lado y libres, arrancan los dos juntos. */
        [shared_1.MessageType.GesturePairRespond]: (session, message) => {
            const inviter = room.sessions.get(message.fromId);
            const request = inviter?.pairRequest;
            if (!inviter || inviter.closed || !request || request.targetId !== session.client.sessionId || request.expiresAt <= Date.now()) {
                return room.notice(session, "Esa invitación ya venció.");
            }
            inviter.pairRequest = null;
            if (!message.accept)
                return room.notice(inviter, `${session.player.name} no quiso.`);
            const why = pairBlocked(inviter, session, request.gesture);
            if (why) {
                room.notice(session, why);
                return room.notice(inviter, why);
            }
            startPairGesture(inviter, session, request.gesture);
        },
    };
}
/** Por qué no puede hacer el gesto ahora (null = puede). Los de a dos se hacen siempre parado. */
function gestureBlocked(session, gesture) {
    const { player } = session;
    if (player.fishing)
        return "Estás pescando: recogé la línea para hacer un gesto.";
    if (player.vending)
        return "Estás vendiendo: terminá la venta para hacer un gesto.";
    if (player.busking)
        return "Estás tocando: terminá el tema para hacer un gesto.";
    if (player.parking)
        return "Estás cuidando un auto: esperá al dueño para hacer un gesto.";
    const seated = (0, shared_1.isGestureId)(gesture) && shared_1.GESTURES[gesture].seated;
    const name = (0, shared_1.isGestureId)(gesture) || (0, shared_1.isPairGestureId)(gesture) ? (0, shared_1.gestureInfo)(gesture).name.toLocaleLowerCase("es") : "eso";
    if ((player.sitting || player.bathing) && !seated)
        return `Para ${name} tenés que estar parado.`;
    return null;
}
/** Por qué estos dos no pueden hacer juntos el gesto (null = pueden). Los avisos son para el que invita. */
function pairBlocked(inviter, target, gesture) {
    const a = inviter.player;
    const b = target.player;
    if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > shared_1.PAIR_GESTURE_RANGE) {
        return `Tienen que estar uno al lado del otro para ${shared_1.PAIR_GESTURES[gesture].name.toLocaleLowerCase("es")}.`;
    }
    if ((0, session_1.isWalking)(inviter) || (0, session_1.isWalking)(target))
        return "Tienen que estar quietos.";
    const mine = gestureBlocked(inviter, gesture);
    if (mine)
        return mine;
    return gestureBlocked(target, gesture) ? `${b.name} está ocupado: probá en un rato.` : null;
}
/** Empieza el gesto solo (o lo vuelve a empezar) si se puede; si no, no hace nada. */
function startGesture(session, gesture, now = Date.now()) {
    if (gestureBlocked(session, gesture))
        return;
    endPartner(session);
    setGesture(session, gesture, "", false, now);
}
/** Los dos arrancan juntos el gesto de a dos (`lead` = el que invitó). */
function startPairGesture(lead, other, gesture, now = Date.now()) {
    endPartner(lead);
    endPartner(other);
    setGesture(lead, gesture, other.client.sessionId, true, now);
    setGesture(other, gesture, lead.client.sessionId, false, now);
}
function setGesture(session, gesture, partner, lead, now) {
    session.player.gesture = gesture;
    session.player.gesturePartner = partner;
    session.player.gestureLead = lead;
    session.gestureUntil = now + (0, shared_1.gestureInfo)(gesture).durationMs;
}
/** Deja el gesto de a dos en el que estaba (el otro lo termina en el próximo `stepGestures`). */
function endPartner(session) {
    if (!session.player.gesturePartner)
        return;
    session.player.gesturePartner = "";
}
/**
 * Cada tick: termina los gestos vencidos y los que ya no se pueden seguir (camina, pesca, vende, toca, se
 * sentó con uno de parado; en los de a dos, también si el otro dejó de hacerlo).
 */
function stepGestures(room, now = Date.now()) {
    for (const session of room.sessions.values()) {
        const { player } = session;
        const gesture = player.gesture;
        if (!gesture)
            continue;
        const known = (0, shared_1.isGestureId)(gesture) || (0, shared_1.isPairGestureId)(gesture);
        const partner = (0, shared_1.isPairGestureId)(gesture) ? room.sessions.get(player.gesturePartner) : undefined;
        const partnerLeft = (0, shared_1.isPairGestureId)(gesture) && (!partner || partner.player.gesture !== gesture || partner.player.gesturePartner !== session.client.sessionId);
        if (!known || now >= session.gestureUntil || (0, session_1.isWalking)(session) || gestureBlocked(session, gesture) !== null || partnerLeft) {
            player.gesture = "";
            player.gesturePartner = "";
            player.gestureLead = false;
        }
    }
}
//# sourceMappingURL=gestures.js.map