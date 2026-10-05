import type { CommandHandler } from "./types";

/** /guia: vuelve a abrir la guía de bienvenida desde el principio (repetirla no da premios). */
export const guia: CommandHandler = ({ client }, host) => host.restartTutorial(client);
