"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
const shared_1 = require("@montevideo-world/shared");
const ban_1 = require("./ban");
const barra_1 = require("./barra");
const box_1 = require("./box");
const curar_1 = require("./curar");
const donador_1 = require("./donador");
const god_1 = require("./god");
const help_1 = require("./help");
const mensaje_1 = require("./mensaje");
const mover_1 = require("./mover");
const plata_1 = require("./plata");
const post_1 = require("./post");
const seguir_1 = require("./seguir");
const silenciar_1 = require("./silenciar");
const trace_1 = require("./trace");
/**
 * Handler de cada comando del catálogo (`COMMANDS` en shared). El `Record` obliga a que todo
 * comando definido tenga su handler: para sumar uno, definirlo en shared y agregarlo acá.
 */
const HANDLERS = { help: help_1.help, barra: barra_1.barra, mensaje: mensaje_1.mensaje, post: post_1.post, box: box_1.box, plata: plata_1.plata, donador: donador_1.donador, god: god_1.god, trace: trace_1.trace, mover: mover_1.mover, ban: ban_1.ban, curar: curar_1.curar, silenciar: silenciar_1.silenciar, seguir: seguir_1.seguir };
/**
 * Si el texto del chat es un comando, lo ejecuta (o avisa por qué no) y devuelve true: no va al
 * chat. Devuelve false si no empieza con "/".
 */
function runCommand(text, context, host) {
    const parsed = (0, shared_1.parseCommand)(text);
    if (!parsed)
        return false;
    const command = (0, shared_1.getCommand)(parsed.name);
    if (!command) {
        host.notice(context.client, `No existe el comando /${parsed.name}. Probá /help.`);
        return true;
    }
    // Todo comando de admin queda en el log, con quién lo usó y desde dónde (también los intentos).
    if (command.role !== "user")
        host.audit(context.client, text, context.player.admin);
    if (!(0, shared_1.canUseCommand)(command, context.player.admin)) {
        host.notice(context.client, `El comando /${command.name} es sólo para el admin.`);
        return true;
    }
    HANDLERS[command.name]({ ...context, args: parsed.args, rest: parsed.rest }, host);
    return true;
}
//# sourceMappingURL=index.js.map