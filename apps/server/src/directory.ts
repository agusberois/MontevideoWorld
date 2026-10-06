import { ChatBroadcastMessage, TilePoint, nameKey } from "@montevideo-world/shared";

/** Sala que puede entregarle un mensaje privado a uno de sus jugadores y decir dónde está (`/trace`). */
export interface PrivateMailbox {
  readonly roomId: string;
  deliverPrivate(sessionId: string, message: ChatBroadcastMessage): void;
  tileOf(sessionId: string): TilePoint | undefined;
  /** Preso al COMCAR hasta `until` (ms; 0 = liberarlo): lo anota y lo lleva (o lo suelta). */
  jail(sessionId: string, until: number): void;
  /** Silenciado hasta `until` (ms; 0 = levantarlo), por `/silenciar`. */
  mute(sessionId: string, until: number): void;
  /**
   * Lo manda a la sala `roomId` (barrio `cityId`) y al tile `at` (`/mover`), con un pase gratis.
   * Devuelve por qué no se pudo (null = va en camino).
   */
  summon(sessionId: string, place: { cityId: string; roomId: string; at: TilePoint; by: string }): string | null;
  /** Vuelve a leer su barra (sigla y color sobre el avatar) y le manda el panel actualizado. */
  refreshBarra(sessionId: string): void;
}

/** Un jugador conectado, en cualquier barrio. */
export interface OnlinePlayer {
  sessionId: string;
  name: string;
  cityId: string;
  cityName: string;
  /** `playerId` de su clave (null si entró sin clave): para saber qué integrantes de una barra están conectados. */
  playerId: string | null;
  mailbox: PrivateMailbox;
}

/**
 * Quién está conectado ahora en todos los barrios (cada sala anota a los suyos al entrar y los saca
 * al salir), para los mensajes privados entre barrios (`/mensaje`) y para `/trace`. Vive en memoria del proceso,
 * como `activeSessions`: alcanza con una sola instancia del server; para escalar habría que pasarlo
 * a presence.
 */
class PlayerDirectory {
  private readonly players = new Map<string, OnlinePlayer>();

  add(player: OnlinePlayer) {
    this.players.set(player.sessionId, player);
  }

  remove(sessionId: string) {
    this.players.delete(sessionId);
  }

  /** Conectados con este `playerId` (en cualquier barrio; una clave = una sesión, así que uno como mucho). */
  byPlayerId(playerId: string): OnlinePlayer | undefined {
    for (const player of this.players.values()) if (player.playerId === playerId) return player;
    return undefined;
  }

  /** Conectados con ese nombre o uno que se ve igual (`nameKey`: mayúsculas, tildes, letras parecidas). */
  find(name: string): OnlinePlayer[] {
    const wanted = nameKey(name);
    return [...this.players.values()].filter((player) => nameKey(player.name) === wanted);
  }
}

export const playerDirectory = new PlayerDirectory();
