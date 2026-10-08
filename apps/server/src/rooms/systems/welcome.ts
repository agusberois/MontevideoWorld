import {
  LETTER_LOST_PROFESSION,
  MessageType,
  Npc,
  NpcSayMessage,
  PROFESSION_KIT,
  getItem,
  getProfession,
  WELCOME_CLERK_ID,
  WELCOME_COURIER_ID,
  WELCOME_LETTER_ID,
  WelcomeStage,
} from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, halt, oncePerTick, standUp } from "../session";
import { stopActivities } from "./activities";
import type { MessageRoutes } from "./types";

/**
 * Bienvenida del jugador nuevo (`welcome.ts` en shared) y hablar con los NPCs (`Npc.talks`): clic
 * o F en uno camina hasta él (`pending` `npc`) y al llegar le habla (`talkToNpc`). Lo que dice cada
 * NPC depende de en qué va la bienvenida de quien le habla; cada paso se guarda en el acto.
 */
export function welcomeRoutes(room: CityRoom) {
  return {
    [MessageType.RequestWelcome]: (session) => sendWelcome(room, session),

    /** Abrió el mensaje: ya sabe que tiene que buscar al cartero. */
    [MessageType.WelcomeRead]: (session) => {
      if (session.welcome.stage === "mail") advance(room, session, "courier");
    },

    /** Eligió profesión en la carta (por ahora sólo se guarda: todavía no cambia nada del juego). */
    [MessageType.WelcomeProfession]: (session, message) => {
      if (session.welcome.stage !== "profession") return;
      session.welcome.profession = message.profession;
      advance(room, session, "done");
      const profession = getProfession(message.profession);
      room.notice(session, `${profession.emoji} Elegiste tu profesión: ${profession.name}. ¡Que te vaya bárbaro en Montevideo!`);
      giveKit(room, session);
    },

    /** Clic (o F) en un NPC: si está pegado le habla; si no, camina hasta él y le habla al llegar. */
    [MessageType.NpcTalk]: oncePerTick(MessageType.NpcTalk, (session, message) => {
      const { player } = session;
      const npc = room.map.getTalkingNpc(message.npcId);
      if (!npc) return;
      stopActivities(session);
      if (room.map.isNearNpc(npc, player.x, player.y)) {
        halt(session);
        return talkToNpc(room, session, npc);
      }
      const approach = room.map.npcApproach(npc, { x: player.x, y: player.y });
      const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
      if (path.length === 0) return;
      standUp(player);
      session.path = path;
      session.pending = { kind: "npc", npc };
    }),
  } satisfies Partial<MessageRoutes>;
}

/** Le habla al NPC (ya está pegado): se le abre el diálogo con lo que dice (sólo a él). */
export function talkToNpc(room: CityRoom, session: PlayerSession, npc: Npc) {
  const say = (text: string, extra: Pick<NpcSayMessage, "received" | "action"> = {}) =>
    room.sendTo(session, MessageType.NpcSay, {
      npc: { id: npc.id, name: npc.name, appearance: npc.appearance, outfit: npc.outfit },
      role: npc.role ?? "",
      text,
      ...extra,
    });
  const { welcome, inventory, player } = session;
  if (npc.id === WELCOME_COURIER_ID) {
    if (welcome.stage === "mail" || welcome.stage === "courier") {
      if (!inventory.add(WELCOME_LETTER_ID)) return say("Tengo un sobre a tu nombre, pero no te entra en la mochila. Hacé un poco de lugar y volvé.");
      room.markInventory(session);
      advance(room, session, "deliver");
      return say(
        `¡Vos debés ser ${player.name}! Hace días que tengo este sobre a tu nombre. Es de la Intendencia: llevalo hasta allá, en el Centro. Seguí derecho por 18 de Julio y lo vas a ver. ¡Y cuidalo, eh!`,
        { received: WELCOME_LETTER_ID, action: "mission" },
      );
    }
    if (welcome.stage === "deliver") {
      return say("¿Todavía por acá? La Intendencia está en el Centro: caminá por 18 de Julio hacia el este, no tiene pierde.", { action: "mission" });
    }
    return say("¡Buenas! Hoy no tengo nada para vos. Que tengas un lindo día por la Ciudad Vieja.");
  }
  if (npc.id === WELCOME_CLERK_ID) {
    if (welcome.stage === "deliver" && inventory.count(WELCOME_LETTER_ID) > 0) {
      // Primero la etapa: así sacar el sobre no cuenta como haberlo perdido (`checkWelcomeLetter`).
      advance(room, session, "profession");
      inventory.remove(WELCOME_LETTER_ID);
      room.markInventory(session);
      return say(`¡Ah, el sobre de bienvenida! Te estábamos esperando, ${player.name}. Es para vos: abrilo tranquilo.`, { action: "letter" });
    }
    if (welcome.stage === "profession") return say("¿Ya abriste el sobre? Adentro tenés tu carta de bienvenida.", { action: "letter" });
    if (welcome.stage === "mail" || welcome.stage === "courier") {
      return say("Si te llegó un aviso de un sobre, primero buscá al cartero en la Plaza Independencia, en Ciudad Vieja.", { action: "mission" });
    }
    return say("Intendencia de Montevideo, buenas. Cualquier trámite, acá estamos.");
  }
}

/**
 * Se quedó sin el sobre antes de entregarlo (lo vendió o lo tiró): sin carta de recomendación le
 * toca ser cuidacoches y la misión termina. Lo llama `CityRoom.markInventory` en cada cambio de mochila.
 */
export function checkWelcomeLetter(room: CityRoom, session: PlayerSession) {
  if (session.welcome.stage !== "deliver" || session.inventory.count(WELCOME_LETTER_ID) > 0) return;
  session.welcome.profession = LETTER_LOST_PROFESSION;
  advance(room, session, "done");
  const profession = getProfession(LETTER_LOST_PROFESSION);
  room.notice(session, `✉️ Te deshiciste del sobre de bienvenida: sin carta de recomendación, te tocó ser ${profession.name.toLowerCase()} ${profession.emoji}.`);
  giveKit(room, session);
}

/** Lo que da la profesión que le tocó (`PROFESSION_KIT`: su herramienta más barata o el chaleco flúo), a la mochila. */
function giveKit(room: CityRoom, session: PlayerSession) {
  const item = session.welcome.profession && getItem(PROFESSION_KIT[session.welcome.profession]);
  if (!item) return;
  if (!session.inventory.add(item.id)) {
    return room.notice(session, `🎒 Te tocaba ${item.name.toLowerCase()} de regalo, pero no te entró en la mochila.`);
  }
  room.markInventory(session);
  room.notice(session, `🎁 Para arrancar te dieron: ${item.name}. Está en tu mochila${item.category === "clothing" ? ": ponételo desde ahí" : ""}.`);
}

function advance(room: CityRoom, session: PlayerSession, stage: WelcomeStage) {
  session.welcome.stage = stage;
  room.savePlayer(session);
  sendWelcome(room, session);
}

function sendWelcome(room: CityRoom, session: PlayerSession) {
  const { name, gender } = session.player;
  room.sendTo(session, MessageType.Welcome, { ...session.welcome, name, gender: gender === "f" ? "f" : "m" });
}
