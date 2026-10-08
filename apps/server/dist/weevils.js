"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeevilManager = void 0;
const shared_1 = require("@montevideo-world/shared");
const schema_1 = require("@montevideo-world/shared/schema");
/** Cuánto queda el picudo aplastado en el piso antes de desaparecer (para la animación). */
const DEAD_MS = 700;
/**
 * Plaga de picudos de una sala: salen de las palmeras sacudidas, persiguen al jugador más cercano,
 * pican, se vuelven a la palmera y mueren a patadas. Escribe en `state.weevils` (Schema).
 */
class WeevilManager {
    constructor(weevils, host) {
        this.weevils = weevils;
        this.host = host;
        this.meta = new Map();
        /** "x,y" de la palmera → hasta cuándo no larga más picudos. */
        this.palmCooldowns = new Map();
        this.seq = 0;
    }
    /** Sacudir la palmera: salen picudos. Devuelve cuántos (0 si está en espera o el barrio está lleno). */
    shake(palm, now) {
        const key = `${palm.x},${palm.y}`;
        if ((this.palmCooldowns.get(key) ?? 0) > now)
            return 0;
        const room = shared_1.MAX_WEEVILS - this.weevils.size;
        const count = Math.min(room, shared_1.WEEVILS_PER_PALM.min + Math.floor(Math.random() * (shared_1.WEEVILS_PER_PALM.max - shared_1.WEEVILS_PER_PALM.min + 1)));
        if (count <= 0)
            return 0;
        this.palmCooldowns.set(key, now + shared_1.PALM_COOLDOWN_MS);
        for (let i = 0; i < count; i++) {
            this.seq += 1;
            const id = `w${this.seq}`;
            const weevil = new schema_1.Weevil();
            // Salen del pie de la palmera, un poco desparramados.
            const meta = {
                palm,
                bornAt: now + i * 150,
                lastBiteAt: 0,
                deadAt: 0,
                x: palm.x + (Math.random() - 0.5) * 0.6,
                y: palm.y + 0.3 + Math.random() * 0.3,
                mode: "emerge",
            };
            weevil.mode = (0, shared_1.weevilModeCode)("emerge");
            this.sync(weevil, meta);
            this.weevils.set(id, weevil);
            this.meta.set(id, meta);
        }
        return count;
    }
    /** Patada desde el tile `from`: si el picudo está vivo y al alcance, muere. */
    kick(id, from, now) {
        const weevil = this.weevils.get(id);
        const meta = this.meta.get(id);
        if (!weevil || !meta || meta.mode === "dead")
            return "missing";
        if (distanceSq(meta, from) > shared_1.WEEVIL_KICK_RANGE * shared_1.WEEVIL_KICK_RANGE)
            return "far";
        this.setMode(weevil, meta, "dead");
        if (weevil.targetId !== "")
            weevil.targetId = "";
        meta.deadAt = now;
        return "killed";
    }
    /** Cuántos picudos hay en la sala (vivos o aplastados todavía en el piso). */
    get size() {
        return this.weevils.size;
    }
    /** Simulación: llamar cada `dtMs`. Sin picudos no hace nada. */
    tick(dtMs, now) {
        if (this.weevils.size === 0)
            return;
        const step = (shared_1.WEEVIL_SPEED * dtMs) / 1000;
        // Los jugadores se piden una sola vez por tick (no una por picudo), y sólo si alguno persigue.
        let players = null;
        for (const [id, weevil] of this.weevils) {
            const meta = this.meta.get(id);
            if (!meta) {
                this.weevils.delete(id);
                continue;
            }
            if (meta.mode === "dead") {
                if (now - meta.deadAt > DEAD_MS)
                    this.remove(id);
                continue;
            }
            if (meta.mode === "emerge") {
                if (now - meta.bornAt < shared_1.WEEVIL_EMERGE_MS)
                    continue;
                this.setMode(weevil, meta, "chase");
            }
            const target = now - meta.bornAt < shared_1.WEEVIL_LIFETIME_MS ? this.nearestPlayer(meta, (players ??= this.host.players())) : null;
            if (!target) {
                // Nadie cerca (o ya se cansaron): vuelven a la palmera y se meten.
                this.setMode(weevil, meta, "leave");
                if (weevil.targetId !== "")
                    weevil.targetId = "";
                if (this.moveTowards(weevil, meta, meta.palm, step, 0.2))
                    this.remove(id);
                continue;
            }
            this.setMode(weevil, meta, "chase");
            if (weevil.targetId !== target.id)
                weevil.targetId = target.id;
            const distance = Math.sqrt(distanceSq(meta, target.tile));
            if (distance > shared_1.WEEVIL_BITE_RANGE * 0.7)
                this.moveTowards(weevil, meta, target.tile, step, shared_1.WEEVIL_BITE_RANGE * 0.7);
            if (distance <= shared_1.WEEVIL_BITE_RANGE && now - meta.lastBiteAt >= shared_1.WEEVIL_BITE_MS) {
                meta.lastBiteAt = now;
                weevil.bites += 1;
                this.host.bite(target.id);
            }
        }
    }
    /** El jugador más cercano dentro de `WEEVIL_AGGRO_RANGE` (no importa quién sacudió la palmera). */
    nearestPlayer(from, players) {
        let best = null;
        // Distancias al cuadrado: para comparar alcanza, sin raíces.
        let bestDistance = shared_1.WEEVIL_AGGRO_RANGE * shared_1.WEEVIL_AGGRO_RANGE;
        for (const player of players) {
            const distance = distanceSq(from, player.tile);
            if (distance <= bestDistance) {
                bestDistance = distance;
                best = player;
            }
        }
        return best;
    }
    /** Avanza hacia `to` hasta quedar a `stopAt` (y lo copia al Schema); true si ya llegó. */
    moveTowards(weevil, meta, to, step, stopAt) {
        const dx = to.x - meta.x;
        const dy = to.y - meta.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= stopAt)
            return true;
        // Si este paso alcanza, llegó: comparar después con la distancia recalculada fallaría por
        // redondeo (queda a 0,2000…04 y no llega nunca, ocupando lugar del tope `MAX_WEEVILS`).
        const arrives = step >= distance - stopAt;
        const advance = arrives ? distance - stopAt : step;
        meta.x += (dx / distance) * advance;
        meta.y += (dy / distance) * advance;
        this.sync(weevil, meta);
        return arrives;
    }
    /** Copia la posición al Schema en centésimas de tile (sólo lo que cambió viaja). */
    sync(weevil, meta) {
        const x = (0, shared_1.encodeWeevilCoord)(meta.x);
        const y = (0, shared_1.encodeWeevilCoord)(meta.y);
        if (weevil.x !== x)
            weevil.x = x;
        if (weevil.y !== y)
            weevil.y = y;
    }
    setMode(weevil, meta, mode) {
        if (meta.mode === mode)
            return;
        meta.mode = mode;
        weevil.mode = (0, shared_1.weevilModeCode)(mode);
    }
    remove(id) {
        this.weevils.delete(id);
        this.meta.delete(id);
    }
}
exports.WeevilManager = WeevilManager;
function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}
//# sourceMappingURL=weevils.js.map