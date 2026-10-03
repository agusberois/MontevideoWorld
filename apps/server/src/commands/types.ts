import type { Client } from "@colyseus/core";
import type { Player } from "@montevideo-world/shared/schema";
import type { OnlinePlayer } from "../directory";

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
  /**
   * Marca o desmarca al jugador como donador (lo ven todos) y lo guarda ya. Devuelve false si el
   * jugador no tiene clave: se ve ahora, pero no queda guardado para la próxima vez.
   */
  setDonor(client: Client, donor: boolean): boolean;
  /** Jugadores conectados en cualquier barrio con ese nombre (sin distinguir mayúsculas). */
  findOnline(name: string): OnlinePlayer[];
  /** Mensaje privado de `player` a `to` (esté en el barrio que esté); a quien lo manda le vuelve una copia. */
  sendPrivate(client: Client, player: Player, to: OnlinePlayer, text: string): void;
  /**
   * Lleva al jugador al lado de `to`: en la misma sala lo teletransporta; si está en otra (otro
   * barrio u otra copia) le da un pase gratis a esa sala y aparece al lado al entrar.
   */
  traceTo(client: Client, to: OnlinePlayer): void;
  /** Llena energía, hambre y salud (y se las reenvía). */
  healFully(client: Client): void;
  /**
   * Preso al COMCAR hasta `until` (ms; 0 = liberarlo). Conectado (`target`), lo lleva su sala; si
   * no, queda anotado por nombre y por las claves guardadas con ese nombre, para cuando entre.
   */
  jail(target: OnlinePlayer | null, name: string, until: number): void;
  /** Deja en el log `[Admin]` un comando de admin (o el intento de usarlo sin serlo). */
  audit(client: Client, text: string, allowed: boolean): void;
}

export type CommandHandler = (context: CommandContext, host: CommandHost) => void;
