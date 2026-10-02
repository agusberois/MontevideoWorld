import { CommandName, canUseCommand, getCommand, parseCommand } from "@montevideo-world/shared";
import { box } from "./box";
import { donador } from "./donador";
import { help } from "./help";
import { mensaje } from "./mensaje";
import { plata } from "./plata";
import { post } from "./post";
import type { CommandContext, CommandHandler, CommandHost } from "./types";

export type { CommandHost } from "./types";

/**
 * Handler de cada comando del catálogo (`COMMANDS` en shared). El `Record` obliga a que todo
 * comando definido tenga su handler: para sumar uno, definirlo en shared y agregarlo acá.
 */
const HANDLERS: Record<CommandName, CommandHandler> = { help, mensaje, post, box, plata, donador };

/**
 * Si el texto del chat es un comando, lo ejecuta (o avisa por qué no) y devuelve true: no va al
 * chat. Devuelve false si no empieza con "/".
 */
export function runCommand(text: string, context: Omit<CommandContext, "args" | "rest">, host: CommandHost): boolean {
  const parsed = parseCommand(text);
  if (!parsed) return false;

  const command = getCommand(parsed.name);
  if (!command) {
    host.notice(context.client, `No existe el comando /${parsed.name}. Probá /help.`);
    return true;
  }
  if (!canUseCommand(command, context.player.admin)) {
    host.notice(context.client, `El comando /${command.name} es sólo para el admin.`);
    return true;
  }
  HANDLERS[command.name as CommandName]({ ...context, args: parsed.args, rest: parsed.rest }, host);
  return true;
}
