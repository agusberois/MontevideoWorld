"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.post = void 0;
/** /post <mensaje> (admin): anuncio para todos los jugadores de todos los barrios. */
const post = ({ client, player, rest }, host) => {
    if (!rest)
        return host.notice(client, "Usá: /post <mensaje>");
    host.announce(player.name, rest);
};
exports.post = post;
//# sourceMappingURL=post.js.map