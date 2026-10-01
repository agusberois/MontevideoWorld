import type { Client } from "@colyseus/core";
import type { Player } from "@montevideo-world/shared/schema";

/** Quién ejecutó el comando y con qué argumentos. */
export interface CommandContext {
  client: Client;
  player: Player;
  /** Argumentos separados por espacios ("/box 3" → ["3"]). */
  args: string[];
  /** Todo el texto después del nombre ("/post hola che" → "hola che"). */
  rest: string;
}

/**
 * Lo que un comando puede hacer en la sala. Es una interfaz chica a propósito: los comandos no
 * tocan el estado privado de `CityRoom`, sólo piden acciones (que la sala valida y comunica).
 */
export interface CommandHost {
  /** Aviso privado para el jugador. */
  notice(client: Client, text: string): void;
  /** Agrega hasta `quantity` unidades a la mochila; devuelve cuántas entraron (y reenvía la mochila). */
  giveItem(client: Client, itemId: string, quantity: number): number;
  /** Anuncio en el medio de la pantalla para todos los barrios. */
  announce(name: string, text: string): void;
  /** Jugadores de esta sala cuyo nombre coincide (sin distinguir mayúsculas). */
  findPlayers(name: string): Array<{ client: Client; player: Player }>;
  /** Suma `amount` al saldo (y le reenvía el saldo); false si se pasa del tope. */
  giveMoney(client: Client, amount: number): boolean;
}

export type CommandHandler = (context: CommandContext, host: CommandHost) => void;
