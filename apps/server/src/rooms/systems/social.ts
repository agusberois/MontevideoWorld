import type { Client } from "@colyseus/core";
import { AnnouncementMessage, CHAT_COOLDOWN_MS, ChatBroadcastMessage, MessageType, TRAVEL_TICKET_MS, sanitizeChat } from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import { bans } from "../../bans";
import { CommandHost, runCommand } from "../../commands";
import { playerDirectory } from "../../directory";
import { issueTravelTicket, playerStore } from "../../playerStore";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import { teleport } from "./movement";
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
      session.lastChatAt = now;
      // "/algo" es un comando (ver `commands/`): no va al chat.
      if (runCommand(text, { client: session.client, player: session.player }, room.commandHost)) return;
      sayAs(room, session, text, now);
    },

    /** Saludar a otro jugador: sale como mensaje propio en el chat (y en el globo). Usa el cooldown del chat. */
    [MessageType.Greet]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (!target || target === session) return;
      const now = Date.now();
      if (now - session.lastChatAt < CHAT_COOLDOWN_MS) return;
      session.lastChatAt = now;
      sayAs(room, session, `👋 ¡Hola, ${target.player.name}!`, now);
    },

    /**
     * Burlarse de un preso (sólo las visitas del COMCAR, que están libres): sale en el chat como si lo
     * hubiera escrito, con el mismo cooldown que el saludo.
     */
    [MessageType.Taunt]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      if (!target || target === session || target.player.jailLeft === 0 || session.player.jailLeft > 0) return;
      const now = Date.now();
      if (now - session.lastChatAt < CHAT_COOLDOWN_MS) return;
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

function sayAs(room: CityRoom, session: PlayerSession, text: string, timestamp: number) {
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
      const wanted = name.toLocaleLowerCase("es");
      const found: Array<{ client: Client; player: Player }> = [];
      for (const { client, player } of room.sessions.values()) {
        if (player.name.toLocaleLowerCase("es") === wanted) found.push({ client, player });
      }
      return found;
    },
    findOnline: (name) => playerDirectory.find(name),
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
      return session.key !== null;
    },
    giveMoney: (client, amount) => {
      const session = sessionOf(client);
      if (!session?.wallet.credit(amount)) return false;
      room.markWallet(session);
      return true;
    },
    healFully: (client) => {
      const session = sessionOf(client);
      if (!session) return;
      session.needs.fill();
      session.player.energy = session.needs.energy;
      room.sendNeeds(session);
    },
    jail: (target, name, until) => {
      if (target) return target.mailbox.jail(target.sessionId, until);
      bans.set(null, name, until);
      for (const key of playerStore.keysByName(name)) {
        bans.set(key, name, until);
        playerStore.setJailedUntil(key, until);
      }
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
    // Anuncio para todos los barrios: se publica en presence y cada sala lo reenvía.
    announce: (name, text) => {
      const announcement: AnnouncementMessage = { id: `${Date.now()}-${room.nextMessageId()}`, name, text };
      room.presence.publish(ANNOUNCEMENT_TOPIC, announcement);
      console.log(`[Anuncio] ${name}: ${text}`);
    },
  };
}
