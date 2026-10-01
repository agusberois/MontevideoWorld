"use strict";
/**
 * Comandos de chat ("/box", "/post hola"…). Acá vive sólo la definición (nombre, uso, quién puede
 * usarlo) para que cliente y servidor la compartan: el server la usa para validar permisos y armar
 * `/help`; el cliente puede usarla para autocompletar. La lógica de cada comando está en el server
 * (`apps/server/src/commands/`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMANDS = exports.COMMAND_PREFIX = void 0;
exports.getCommand = getCommand;
exports.canUseCommand = canUseCommand;
exports.parseCommand = parseCommand;
/** Todo comando empieza con este carácter. */
exports.COMMAND_PREFIX = "/";
/** Catálogo de comandos. Para agregar uno: definirlo acá y registrar su handler en el server. */
exports.COMMANDS = [
    { name: "help", usage: "/help", description: "Lista los comandos que podés usar.", role: "user" },
    {
        name: "post",
        usage: "/post <mensaje>",
        description: "Anuncio en el medio de la pantalla para todos los barrios.",
        role: "admin",
    },
    {
        name: "box",
        usage: "/box [cantidad]",
        description: "Te da cajas sorpresa en la mochila (1 a 10). Se pueden pasar por intercambio.",
        role: "admin",
    },
    {
        name: "plata",
        usage: "/plata <monto> [jugador]",
        description: "Carga plata a un jugador del barrio (sin nombre, a vos).",
        role: "admin",
    },
];
function getCommand(name) {
    return exports.COMMANDS.find((command) => command.name === name);
}
/** ¿Puede usar este comando alguien con (o sin) permisos de admin? */
function canUseCommand(command, isAdmin) {
    return command.role === "user" || isAdmin;
}
/** "/Post hola que tal" → { name: "post", rest: "hola que tal", args: [...] }; null si no es un comando. */
function parseCommand(text) {
    if (!text.startsWith(exports.COMMAND_PREFIX))
        return null;
    const match = /^\/(\S+)\s*(.*)$/s.exec(text.trim());
    if (!match)
        return null;
    const rest = match[2].trim();
    return { name: match[1].toLowerCase(), rest, args: rest ? rest.split(/\s+/) : [] };
}
//# sourceMappingURL=commands.js.map