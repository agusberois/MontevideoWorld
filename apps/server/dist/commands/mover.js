"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mover = void 0;
/**
 * /mover <jugador> (admin): trae a un jugador conectado al mismo tile donde está el admin, esté en el
 * barrio (o la copia del barrio) que esté. Es `/trace` al revés. El nombre puede tener espacios.
 */
const mover = ({ client, args }, host) => {
    const name = args.join(" ");
    if (!name)
        return host.notice(client, "Usá: /mover <jugador>.");
    const matches = host.findOnline(name);
    if (matches.length === 0)
        return host.notice(client, `No hay nadie conectado llamado "${name}".`);
    if (matches.length > 1)
        return host.notice(client, `Hay ${matches.length} jugadores conectados llamados "${matches[0].name}": no sé a cuál mover.`);
    if (matches[0].sessionId === client.sessionId)
        return host.notice(client, "Ya estás donde estás.");
    host.summon(client, matches[0]);
};
exports.mover = mover;
//# sourceMappingURL=mover.js.map