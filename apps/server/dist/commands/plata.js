"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plata = void 0;
const shared_1 = require("@montevideo-world/shared");
/** "999", "1000" o "1.000" (con puntos de miles). */
const AMOUNT = /^(\d+|\d{1,3}(\.\d{3})+)$/;
/**
 * /plata <monto> [jugador] (admin): carga plata a un jugador del barrio por su nombre (puede tener
 * espacios: "/plata 500 juan perez"). Sin nombre, se la carga a quien lo usa.
 */
const plata = ({ client, player, args }, host) => {
    const [rawAmount, ...nameParts] = args;
    const amount = rawAmount && AMOUNT.test(rawAmount) ? Number(rawAmount.replace(/\./g, "")) : NaN;
    if (!(0, shared_1.isValidAmount)(amount)) {
        return host.notice(client, `Usá: /plata <monto> [jugador], con un monto entero entre $1 y ${(0, shared_1.formatMoney)(shared_1.MAX_MONEY)}.`);
    }
    const name = nameParts.join(" ");
    let target = { client, player };
    if (name) {
        const matches = host.findPlayers(name);
        if (matches.length === 0)
            return host.notice(client, `No hay nadie llamado "${name}" en este barrio.`);
        if (matches.length > 1)
            return host.notice(client, `Hay ${matches.length} jugadores llamados "${name}": no sé a cuál cargarle.`);
        target = matches[0];
    }
    if (!host.giveMoney(target.client, amount)) {
        return host.notice(client, `No se pudo: ${target.player.name} pasaría el tope de ${(0, shared_1.formatMoney)(shared_1.MAX_MONEY)}.`);
    }
    if (target.client === client)
        return host.notice(client, `💰 Te cargaste ${(0, shared_1.formatMoney)(amount)}.`);
    host.notice(client, `💰 Le cargaste ${(0, shared_1.formatMoney)(amount)} a ${target.player.name}.`);
    host.notice(target.client, `💰 ${player.name} te cargó ${(0, shared_1.formatMoney)(amount)}.`);
};
exports.plata = plata;
//# sourceMappingURL=plata.js.map