import {
  AnyGestureId,
  GESTURES,
  GestureId,
  MessageType,
  PAIR_GESTURES,
  PAIR_GESTURE_INVITE_MS,
  PAIR_GESTURE_RANGE,
  PairGestureId,
  gestureInfo,
  isGestureId,
  isPairGestureId,
} from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, isWalking } from "../session";
import type { MessageRoutes } from "./types";

/**
 * Gestos (tomar mate, bailar candombe…) y gestos de a dos (chocar los cinco, abrazo, pasar el mate):
 * `player.gesture` lo ven todos mientras dura.
 */
export function gestureRoutes(room: CityRoom) {
  return {
    [MessageType.Gesture]: (session, message) => {
      const why = gestureBlocked(session, message.gesture);
      if (why) return room.notice(session, why);
      // Caminando: lo hace al llegar (como sentarse o abrir la tienda); caminar a otro lado lo cancela.
      if (isWalking(session)) {
        session.pending = { kind: "gesture", gesture: message.gesture };
        return;
      }
      startGesture(session, message.gesture);
    },

    /** Invitar a quien está al lado a un gesto de a dos: al otro le llega `gesture:invite`. */
    [MessageType.GesturePairRequest]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (!target || target === session || target.closed) return;
      const name = PAIR_GESTURES[message.gesture].name.toLocaleLowerCase("es");
      const why = pairBlocked(session, target, message.gesture);
      if (why) return room.notice(session, why);
      const now = Date.now();
      const asked = session.pairRequest;
      if (asked && asked.targetId === message.targetId && asked.expiresAt > now) {
        return room.notice(session, `Ya le pediste a ${target.player.name}: esperá que responda.`);
      }
      session.pairRequest = { targetId: message.targetId, gesture: message.gesture, expiresAt: now + PAIR_GESTURE_INVITE_MS };
      room.sendTo(target, MessageType.GesturePairInvite, {
        fromId: session.client.sessionId,
        fromName: session.player.name,
        gesture: message.gesture,
        expiresInMs: PAIR_GESTURE_INVITE_MS,
      });
      room.notice(session, `Le pediste a ${target.player.name} ${name}.`);
    },

    /** Respuesta del invitado: si acepta y siguen al lado y libres, arrancan los dos juntos. */
    [MessageType.GesturePairRespond]: (session, message) => {
      const inviter = room.sessions.get(message.fromId);
      const request = inviter?.pairRequest;
      if (!inviter || inviter.closed || !request || request.targetId !== session.client.sessionId || request.expiresAt <= Date.now()) {
        return room.notice(session, "Esa invitación ya venció.");
      }
      inviter.pairRequest = null;
      if (!message.accept) return room.notice(inviter, `${session.player.name} no quiso.`);
      const why = pairBlocked(inviter, session, request.gesture);
      if (why) {
        room.notice(session, why);
        return room.notice(inviter, why);
      }
      startPairGesture(inviter, session, request.gesture);
    },
  } satisfies Partial<MessageRoutes>;
}

/** Por qué no puede hacer el gesto ahora (null = puede). Los de a dos se hacen siempre parado. */
function gestureBlocked(session: PlayerSession, gesture: AnyGestureId | string): string | null {
  const { player } = session;
  if (player.fishing) return "Estás pescando: recogé la línea para hacer un gesto.";
  if (player.vending) return "Estás vendiendo: terminá la venta para hacer un gesto.";
  const seated = isGestureId(gesture) && GESTURES[gesture].seated;
  const name = isGestureId(gesture) || isPairGestureId(gesture) ? gestureInfo(gesture).name.toLocaleLowerCase("es") : "eso";
  if ((player.sitting || player.bathing) && !seated) return `Para ${name} tenés que estar parado.`;
  return null;
}

/** Por qué estos dos no pueden hacer juntos el gesto (null = pueden). Los avisos son para el que invita. */
function pairBlocked(inviter: PlayerSession, target: PlayerSession, gesture: PairGestureId): string | null {
  const a = inviter.player;
  const b = target.player;
  if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > PAIR_GESTURE_RANGE) {
    return `Tienen que estar uno al lado del otro para ${PAIR_GESTURES[gesture].name.toLocaleLowerCase("es")}.`;
  }
  if (isWalking(inviter) || isWalking(target)) return "Tienen que estar quietos.";
  const mine = gestureBlocked(inviter, gesture);
  if (mine) return mine;
  return gestureBlocked(target, gesture) ? `${b.name} está ocupado: probá en un rato.` : null;
}

/** Empieza el gesto solo (o lo vuelve a empezar) si se puede; si no, no hace nada. */
export function startGesture(session: PlayerSession, gesture: GestureId, now = Date.now()) {
  if (gestureBlocked(session, gesture)) return;
  endPartner(session);
  setGesture(session, gesture, "", false, now);
}

/** Los dos arrancan juntos el gesto de a dos (`lead` = el que invitó). */
function startPairGesture(lead: PlayerSession, other: PlayerSession, gesture: PairGestureId, now = Date.now()) {
  endPartner(lead);
  endPartner(other);
  setGesture(lead, gesture, other.client.sessionId, true, now);
  setGesture(other, gesture, lead.client.sessionId, false, now);
}

function setGesture(session: PlayerSession, gesture: AnyGestureId, partner: string, lead: boolean, now: number) {
  session.player.gesture = gesture;
  session.player.gesturePartner = partner;
  session.player.gestureLead = lead;
  session.gestureUntil = now + gestureInfo(gesture).durationMs;
}

/** Deja el gesto de a dos en el que estaba (el otro lo termina en el próximo `stepGestures`). */
function endPartner(session: PlayerSession) {
  if (!session.player.gesturePartner) return;
  session.player.gesturePartner = "";
}

/**
 * Cada tick: termina los gestos vencidos y los que ya no se pueden seguir (camina, pesca, vende, se
 * sentó con uno de parado; en los de a dos, también si el otro dejó de hacerlo).
 */
export function stepGestures(room: CityRoom, now = Date.now()) {
  for (const session of room.sessions.values()) {
    const { player } = session;
    const gesture = player.gesture;
    if (!gesture) continue;
    const known = isGestureId(gesture) || isPairGestureId(gesture);
    const partner = isPairGestureId(gesture) ? room.sessions.get(player.gesturePartner) : undefined;
    const partnerLeft =
      isPairGestureId(gesture) && (!partner || partner.player.gesture !== gesture || partner.player.gesturePartner !== session.client.sessionId);
    if (!known || now >= session.gestureUntil || isWalking(session) || gestureBlocked(session, gesture) !== null || partnerLeft) {
      player.gesture = "";
      player.gesturePartner = "";
      player.gestureLead = false;
    }
  }
}
