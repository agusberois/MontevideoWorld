"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutes = void 0;
const shared_1 = require("@montevideo-world/shared");
const bans_1 = require("./bans");
const playerStore_1 = require("./playerStore");
/**
 * Silenciados (`/silenciar`): hasta cuándo (ms) no pueden hablar en el chat, mandar `/mensaje`,
 * saludar ni burlarse. Como `bans`: por id (`playerId` de la clave) la condena entera y por nombre
 * (`nameKey`) como mucho `NAME_BAN_MAX_MS`, para el que vuelve sin clave con el mismo nombre. Sólo en
 * memoria del proceso: reiniciar el server los levanta (es una sanción corta, no hace falta guardarla).
 */
class Mutes {
    constructor() {
        this.byId = new Map();
        this.byName = new Map();
    }
    /** Silenciado hasta `until` (0 = levantarlo). `key`: su clave, o null si no tiene. */
    set(key, name, until, now = Date.now()) {
        if (key)
            this.byId.set((0, playerStore_1.playerId)(key), until);
        this.byName.set((0, shared_1.nameKey)(name), until === 0 ? 0 : Math.min(until, now + bans_1.NAME_BAN_MAX_MS));
        for (const map of [this.byId, this.byName]) {
            for (const [other, at] of map)
                if (at !== until && at <= now)
                    map.delete(other);
        }
    }
    /** Hasta cuándo está silenciado (0 si no lo está). */
    until(key, name, now = Date.now()) {
        const byId = key ? (this.byId.get((0, playerStore_1.playerId)(key)) ?? 0) : 0;
        const until = Math.max(byId, this.byName.get((0, shared_1.nameKey)(name)) ?? 0);
        return until > now ? until : 0;
    }
}
exports.mutes = new Mutes();
//# sourceMappingURL=mutes.js.map