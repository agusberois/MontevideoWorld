"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeRoutes = welcomeRoutes;
exports.talkToNpc = talkToNpc;
exports.checkWelcomeLetter = checkWelcomeLetter;
const shared_1 = require("@montevideo-world/shared");
const session_1 = require("../session");
const activities_1 = require("./activities");
/**
 * Bienvenida del jugador nuevo (`welcome.ts` en shared) y hablar con los NPCs (`Npc.talks`): clic
 * o F en uno camina hasta él (`pending` `npc`) y al llegar le habla (`talkToNpc`). Lo que dice cada
 * NPC depende de en qué va la bienvenida de quien le habla; cada paso se guarda en el acto.
 */
function welcomeRoutes(room) {
    return {
        [shared_1.MessageType.RequestWelcome]: (session) => sendWelcome(room, session),
        /** Abrió el mensaje: ya sabe que tiene que buscar al cartero. */
        [shared_1.MessageType.WelcomeRead]: (session) => {
            if (session.welcome.stage === "mail")
                advance(room, session, "courier");
        },
        /** Eligió profesión en la carta (por ahora sólo se guarda: todavía no cambia nada del juego). */
        [shared_1.MessageType.WelcomeProfession]: (session, message) => {
            if (session.welcome.stage !== "profession")
                return;
            session.welcome.profession = message.profession;
            advance(room, session, "done");
            const profession = (0, shared_1.getProfession)(message.profession);
            room.notice(session, `${profession.emoji} Elegiste tu profesión: ${profession.name}. ¡Que te vaya bárbaro en Montevideo!`);
            giveKit(room, session);
        },
        /** Clic (o F) en un NPC: si está pegado le habla; si no, camina hasta él y le habla al llegar. */
        [shared_1.MessageType.NpcTalk]: (0, session_1.oncePerTick)(shared_1.MessageType.NpcTalk, (session, message) => {
            const { player } = session;
            const npc = room.map.getTalkingNpc(message.npcId);
            if (!npc)
                return;
            (0, activities_1.stopActivities)(session);
            if (room.map.isNearNpc(npc, player.x, player.y)) {
                (0, session_1.halt)(session);
                return talkToNpc(room, session, npc);
            }
            const approach = room.map.npcApproach(npc, { x: player.x, y: player.y });
            const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
            if (path.length === 0)
                return;
            (0, session_1.standUp)(player);
            session.path = path;
            session.pending = { kind: "npc", npc };
        }),
    };
}
/** Le habla al NPC (ya está pegado): se le abre el diálogo con lo que dice (sólo a él). */
function talkToNpc(room, session, npc) {
    const say = (text, extra = {}) => room.sendTo(session, shared_1.MessageType.NpcSay, {
        npc: { id: npc.id, name: npc.name, appearance: npc.appearance, outfit: npc.outfit },
        role: npc.role ?? "",
        text,
        ...extra,
    });
    const { welcome, inventory, player } = session;
    if (npc.id === shared_1.WELCOME_COURIER_ID) {
        if (welcome.stage === "mail" || welcome.stage === "courier") {
            if (!inventory.add(shared_1.WELCOME_LETTER_ID))
                return say("Tengo un sobre a tu nombre, pero no te entra en la mochila. Hacé un poco de lugar y volvé.");
            room.markInventory(session);
            advance(room, session, "deliver");
            return say(`¡Vos debés ser ${player.name}! Hace días que tengo este sobre a tu nombre. Es de la Intendencia: llevalo hasta allá, en el Centro. Seguí derecho por 18 de Julio y lo vas a ver. ¡Y cuidalo, eh!`, { received: shared_1.WELCOME_LETTER_ID, action: "mission" });
        }
        if (welcome.stage === "deliver") {
            return say("¿Todavía por acá? La Intendencia está en el Centro: caminá por 18 de Julio hacia el este, no tiene pierde.", { action: "mission" });
        }
        return say("¡Buenas! Hoy no tengo nada para vos. Que tengas un lindo día por la Ciudad Vieja.");
    }
    if (npc.id === shared_1.WELCOME_CLERK_ID) {
        if (welcome.stage === "deliver" && inventory.count(shared_1.WELCOME_LETTER_ID) > 0) {
            // Primero la etapa: así sacar el sobre no cuenta como haberlo perdido (`checkWelcomeLetter`).
            advance(room, session, "profession");
            inventory.remove(shared_1.WELCOME_LETTER_ID);
            room.markInventory(session);
            return say(`¡Ah, el sobre de bienvenida! Te estábamos esperando, ${player.name}. Es para vos: abrilo tranquilo.`, { action: "letter" });
        }
        if (welcome.stage === "profession")
            return say("¿Ya abriste el sobre? Adentro tenés tu carta de bienvenida.", { action: "letter" });
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
function checkWelcomeLetter(room, session) {
    if (session.welcome.stage !== "deliver" || session.inventory.count(shared_1.WELCOME_LETTER_ID) > 0)
        return;
    session.welcome.profession = shared_1.LETTER_LOST_PROFESSION;
    advance(room, session, "done");
    const profession = (0, shared_1.getProfession)(shared_1.LETTER_LOST_PROFESSION);
    room.notice(session, `✉️ Te deshiciste del sobre de bienvenida: sin carta de recomendación, te tocó ser ${profession.name.toLowerCase()} ${profession.emoji}.`);
    giveKit(room, session);
}
/** Lo que da la profesión que le tocó (`PROFESSION_KIT`: su herramienta más barata o el chaleco flúo), a la mochila. */
function giveKit(room, session) {
    const item = session.welcome.profession && (0, shared_1.getItem)(shared_1.PROFESSION_KIT[session.welcome.profession]);
    if (!item)
        return;
    if (!session.inventory.add(item.id)) {
        return room.notice(session, `🎒 Te tocaba ${item.name.toLowerCase()} de regalo, pero no te entró en la mochila.`);
    }
    room.markInventory(session);
    room.notice(session, `🎁 Para arrancar te dieron: ${item.name}. Está en tu mochila${item.category === "clothing" ? ": ponételo desde ahí" : ""}.`);
}
function advance(room, session, stage) {
    session.welcome.stage = stage;
    room.savePlayer(session);
    sendWelcome(room, session);
}
function sendWelcome(room, session) {
    const { name, gender } = session.player;
    room.sendTo(session, shared_1.MessageType.Welcome, { ...session.welcome, name, gender: gender === "f" ? "f" : "m" });
}
//# sourceMappingURL=welcome.js.map