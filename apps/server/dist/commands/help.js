"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.help = void 0;
const shared_1 = require("@montevideo-world/shared");
/** /help: lista sólo los comandos que este jugador puede usar. */
const help = ({ client, player }, host) => {
    const lines = shared_1.COMMANDS.filter((command) => (0, shared_1.canUseCommand)(command, player.admin)).map((command) => `${command.usage}: ${command.description}`);
    host.notice(client, `Comandos: ${lines.join(" · ")}`);
};
exports.help = help;
//# sourceMappingURL=help.js.map