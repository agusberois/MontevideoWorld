import { COMMANDS, canUseCommand } from "@montevideo-world/shared";
import type { CommandHandler } from "./types";

/** /help: lista sólo los comandos que este jugador puede usar. */
export const help: CommandHandler = ({ client, player }, host) => {
  const lines = COMMANDS.filter((command) => canUseCommand(command, player.admin)).map(
    (command) => `${command.usage}: ${command.description}`,
  );
  host.notice(client, `Comandos: ${lines.join(" · ")}`);
};
