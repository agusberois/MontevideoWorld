import type { CommandHandler } from "./types";

/** `Map` y no objeto: "constructor" o "__proto__" no pueden colarse como valor. */
const VALUES = new Map<string, boolean>([
  ["si", true],
  ["sí", true],
  ["no", false],
]);

/**
 * /donador <si|no> [jugador] (admin): marca o desmarca a un jugador del barrio como donador del
 * proyecto. Se guarda con su progreso y todos ven el distintivo arriba de su nombre. Sin nombre, a
 * quien lo usa.
 */
export const donador: CommandHandler = ({ client, player, args }, host) => {
  const [rawValue, ...nameParts] = args;
  const donor = rawValue ? VALUES.get(rawValue.toLocaleLowerCase("es")) : undefined;
  if (donor === undefined) return host.notice(client, "Usá: /donador <si|no> [jugador].");

  const name = nameParts.join(" ");
  let target = { client, player };
  if (name) {
    const matches = host.findPlayers(name);
    if (matches.length === 0) return host.notice(client, `No hay nadie llamado "${name}" en este barrio.`);
    if (matches.length > 1) return host.notice(client, `Hay ${matches.length} jugadores llamados "${name}": no sé a cuál marcar.`);
    target = matches[0];
  }
  if (target.player.donor === donor) {
    return host.notice(client, `${target.player.name} ${donor ? "ya es" : "no es"} donador.`);
  }

  const saved = host.setDonor(target.client, donor);
  const unsaved = saved ? "" : " (no tiene progreso guardado: se pierde al salir)";
  host.notice(client, donor ? `💛 ${target.player.name} ahora es donador${unsaved}.` : `${target.player.name} ya no es donador${unsaved}.`);
  if (donor && target.client !== client) host.notice(target.client, "💛 ¡Gracias por apoyar a Montevideo World! Ahora todos ven que sos donador.");
};
