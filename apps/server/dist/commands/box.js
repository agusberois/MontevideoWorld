"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.box = void 0;
const shared_1 = require("@montevideo-world/shared");
const MAX_BOXES_PER_COMMAND = 10;
/** /box [cantidad] (admin): cajas sorpresa a la mochila propia. Se pasan a otros por intercambio. */
const box = ({ client, args }, host) => {
    const quantity = args.length === 0 ? 1 : Number(args[0]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BOXES_PER_COMMAND) {
        return host.notice(client, `Usá: /box [cantidad], de 1 a ${MAX_BOXES_PER_COMMAND}.`);
    }
    const given = host.giveItem(client, shared_1.MYSTERY_BOX_ID, quantity);
    if (given === 0)
        return host.notice(client, "No tenés lugar en la mochila para la caja.");
    const boxes = given === 1 ? "Te llegó una caja sorpresa" : `Te llegaron ${given} cajas sorpresa`;
    const missing = quantity - given;
    host.notice(client, `🎁 ${boxes} a la mochila.${missing > 0 ? ` ${missing} no entraron: la mochila está llena.` : ""}`);
};
exports.box = box;
//# sourceMappingURL=box.js.map