import type { CommandHandler } from "./types";

/**
 * /trace <jugador> (admin): te lleva al lado de un jugador conectado, esté en el barrio (o la copia
 * del barrio) que esté. El nombre puede tener espacios. Entre barrios viaja sin gastar boleto.
 */
export const trace: CommandHandler = ({ client, args }, host) => {
  const name = args.join(" ");
  if (!name) return host.notice(client, "Usá: /trace <jugador>.");
  const matches = host.findOnline(name);
  if (matches.length === 0) return host.notice(client, `No hay nadie conectado llamado "${name}".`);
  if (matches.length > 1) return host.notice(client, `Hay ${matches.length} jugadores conectados llamados "${matches[0].name}": no sé a cuál ir.`);
  if (matches[0].sessionId === client.sessionId) return host.notice(client, "Ya estás al lado tuyo.");
  host.traceTo(client, matches[0]);
};
