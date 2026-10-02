/**
 * Comandos de chat ("/box", "/post hola"…). Acá vive sólo la definición (nombre, uso, quién puede
 * usarlo) para que cliente y servidor la compartan: el server la usa para validar permisos y armar
 * `/help`; el cliente puede usarla para autocompletar. La lógica de cada comando está en el server
 * (`apps/server/src/commands/`).
 */
/** Todo comando empieza con este carácter. */
export declare const COMMAND_PREFIX = "/";
/** Quién puede usar un comando: cualquier jugador o sólo el admin. */
export type CommandRole = "user" | "admin";
export interface CommandDefinition {
    /** Nombre sin la barra, en minúsculas: "box". */
    name: string;
    /** Cómo se usa, para la ayuda: "/box [cantidad]". */
    usage: string;
    description: string;
    role: CommandRole;
}
/** Catálogo de comandos. Para agregar uno: definirlo acá y registrar su handler en el server. */
export declare const COMMANDS: readonly [{
    readonly name: "help";
    readonly usage: "/help";
    readonly description: "Lista los comandos que podés usar.";
    readonly role: "user";
}, {
    readonly name: "mensaje";
    readonly usage: "/mensaje <jugador> <texto>";
    readonly description: "Mensaje privado a un jugador conectado, esté en el barrio que esté. Sólo lo ve él.";
    readonly role: "user";
}, {
    readonly name: "post";
    readonly usage: "/post <mensaje>";
    readonly description: "Anuncio en el medio de la pantalla para todos los barrios.";
    readonly role: "admin";
}, {
    readonly name: "box";
    readonly usage: "/box [cantidad]";
    readonly description: "Te da cajas sorpresa en la mochila (1 a 10). Se pueden pasar por intercambio.";
    readonly role: "admin";
}, {
    readonly name: "plata";
    readonly usage: "/plata <monto> [jugador]";
    readonly description: "Carga plata a un jugador del barrio (sin nombre, a vos).";
    readonly role: "admin";
}, {
    readonly name: "curar";
    readonly usage: "/curar [jugador]";
    readonly description: "Llena energía, hambre y salud de un jugador del barrio (sin nombre, a vos).";
    readonly role: "admin";
}, {
    readonly name: "ban";
    readonly usage: "/ban <minutos> <jugador>";
    readonly description: "Manda al jugador preso al COMCAR por esos minutos (aunque salga y vuelva a entrar). Con 0, lo libera.";
    readonly role: "admin";
}, {
    readonly name: "trace";
    readonly usage: "/trace <jugador>";
    readonly description: "Te lleva al lado de un jugador conectado, esté en el barrio que esté (sin boleto).";
    readonly role: "admin";
}, {
    readonly name: "donador";
    readonly usage: "/donador <si|no> [jugador]";
    readonly description: "Marca (o desmarca) a un jugador del barrio como donador del proyecto (sin nombre, a vos).";
    readonly role: "admin";
}];
export type CommandName = (typeof COMMANDS)[number]["name"];
export declare function getCommand(name: string): CommandDefinition | undefined;
/** ¿Puede usar este comando alguien con (o sin) permisos de admin? */
export declare function canUseCommand(command: CommandDefinition, isAdmin: boolean): boolean;
export interface ParsedCommand {
    /** En minúsculas y sin la barra. */
    name: string;
    /** Lo que viene después del nombre, recortado ("" si no hay nada). */
    rest: string;
    /** `rest` partido por espacios. */
    args: string[];
}
/** "/Post hola que tal" → { name: "post", rest: "hola que tal", args: [...] }; null si no es un comando. */
export declare function parseCommand(text: string): ParsedCommand | null;
//# sourceMappingURL=commands.d.ts.map