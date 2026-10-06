import type { CommandHandler } from "./types";

/** /barra <texto>: mensaje a todos los integrantes de tu barra que estén conectados, en cualquier barrio. */
export const barra: CommandHandler = ({ client, rest }, host) => {
  if (!rest) return host.notice(client, "Usá: /barra <texto>.");
  const problem = host.chatBarra(client, rest);
  if (problem) host.notice(client, problem);
};
