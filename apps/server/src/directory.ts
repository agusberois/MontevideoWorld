import type { ChatBroadcastMessage } from "@montevideo-world/shared";

/** Sala que puede entregarle un mensaje privado a uno de sus jugadores. */
export interface PrivateMailbox {
  deliverPrivate(sessionId: string, message: ChatBroadcastMessage): void;
}

/** Un jugador conectado, en cualquier barrio. */
export interface OnlinePlayer {
  sessionId: string;
  name: string;
  cityName: string;
  mailbox: PrivateMailbox;
}

/**
 * Quién está conectado ahora en todos los barrios (cada sala anota a los suyos al entrar y los saca
 * al salir), para los mensajes privados entre barrios (`/mensaje`). Vive en memoria del proceso,
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

  /** Conectados con ese nombre (sin distinguir mayúsculas ni espacios de más). */
  find(name: string): OnlinePlayer[] {
    const wanted = normalizeName(name);
    return [...this.players.values()].filter((player) => normalizeName(player.name) === wanted);
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export const playerDirectory = new PlayerDirectory();
