"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.barra = void 0;
/** /barra <texto>: mensaje a todos los integrantes de tu barra que estén conectados, en cualquier barrio. */
const barra = ({ client, rest }, host) => {
    if (!rest)
        return host.notice(client, "Usá: /barra <texto>.");
    const problem = host.chatBarra(client, rest);
    if (problem)
        host.notice(client, problem);
};
exports.barra = barra;
//# sourceMappingURL=barra.js.map