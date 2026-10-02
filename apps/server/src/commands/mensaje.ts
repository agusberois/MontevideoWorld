import type { CommandHandler } from "./types";

/**
 * /mensaje <jugador> <texto>: mensaje privado a un jugador conectado en cualquier barrio. El nombre
 * puede tener espacios ("/mensaje juan perez hola"): se toma el nombre conectado más largo con el
 * que empieza el mensaje, y el resto es el texto.
 */
export const mensaje: CommandHandler = ({ client, player, args }, host) => {
  const usage = "Usá: /mensaje <jugador> <texto>.";
  if (args.length < 2) return host.notice(client, usage);

  for (let words = args.length - 1; words >= 1; words -= 1) {
    const name = args.slice(0, words).join(" ");
    const matches = host.findOnline(name);
    if (matches.length === 0) continue;

    const text = args.slice(words).join(" ");
    if (matches.length > 1) {
      return host.notice(client, `Hay ${matches.length} jugadores conectados llamados "${matches[0].name}": no sé a cuál mandárselo.`);
    }
    if (matches[0].sessionId === client.sessionId) return host.notice(client, "No te podés mandar un mensaje a vos mismo.");
    host.sendPrivate(client, player, matches[0], text);
    return;
  }
  host.notice(client, `No hay nadie conectado llamado "${args[0]}". ${usage}`);
};
