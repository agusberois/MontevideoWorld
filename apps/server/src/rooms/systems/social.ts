import type { Client } from "@colyseus/core";
import { AnnouncementMessage, CHAT_COOLDOWN_MS, TYPING_TIMEOUT_MS, ChatBroadcastMessage, MessageType, TRAVEL_TICKET_MS, formatJailLeft, nameKey, sanitizeChat } from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import { auditAdmin, logText } from "../../audit";
import { bans } from "../../bans";
import { mutes } from "../../mutes";
import { CommandHost, runCommand } from "../../commands";
import { playerDirectory } from "../../directory";
import { issueTravelTicket, playerStore } from "../../playerStore";
import { chatBarra } from "./barras";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, isWalking } from "../session";
import { leaveRestricted } from "./doors";
import { startFollowing, stopFollowing } from "./follow";
import { startGesture } from "./gestures";
import { land, startFlying, teleport } from "./movement";
import type { MessageRoutes } from "./types";

/** Canal de presence por el que viajan los anuncios del admin a todas las salas (todos los barrios). */
export const ANNOUNCEMENT_TOPIC = "announcements";

/** Chat (y comandos), saludo y burla a los presos. */
export function socialRoutes(room: CityRoom) {
  return {
    [MessageType.Chat]: (session, message) => {
      const now = Date.now();
      if (now - session.lastChatAt < CHAT_COOLDOWN_MS) return;
      const text = sanitizeChat(message.text);
      if (!text) return;
      // Lo que otros leen (chat, `/mensaje` y `/barra`): silenciado no sale, y el mismo texto repetido enseguida
      // tampoco (el cooldown deja 2,5 por segundo: sin esto se podía inundar el chat con lo mismo).
      const spoken = !text.startsWith("/") || /^\/(mensaje|barra)(\s|$)/i.test(text);
      if (spoken) {
        if (isMuted(room, session, now)) return;
        const same = text.toLocaleLowerCase("es") === session.lastChatText;
        if (same && now - session.lastChatAt < REPEAT_CHAT_MS) {
          return room.notice(session, "Ya lo dijiste: esperá unos segundos para repetirlo.");
        }
        session.lastChatText = text.toLocaleLowerCase("es");
      }
      session.lastChatAt = now;
      // "/algo" es un comando (ver `commands/`): no va al chat.
      if (runCommand(text, { client: session.client, player: session.player }, room.commandHost)) return;
      sayAs(room, session, text, now);
    },

    /**
     * Está escribiendo en el chat (o dejó): 💬 sobre su cabeza para todos (`player.typing`). El
     * cliente lo repite mientras escribe; si deja de avisar, `tickTyping` lo apaga. Silenciado o preso
     * no se muestra (no puede hablar a los demás).
     */
    [MessageType.Typing]: (session, message) => {
      const now = Date.now();
      const typing = message.typing && session.player.jailLeft === 0 && !mutes.until(session.key, session.player.name, now);
      session.typingUntil = typing ? now + TYPING_TIMEOUT_MS : 0;
      if (session.player.typing !== typing) session.player.typing = typing;
    },

    /**
     * Saludar a otro jugador: sale como mensaje propio en el chat (y en el globo) y saluda con la mano
     * (gesto `wave`, si no está ocupado ni caminando). Usa el cooldown del chat.
     */
    [MessageType.Greet]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (!target || target === session) return;
      const now = Date.now();
      if (now - session.lastChatAt < CHAT_COOLDOWN_MS || isMuted(room, session, now)) return;
      session.lastChatAt = now;
      sayAs(room, session, `👋 ¡Hola, ${target.player.name}!`, now);
      if (!isWalking(session)) startGesture(session, "wave", now);
    },

    /**
     * Burlarse de un preso (sólo las visitas del COMCAR, que están libres): sale en el chat como si lo
     * hubiera escrito, con el mismo cooldown que el saludo.
     */
    [MessageType.Taunt]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (!target || target === session || target.player.jailLeft === 0 || session.player.jailLeft > 0) return;
      const now = Date.now();
      if (now - session.lastChatAt < CHAT_COOLDOWN_MS || isMuted(room, session, now)) return;
      session.lastChatAt = now;
      const name = target.player.name;
      const taunts = [
        `😜 ¡Ey, ${name}! Yo me tomo el bondi cuando quiero, ¿y vos?`,
        `🚌 ${name}, me voy a la rambla a tomar mate. Te mando una foto.`,
        `🔒 ¿Qué tal la vista desde ahí adentro, ${name}?`,
        `😂 ${name}, portate bien y capaz que te dejan salir al patio.`,
        `🌭 ${name}, ¿querés un pancho? Ah, no, no podés salir.`,
        `👋 Chau, ${name}, yo me voy. Vos quedate, ¿eh?`,
      ];
      sayAs(room, session, taunts[Math.floor(Math.random() * taunts.length)], now);
    },
  } satisfies Partial<MessageRoutes>;
}

/**
 * Mismo mensaje dos veces: el segundo sale recién pasado este tiempo desde el último que mandó.
 * (Comparado sin mayúsculas; otro texto en el medio lo habilita de nuevo.)
 */
const REPEAT_CHAT_MS = 5000;

/** Silenciado por `/silenciar`: le avisa cuánto le queda y devuelve true. */
function isMuted(room: CityRoom, session: PlayerSession, now: number): boolean {
  const until = mutes.until(session.key, session.player.name, now);
  if (!until) return false;
  room.notice(session, `🔇 Estás silenciado: te quedan ${formatJailLeft((until - now) / 1000)}.`);
  return true;
}

/** Cada tick: apaga el 💬 de los que dejaron de avisar que escriben (cerraron, se cortaron). */
export function tickTyping(room: CityRoom) {
  const now = Date.now();
  for (const session of room.sessions.values()) {
    if (session.player.typing && now > session.typingUntil) session.player.typing = false;
  }
}

function sayAs(room: CityRoom, session: PlayerSession, text: string, timestamp: number) {
  // Ya lo dijo: deja de "escribir" (el cliente igual lo avisa, pero así no queda el 💬 un rato).
  session.player.typing = false;
  session.typingUntil = 0;
  room.broadcastChat({
    id: room.nextMessageId(),
    kind: "player",
    sessionId: session.client.sessionId,
    name: session.player.name,
    text,
    timestamp,
  });
}

/** Lo que los comandos de chat pueden pedirle a la sala (ver `commands/types.ts`). */
export function createCommandHost(room: CityRoom): CommandHost {
  const sessionOf = (client: Client) => room.sessions.get(client.sessionId);
  return {
    notice: (client, text) => {
      const session = sessionOf(client);
      if (session) room.notice(session, text);
    },
    giveItem: (client, itemId, quantity) => {
      const session = sessionOf(client);
      let given = 0;
      while (session && given < quantity && session.inventory.add(itemId)) given += 1;
      if (session && given > 0) room.markInventory(session);
      return given;
    },
    findPlayers: (name) => {
      const wanted = nameKey(name);
      const found: Array<{ client: Client; player: Player }> = [];
      for (const { client, player } of room.sessions.values()) {
        if (nameKey(player.name) === wanted) found.push({ client, player });
      }
      return found;
    },
    findOnline: (name) => playerDirectory.find(name),
    chatBarra: (client, text) => {
      const session = sessionOf(client);
      return session ? chatBarra(room, session, text) : null;
    },
    sendPrivate: (client, player, to, text) => {
      const message: ChatBroadcastMessage = {
        id: room.nextMessageId(),
        kind: "private",
        sessionId: client.sessionId,
        name: player.name,
        text,
        timestamp: Date.now(),
      };
      to.mailbox.deliverPrivate(to.sessionId, message);
      // Copia para quien lo mandó, con el destinatario (otro id: puede estar en el mismo barrio).
      const session = sessionOf(client);
      if (session) room.sendTo(session, MessageType.Chat, { ...message, id: room.nextMessageId(), to: to.name });
    },
    setDonor: (client, donor) => {
      const session = sessionOf(client);
      if (!session) return false;
      session.player.donor = donor;
      room.savePlayer(session);
      // Le sacaron el donador estando en las Termas: se lo saca por la puerta.
      if (!donor && room.map.city.access === "donor" && !session.player.admin) leaveRestricted(room, session);
      return session.key !== null;
    },
    giveMoney: (client, amount) => {
      const session = sessionOf(client);
      if (!session?.wallet.credit(amount)) return false;
      room.markWallet(session);
      return true;
    },
    setFlying: (client, flying) => {
      const session = sessionOf(client);
      if (!session) return;
      if (flying) startFlying(room, session);
      else land(room, session);
    },
    healFully: (client) => {
      const session = sessionOf(client);
      if (!session) return;
      session.needs.fill();
      session.player.energy = session.needs.energy;
      room.sendNeeds(session);
    },
    jail: (target, name, until) => {
      if (target) {
        target.mailbox.jail(target.sessionId, until);
        return 0;
      }
      bans.set(null, name, until);
      const ids = playerStore.idsByName(name);
      for (const id of ids) {
        bans.set(id, name, until);
        playerStore.setJailedUntil(id, until);
      }
      // Registro de a quiénes tocó (el comando ya queda en `[Admin]`): por nombre pueden ser varios.
      const tags = ids.map((id) => id.slice(0, 8)).join(", ") || "ninguno";
      console.log(`[Ban] ${logText(name)} desconectado → ${ids.length} guardados (${tags}) ${until ? `hasta ${new Date(until).toISOString()}` : "liberados"}`);
      return ids.length;
    },
    mute: (to, until) => to.mailbox.mute(to.sessionId, until),
    follow: (client, to) => {
      const session = sessionOf(client);
      if (!session) return;
      if (!to) return session.follow ? stopFollowing(room, session) : room.notice(session, "Usá: /seguir <jugador>.");
      const target = to.mailbox.roomId === room.roomId ? room.sessions.get(to.sessionId) : undefined;
      if (!target) return room.notice(session, `${to.name} está en ${to.cityName}: para seguirlo tenés que estar en el mismo barrio.`);
      startFollowing(room, session, target);
    },
    traceTo: (client, to) => {
      const session = sessionOf(client);
      if (!session) return;
      if (to.mailbox.roomId === room.roomId) {
        const tile = room.tileNear(to.sessionId, client.sessionId);
        if (!tile) return room.notice(session, `No hay lugar libre al lado de ${to.name}.`);
        teleport(session, tile);
        return room.notice(session, `📍 Fuiste hasta ${to.name}.`);
      }
      if (!session.key) return room.notice(session, "Para ir a otro barrio, tu navegador tiene que permitir guardar datos del sitio.");
      room.savePlayer(session);
      issueTravelTicket(session.key, to.cityId, Date.now() + TRAVEL_TICKET_MS, Date.now(), { near: to.sessionId });
      room.sendTo(session, MessageType.TravelApproved, { cityId: to.cityId, roomId: to.mailbox.roomId });
      room.notice(session, `📍 Yendo hasta ${to.name} (${to.cityName}).`);
    },
    summon: (client, to) => {
      const session = sessionOf(client);
      if (!session) return;
      // El tile del admin; si es un banco o el jacuzzi (no se camina), uno pegado.
      const here = { x: session.player.x, y: session.player.y };
      const at = room.map.isWalkable(here.x, here.y) ? here : room.map.approachTile(here, here);
      if (!at) return room.notice(session, "No hay dónde dejarlo: parate en un tile libre.");
      const target = room.sessions.get(to.sessionId);
      if (target && to.mailbox.roomId === room.roomId) {
        teleport(target, at);
        room.notice(target, `🧲 ${session.player.name} te trajo a su lado.`);
        return room.notice(session, `🧲 Trajiste a ${to.name}.`);
      }
      const why = to.mailbox.summon(to.sessionId, { cityId: room.map.city.id, roomId: room.roomId, at, by: session.player.name });
      room.notice(session, why ? `No se pudo traer a ${to.name}: ${why}` : `🧲 Trayendo a ${to.name} desde ${to.cityName}.`);
    },
    // Anuncio para todos los barrios: se publica en presence y cada sala lo reenvía. (Queda en el
    // log como el comando `/post`, ver `audit`.)
    announce: (name, text) => {
      const announcement: AnnouncementMessage = { id: `${Date.now()}-${room.nextMessageId()}`, name, text };
      room.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
    },
    audit: (client, text, allowed) => {
      const session = sessionOf(client);
      if (session) auditAdmin(session, room.label, logText(text), allowed);
    },
  };
}
