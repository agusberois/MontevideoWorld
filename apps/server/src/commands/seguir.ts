import type { CommandHandler } from "./types";

/**
 * /seguir <jugador>: caminás solo detrás de un jugador del barrio (el nombre puede tener espacios).
 * /seguir sin nombre deja de seguir.
 */
export const seguir: CommandHandler = ({ client, args }, host) => {
  const name = args.join(" ");
  if (!name) return host.follow(client, null);
  const matches = host.findOnline(name);
  if (matches.length === 0) return host.notice(client, `No hay nadie conectado llamado "${name}".`);
  if (matches.length > 1) return host.notice(client, `Hay ${matches.length} jugadores conectados llamados "${matches[0].name}": no sé a cuál seguir.`);
  host.follow(client, matches[0]);
};
