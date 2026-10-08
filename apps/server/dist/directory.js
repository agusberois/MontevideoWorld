"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerDirectory = void 0;
const shared_1 = require("@montevideo-world/shared");
/**
 * Quién está conectado ahora en todos los barrios (cada sala anota a los suyos al entrar y los saca
 * al salir), para los mensajes privados entre barrios (`/mensaje`) y para `/trace`. Vive en memoria del proceso,
 * como `activeSessions`: alcanza con una sola instancia del server; para escalar habría que pasarlo
 * a presence.
 */
class PlayerDirectory {
    constructor() {
        this.players = new Map();
    }
    add(player) {
        this.players.set(player.sessionId, player);
    }
    remove(sessionId) {
        this.players.delete(sessionId);
    }
    /** Conectados con este `playerId` (en cualquier barrio; una clave = una sesión, así que uno como mucho). */
    byPlayerId(playerId) {
        for (const player of this.players.values())
            if (player.playerId === playerId)
                return player;
        return undefined;
    }
    /** Conectados con ese nombre o uno que se ve igual (`nameKey`: mayúsculas, tildes, letras parecidas). */
    find(name) {
        const wanted = (0, shared_1.nameKey)(name);
        return [...this.players.values()].filter((player) => (0, shared_1.nameKey)(player.name) === wanted);
    }
}
exports.playerDirectory = new PlayerDirectory();
//# sourceMappingURL=directory.js.map