import { MAX_BAN_MINUTES } from "@montevideo-world/shared";
import { NAME_BAN_MAX_MS } from "../bans";
import type { CommandHandler } from "./types";

/**
 * /ban <minutos> <jugador> (admin): lo manda preso al COMCAR por esos minutos, esté en el barrio
 * que esté (y si no está conectado, cuando entre). Con 0 minutos lo libera. El nombre puede tener
 * espacios.
 */
export const ban: CommandHandler = ({ client, args }, host) => {
  const usage = `Usá: /ban <minutos> <jugador>, con 0 a ${MAX_BAN_MINUTES} minutos (0 = liberarlo).`;
  const [rawMinutes, ...nameParts] = args;
  const minutes = rawMinutes && /^\d+$/.test(rawMinutes) ? Number(rawMinutes) : NaN;
  const name = nameParts.join(" ");
  if (!Number.isSafeInteger(minutes) || minutes > MAX_BAN_MINUTES || !name) return host.notice(client, usage);

  const online = host.findOnline(name);
  if (online.length > 1) return host.notice(client, `Hay ${online.length} jugadores conectados llamados "${online[0].name}": no sé a cuál.`);
  const target = online[0] ?? null;
  if (target?.sessionId === client.sessionId) return host.notice(client, "No te podés mandar preso a vos mismo.");

  const touched = host.jail(target, target?.name ?? name, minutes === 0 ? 0 : Date.now() + minutes * 60_000);
  const who = target?.name ?? name;
  if (minutes === 0) {
    const others = !target && touched > 1 ? ` (${touched} jugadores guardados con ese nombre)` : "";
    return host.notice(client, `🔓 ${who} quedó libre${others}.`);
  }
  if (target) return host.notice(client, `🚔 ${who} va preso al COMCAR por ${minutes} min.`);

  // Desconectado: va por los jugadores guardados con ese nombre (o uno parecido) y por el nombre,
  // que vence solo. Avisar a cuántos toca: por nombre pueden ser personas distintas.
  const nameMinutes = Math.min(minutes, NAME_BAN_MAX_MS / 60_000);
  const scope =
    touched === 0
      ? `no hay nadie guardado con ese nombre: queda anotado sólo por nombre (${nameMinutes} min como mucho)`
      : touched === 1
        ? "cuando entre va directo al COMCAR"
        : `⚠️ hay ${touched} jugadores guardados con ese nombre (o uno muy parecido) y van presos todos: pueden ser personas distintas. Si te equivocaste, /ban 0 ${who}`;
  host.notice(client, `🚔 ${who} no está conectado (${minutes} min desde ahora): ${scope}.`);
};
