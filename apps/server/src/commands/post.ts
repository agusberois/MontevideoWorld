import type { CommandHandler } from "./types";

/** /post <mensaje> (admin): anuncio para todos los jugadores de todos los barrios. */
export const post: CommandHandler = ({ client, player, rest }, host) => {
  if (!rest) return host.notice(client, "Usá: /post <mensaje>");
  host.announce(player.name, rest);
};
