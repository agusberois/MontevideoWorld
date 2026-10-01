import { MapSchema } from "@colyseus/schema";
import {
  MAX_WEEVILS,
  PALM_COOLDOWN_MS,
  TilePoint,
  WEEVILS_PER_PALM,
  WEEVIL_AGGRO_RANGE,
  WEEVIL_BITE_MS,
  WEEVIL_BITE_RANGE,
  WEEVIL_EMERGE_MS,
  WEEVIL_KICK_RANGE,
  WEEVIL_LIFETIME_MS,
  WEEVIL_SPEED,
  WeevilMode,
} from "@montevideo-world/shared";
import { Weevil } from "@montevideo-world/shared/schema";

/** Lo que los picudos necesitan de la sala: dónde están los jugadores y cómo picarlos. */
export interface WeevilHost {
  /** Jugadores del barrio con su tile actual. */
  players(): Iterable<[string, TilePoint]>;
  /** Un picudo picó a este jugador. */
  bite(sessionId: string): void;
}

/** Estado de cada picudo que no viaja al cliente. */
interface WeevilMeta {
  palm: TilePoint;
  bornAt: number;
  lastBiteAt: number;
  deadAt: number;
}

/** Cuánto queda el picudo aplastado en el piso antes de desaparecer (para la animación). */
const DEAD_MS = 700;

/**
 * Plaga de picudos de una sala: salen de las palmeras sacudidas, persiguen al jugador más cercano,
 * pican, se vuelven a la palmera y mueren a patadas. Escribe en `state.weevils` (Schema).
 */
export class WeevilManager {
  private readonly meta = new Map<string, WeevilMeta>();
  /** "x,y" de la palmera → hasta cuándo no larga más picudos. */
  private readonly palmCooldowns = new Map<string, number>();
  private seq = 0;

  constructor(
    private readonly weevils: MapSchema<Weevil>,
    private readonly host: WeevilHost,
  ) {}

  /** Sacudir la palmera: salen picudos. Devuelve cuántos (0 si está en espera o el barrio está lleno). */
  shake(palm: TilePoint, now: number): number {
    const key = `${palm.x},${palm.y}`;
    if ((this.palmCooldowns.get(key) ?? 0) > now) return 0;
    const room = MAX_WEEVILS - this.weevils.size;
    const count = Math.min(room, WEEVILS_PER_PALM.min + Math.floor(Math.random() * (WEEVILS_PER_PALM.max - WEEVILS_PER_PALM.min + 1)));
    if (count <= 0) return 0;

    this.palmCooldowns.set(key, now + PALM_COOLDOWN_MS);
    for (let i = 0; i < count; i++) {
      this.seq += 1;
      const id = `w${this.seq}`;
      const weevil = new Weevil();
      // Salen del pie de la palmera, un poco desparramados.
      weevil.x = palm.x + (Math.random() - 0.5) * 0.6;
      weevil.y = palm.y + 0.3 + Math.random() * 0.3;
      weevil.mode = "emerge";
      this.weevils.set(id, weevil);
      this.meta.set(id, { palm, bornAt: now + i * 150, lastBiteAt: 0, deadAt: 0 });
    }
    return count;
  }

  /** Patada desde el tile `from`: si el picudo está vivo y al alcance, muere. */
  kick(id: string, from: TilePoint, now: number): "killed" | "far" | "missing" {
    const weevil = this.weevils.get(id);
    const meta = this.meta.get(id);
    if (!weevil || !meta || weevil.mode === "dead") return "missing";
    if (Math.hypot(weevil.x - from.x, weevil.y - from.y) > WEEVIL_KICK_RANGE) return "far";
    this.setMode(weevil, "dead");
    weevil.targetId = "";
    meta.deadAt = now;
    return "killed";
  }

  /** Simulación: llamar cada `dtMs`. */
  tick(dtMs: number, now: number) {
    const step = (WEEVIL_SPEED * dtMs) / 1000;
    for (const [id, weevil] of this.weevils) {
      const meta = this.meta.get(id);
      if (!meta) {
        this.weevils.delete(id);
        continue;
      }
      if (weevil.mode === "dead") {
        if (now - meta.deadAt > DEAD_MS) this.remove(id);
        continue;
      }
      if (weevil.mode === "emerge") {
        if (now - meta.bornAt < WEEVIL_EMERGE_MS) continue;
        this.setMode(weevil, "chase");
      }

      const target = now - meta.bornAt < WEEVIL_LIFETIME_MS ? this.nearestPlayer(weevil) : null;
      if (!target) {
        // Nadie cerca (o ya se cansaron): vuelven a la palmera y se meten.
        this.setMode(weevil, "leave");
        weevil.targetId = "";
        if (this.moveTowards(weevil, meta.palm, step, 0.2)) this.remove(id);
        continue;
      }

      this.setMode(weevil, "chase");
      if (weevil.targetId !== target.id) weevil.targetId = target.id;
      const distance = Math.hypot(target.tile.x - weevil.x, target.tile.y - weevil.y);
      if (distance > WEEVIL_BITE_RANGE * 0.7) this.moveTowards(weevil, target.tile, step, WEEVIL_BITE_RANGE * 0.7);
      if (distance <= WEEVIL_BITE_RANGE && now - meta.lastBiteAt >= WEEVIL_BITE_MS) {
        meta.lastBiteAt = now;
        weevil.bites += 1;
        this.host.bite(target.id);
      }
    }
  }

  /** El jugador más cercano dentro de `WEEVIL_AGGRO_RANGE` (no importa quién sacudió la palmera). */
  private nearestPlayer(weevil: Weevil): { id: string; tile: TilePoint } | null {
    let best: { id: string; tile: TilePoint } | null = null;
    let bestDistance = WEEVIL_AGGRO_RANGE;
    for (const [id, tile] of this.host.players()) {
      const distance = Math.hypot(tile.x - weevil.x, tile.y - weevil.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { id, tile };
      }
    }
    return best;
  }

  /** Avanza hacia `to` hasta quedar a `stopAt`; true si ya llegó. */
  private moveTowards(weevil: Weevil, to: TilePoint, step: number, stopAt: number): boolean {
    const dx = to.x - weevil.x;
    const dy = to.y - weevil.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopAt) return true;
    const advance = Math.min(step, distance - stopAt);
    weevil.x += (dx / distance) * advance;
    weevil.y += (dy / distance) * advance;
    return false;
  }

  private setMode(weevil: Weevil, mode: WeevilMode) {
    if (weevil.mode !== mode) weevil.mode = mode;
  }

  private remove(id: string) {
    this.weevils.delete(id);
    this.meta.delete(id);
  }
}
