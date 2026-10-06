import {
  BARRA_FOUND_COST,
  BARRA_INVITE_MS,
  BARRA_MAX_MEMBERS,
  BarraView,
  ChatBroadcastMessage,
  MessageType,
  barraColorHex,
  barraNameProblem,
  barraTagProblem,
  formatMoney,
  normalizeBarraName,
  normalizeBarraTag,
} from "@montevideo-world/shared";
import { BarraRecord, barraStore } from "../../barraStore";
import { playerDirectory } from "../../directory";
import { playerId } from "../../playerStore";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import type { MessageRoutes } from "./types";

/**
 * Barras (etapa 1): fundarlas en el Registro de Barras de Ciudad Vieja, invitar (el fundador),
 * aceptar, irse (el fundador, si se va, la disuelve), el panel "Mi barra" y `/barra` (ver
 * `chatBarra`). Lo guardado vive en `barraStore`; acá sólo se valida y se avisa. La sigla y el color
 * de cada integrante conectado van en el Schema (`Player.barraTag` / `barraColor`).
 */

/** Invitaciones pendientes: `playerId` del invitado → a qué barra y hasta cuándo. Sólo en memoria. */
const invites = new Map<string, { barraId: string; expiresAt: number }>();

export function barraRoutes(room: CityRoom) {
  return {
    [MessageType.BarraCreate]: (session, message) => {
      const id = memberId(session);
      if (!id) return result(room, session, false, "Para fundar una barra, tu navegador tiene que permitir guardar datos del sitio.");
      const registry = room.map.city.shops.find((shop) => shop.registry);
      if (!registry || !room.map.isNearShop(registry, session.player.x, session.player.y)) {
        return result(room, session, false, "Las barras se fundan en el Registro de Barras, sobre la peatonal Sarandí.");
      }
      if (barraStore.ofMember(id)) return result(room, session, false, "Ya sos de una barra: para fundar otra, primero tenés que irte.");
      const name = normalizeBarraName(message.name);
      const tag = normalizeBarraTag(message.tag);
      const problem = barraNameProblem(name) ?? barraTagProblem(tag);
      if (problem) return result(room, session, false, problem);
      if (barraStore.nameTaken(name)) return result(room, session, false, `Ya hay una barra que se llama "${name}".`);
      if (barraStore.tagTaken(tag)) return result(room, session, false, `La sigla [${tag}] ya la usa otra barra.`);
      if (!session.wallet.debit(BARRA_FOUND_COST)) {
        return result(room, session, false, `Fundar una barra sale ${formatMoney(BARRA_FOUND_COST)} y no te alcanza.`);
      }
      room.markWallet(session);
      barraStore.create({ name, tag, colors: message.colors, founderId: id, founderName: session.player.name });
      room.savePlayer(session);
      applyBarra(session);
      result(room, session, true, `🎉 ¡Fundaste [${tag}] ${name}! Invitá a tu gente desde su menú (clic en el jugador).`);
      sendBarra(room, session);
      room.broadcastSystem(`🚩 ${session.player.name} fundó la barra [${tag}] ${name}`, session.client);
    },

    [MessageType.BarraInvite]: (session, message) => {
      const id = memberId(session);
      const barra = id ? barraStore.ofMember(id) : undefined;
      if (!id || !barra) return result(room, session, false, "No sos de ninguna barra.");
      if (barra.founderId !== id) return result(room, session, false, "Sólo el fundador puede invitar a la barra.");
      const target = room.sessions.get(message.targetId);
      if (!target || target === session) return;
      const targetId = memberId(target);
      if (!targetId) return result(room, session, false, `${target.player.name} no puede entrar a una barra (su navegador no guarda datos).`);
      if (barraStore.ofMember(targetId)) return result(room, session, false, `${target.player.name} ya es de una barra.`);
      if (Object.keys(barra.members).length >= BARRA_MAX_MEMBERS) {
        return result(room, session, false, `Tu barra ya tiene ${BARRA_MAX_MEMBERS} integrantes: está llena.`);
      }
      invites.set(targetId, { barraId: barra.id, expiresAt: Date.now() + BARRA_INVITE_MS });
      room.sendTo(target, MessageType.BarraInvited, {
        barraId: barra.id,
        name: barra.name,
        tag: barra.tag,
        color: barraColorHex(barra.colors[0]),
        fromName: session.player.name,
        expiresInMs: BARRA_INVITE_MS,
      });
      result(room, session, true, `Invitaste a ${target.player.name} a [${barra.tag}] ${barra.name}.`);
    },

    [MessageType.BarraRespond]: (session, message) => {
      const id = memberId(session);
      if (!id) return;
      const invite = invites.get(id);
      if (!invite || invite.barraId !== message.barraId) return;
      invites.delete(id);
      const barra = barraStore.get(invite.barraId);
      if (!message.accept || !barra) return;
      if (invite.expiresAt < Date.now()) return result(room, session, false, "La invitación ya venció: pedile que te invite de nuevo.");
      if (barraStore.ofMember(id)) return result(room, session, false, "Ya sos de una barra.");
      if (Object.keys(barra.members).length >= BARRA_MAX_MEMBERS) return result(room, session, false, "Esa barra ya está llena.");
      barraStore.addMember(barra.id, id, session.player.name);
      applyBarra(session);
      result(room, session, true, `¡Ya sos de [${barra.tag}] ${barra.name}! Hablales con /barra <texto>.`);
      notifyBarra(barra, `${session.player.name} se sumó a la barra.`);
      refreshOnline(barra);
    },

    [MessageType.BarraLeave]: (session) => {
      const id = memberId(session);
      const barra = id ? barraStore.ofMember(id) : undefined;
      if (!id || !barra) return;
      if (barra.founderId === id) {
        // El fundador, si se va, la disuelve (pasar el mando llega con los roles).
        notifyBarra(barra, `${session.player.name} disolvió la barra [${barra.tag}] ${barra.name}.`, id);
        barraStore.disband(barra.id);
        applyBarra(session);
        refreshOnline(barra);
        sendBarra(room, session);
        return result(room, session, true, `Disolviste [${barra.tag}] ${barra.name}.`);
      }
      barraStore.removeMember(barra.id, id);
      applyBarra(session);
      sendBarra(room, session);
      result(room, session, true, `Te fuiste de [${barra.tag}] ${barra.name}.`);
      notifyBarra(barra, `${session.player.name} se fue de la barra.`);
      refreshOnline(barra);
    },

    [MessageType.BarraRequest]: (session) => sendBarra(room, session),
  } satisfies Partial<MessageRoutes>;
}

/** `playerId` del jugador (null si no tiene clave: sin clave no hay barra). */
function memberId(session: PlayerSession): string | null {
  return session.key ? playerId(session.key) : null;
}

/** Pone en el Schema la sigla y el color de su barra (o los saca), y actualiza su nombre guardado. */
export function applyBarra(session: PlayerSession) {
  const id = memberId(session);
  const barra = id ? barraStore.ofMember(id) : undefined;
  if (id && barra) barraStore.renameMember(barra.id, id, session.player.name);
  session.player.barraTag = barra?.tag ?? "";
  session.player.barraColor = barra ? barraColorHex(barra.colors[0]) : "";
  session.player.barraName = barra?.name ?? "";
}

/** Le manda su barra (el panel "Mi barra"): integrantes, quién está conectado y dónde. */
export function sendBarra(room: CityRoom, session: PlayerSession) {
  const id = memberId(session);
  const barra = id ? barraStore.ofMember(id) : undefined;
  room.sendTo(session, MessageType.Barra, { barra: barra && id ? view(barra, id) : null });
}

function view(barra: BarraRecord, viewerId: string): BarraView {
  const members = Object.entries(barra.members).map(([memberPlayerId, member]) => {
    const online = playerDirectory.byPlayerId(memberPlayerId);
    return { name: member.name, role: member.role, online: Boolean(online), cityName: online?.cityName, you: memberPlayerId === viewerId };
  });
  // Primero el fundador, después los conectados y, dentro de cada grupo, por nombre.
  members.sort((a, b) => Number(b.role === "fundador") - Number(a.role === "fundador") || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, "es"));
  return { id: barra.id, name: barra.name, tag: barra.tag, colors: barra.colors, createdAt: barra.createdAt, members, founder: barra.founderId === viewerId };
}

/** Que los integrantes conectados (en cualquier barrio) vuelvan a leer su barra: sigla y panel. */
function refreshOnline(barra: BarraRecord) {
  for (const memberPlayerId of Object.keys(barra.members)) {
    const online = playerDirectory.byPlayerId(memberPlayerId);
    online?.mailbox.refreshBarra(online.sessionId);
  }
}

/** Aviso a los integrantes conectados (menos `except`), como un mensaje de la barra. */
function notifyBarra(barra: BarraRecord, text: string, except?: string) {
  for (const memberPlayerId of Object.keys(barra.members)) {
    if (memberPlayerId === except) continue;
    const online = playerDirectory.byPlayerId(memberPlayerId);
    if (!online) continue;
    const message: ChatBroadcastMessage = {
      id: `barra-${Date.now()}-${memberPlayerId.slice(0, 6)}`,
      kind: "barra",
      sessionId: "",
      name: "",
      text,
      timestamp: Date.now(),
      barraTag: barra.tag,
      barraColor: barraColorHex(barra.colors[0]),
    };
    online.mailbox.deliverPrivate(online.sessionId, message);
  }
}

/**
 * `/barra <texto>`: el mensaje llega a todos los integrantes conectados, estén en el barrio que estén
 * (también al que lo manda). Devuelve por qué no se pudo (null = salió).
 */
export function chatBarra(room: CityRoom, session: PlayerSession, text: string): string | null {
  const id = memberId(session);
  const barra = id ? barraStore.ofMember(id) : undefined;
  if (!barra) return "No sos de ninguna barra. Se fundan en el Registro de Barras, sobre la peatonal Sarandí.";
  for (const memberPlayerId of Object.keys(barra.members)) {
    const online = playerDirectory.byPlayerId(memberPlayerId);
    if (!online) continue;
    const message: ChatBroadcastMessage = {
      id: room.nextMessageId(),
      kind: "barra",
      sessionId: session.client.sessionId,
      name: session.player.name,
      text,
      timestamp: Date.now(),
      barraTag: barra.tag,
      barraColor: barraColorHex(barra.colors[0]),
    };
    online.mailbox.deliverPrivate(online.sessionId, message);
  }
  return null;
}

function result(room: CityRoom, session: PlayerSession, ok: boolean, text: string) {
  room.sendTo(session, MessageType.BarraResult, { ok, text });
}
