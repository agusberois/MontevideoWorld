import { MAX_MUTE_MINUTES } from "@montevideo-world/shared";
import type { CommandHandler } from "./types";

/**
 * /silenciar <minutos> <jugador> (admin): no lo deja hablar (chat, `/mensaje`, saludos, burlas) por
 * esos minutos, esté en el barrio que esté. Con 0 lo vuelve a dejar. Sólo a conectados: por nombre a
 * un desconectado le tocaría a cualquiera que después entre con ese nombre (ver `mutes.ts`).
 */
export const silenciar: CommandHandler = ({ client, args }, host) => {
  const usage = `Usá: /silenciar <minutos> <jugador>, con 0 a ${MAX_MUTE_MINUTES} minutos (0 = dejarlo hablar).`;
  const [rawMinutes, ...nameParts] = args;
  const minutes = rawMinutes && /^\d+$/.test(rawMinutes) ? Number(rawMinutes) : NaN;
  const name = nameParts.join(" ");
  if (!Number.isSafeInteger(minutes) || minutes > MAX_MUTE_MINUTES || !name) return host.notice(client, usage);

  const online = host.findOnline(name);
  if (online.length === 0) return host.notice(client, `No hay nadie conectado llamado "${name}".`);
  if (online.length > 1) return host.notice(client, `Hay ${online.length} jugadores conectados llamados "${online[0].name}": no sé a cuál.`);
  const [target] = online;
  if (target.sessionId === client.sessionId) return host.notice(client, "No te podés silenciar a vos mismo.");

  host.mute(target, minutes === 0 ? 0 : Date.now() + minutes * 60_000);
  host.notice(client, minutes === 0 ? `🔊 ${target.name} ya puede hablar.` : `🔇 ${target.name} quedó silenciado por ${minutes} min.`);
};
