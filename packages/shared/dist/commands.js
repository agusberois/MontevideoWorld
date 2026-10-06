"use strict";
/**
 * Comandos de chat ("/box", "/post hola"…). Acá vive sólo la definición (nombre, uso, quién puede
 * usarlo) para que cliente y servidor la compartan: el server la usa para validar permisos y armar
 * `/help`; el cliente puede usarla para autocompletar. La lógica de cada comando está en el server
 * (`apps/server/src/commands/`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMANDS = exports.COMMAND_PREFIX = exports.MAX_MUTE_MINUTES = void 0;
exports.getCommand = getCommand;
exports.canUseCommand = canUseCommand;
exports.parseCommand = parseCommand;
/** `/silenciar`: máximo de minutos (un día; se levanta antes si se reinicia el server). */
exports.MAX_MUTE_MINUTES = 24 * 60;
/** Todo comando empieza con este carácter. */
exports.COMMAND_PREFIX = "/";
/** Catálogo de comandos. Para agregar uno: definirlo acá y registrar su handler en el server. */
exports.COMMANDS = [
    { name: "help", usage: "/help", description: "Lista los comandos que podés usar.", role: "user" },
    { name: "barra", usage: "/barra <texto>", description: "Mensaje a todos los de tu barra que estén conectados, en cualquier barrio.", role: "user" },
    {
        name: "mensaje",
        usage: "/mensaje <jugador> <texto>",
        description: "Mensaje privado a un jugador conectado, esté en el barrio que esté. Sólo lo ve él.",
        role: "user",
    },
    {
        name: "seguir",
        usage: "/seguir [jugador]",
        description: "Caminás solo detrás de un jugador del barrio. Sin nombre (o clic en el piso), dejás de seguir.",
        role: "user",
    },
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
    {
        name: "curar",
        usage: "/curar [jugador]",
        description: "Llena energía, hambre y salud de un jugador del barrio (sin nombre, a vos).",
        role: "admin",
    },
    {
        name: "ban",
        usage: "/ban <minutos> <jugador>",
        description: "Manda al jugador preso al COMCAR por esos minutos (aunque salga y vuelva a entrar). Con 0, lo libera.",
        role: "admin",
    },
    {
        name: "silenciar",
        usage: "/silenciar <minutos> <jugador>",
        description: "No deja hablar a un jugador conectado (chat, mensajes, saludos) por esos minutos. Con 0, lo vuelve a dejar.",
        role: "admin",
    },
    {
        name: "trace",
        usage: "/trace <jugador>",
        description: "Te lleva al lado de un jugador conectado, esté en el barrio que esté (sin boleto).",
        role: "admin",
    },
    {
        name: "mover",
        usage: "/mover <jugador>",
        description: "Trae a un jugador conectado a tu mismo tile, esté en el barrio que esté (sin boleto).",
        role: "admin",
    },
    {
        name: "god",
        usage: "/god",
        description: "Modo vuelo: volás por arriba de todo, rápido y sin que nadie te vea (clic adonde ir). /god otra vez para bajar a la baldosa más cercana.",
        role: "admin",
    },
    {
        name: "guia",
        usage: "/guia",
        description: "Vuelve a abrir la guía de bienvenida (repetirla no da premios).",
        role: "user",
    },
    {
        name: "donador",
        usage: "/donador <si|no> [jugador]",
        description: "Marca (o desmarca) a un jugador del barrio como donador del proyecto (sin nombre, a vos).",
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