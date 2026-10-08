"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bans = exports.NAME_BAN_MAX_MS = void 0;
const shared_1 = require("@montevideo-world/shared");
const playerStore_1 = require("./playerStore");
/**
 * Presos en el COMCAR (`/ban`): hasta cuándo (ms, `Date.now()`). Se anotan por id del jugador
 * (`playerId`, el hash de su clave, como en `playerStore`)
 * (y quedan en su guardado, `PlayerRecord.jailedUntil`, así siguen presos si se reinicia el server)
 * y también por nombre, para los que entran sin clave o banear a alguien que no está conectado.
 * Vive en memoria del proceso, como `playerDirectory`: alcanza con una sola instancia.
 *
 * **El ban por nombre vence solo** a las `NAME_BAN_MAX_MS` como mucho, aunque la condena sea más
 * larga: frena al que borra los datos del sitio y vuelve con el mismo nombre, pero no deja preso por
 * días a cualquiera que después use ese nombre (o uno parecido). La condena entera va por id.
 */
exports.NAME_BAN_MAX_MS = 60 * 60 * 1000;
class Bans {
    constructor() {
        /** Id (`playerId`) → hasta cuándo. 0 = liberado a mano (pisa lo que diga el guardado). */
        this.byId = new Map();
        this.byName = new Map();
    }
    /** Preso hasta `until` (0 = liberarlo). `id`: `playerId` de su clave, o null si no tiene. */
    set(id, name, until, now = Date.now()) {
        if (id)
            this.byId.set(id, until);
        this.byName.set(normalizeName(name), until === 0 ? 0 : Math.min(until, now + exports.NAME_BAN_MAX_MS));
        // Los vencidos no sirven para nada: que el Map no crezca con cada ban.
        for (const [other, at] of this.byName)
            if (at <= now && other !== normalizeName(name))
                this.byName.delete(other);
    }
    /** Hasta cuándo está preso (0 si no lo está o ya cumplió). */
    until(key, name, now = Date.now()) {
        const id = key ? (0, playerStore_1.playerId)(key) : null;
        const byKey = id ? (this.byId.get(id) ?? playerStore_1.playerStore.getById(id)?.jailedUntil ?? 0) : 0;
        const byName = this.byName.get(normalizeName(name)) ?? 0;
        const until = Math.max(byKey, byName);
        return until > now ? until : 0;
    }
    /** Para el guardado: hasta cuándo está preso por su clave (undefined si no lo está). */
    savedUntil(key) {
        const id = (0, playerStore_1.playerId)(key);
        const until = this.byId.get(id) ?? playerStore_1.playerStore.getById(id)?.jailedUntil ?? 0;
        return until > Date.now() ? until : undefined;
    }
}
/** Por nombre se compara como en todos lados (`nameKey`): un parecido no evade el ban. */
const normalizeName = shared_1.nameKey;
exports.bans = new Bans();
//# sourceMappingURL=bans.js.map