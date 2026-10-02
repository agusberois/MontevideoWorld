import type { CommandHandler } from "./types";

/**
 * /curar [jugador] (admin): llena energía, hambre y salud de un jugador del barrio (el nombre puede
 * tener espacios). Sin nombre, a quien lo usa. Sirve para probar y para ayudar a alguien trabado.
 */
export const curar: CommandHandler = ({ client, player, args }, host) => {
  const name = args.join(" ");
  let target = { client, player };
  if (name) {
    const matches = host.findPlayers(name);
    if (matches.length === 0) return host.notice(client, `No hay nadie llamado "${name}" en este barrio.`);
    if (matches.length > 1) return host.notice(client, `Hay ${matches.length} jugadores llamados "${name}": no sé a cuál curar.`);
    target = matches[0];
  }
  host.healFully(target.client);
  if (target.client === client) return host.notice(client, "❤ Te curaste: energía, hambre y salud al 100.");
  host.notice(client, `❤ Curaste a ${target.player.name}: energía, hambre y salud al 100.`);
  host.notice(target.client, "❤ El admin te curó: energía, hambre y salud al 100.");
};
