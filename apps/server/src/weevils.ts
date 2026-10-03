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
  encodeWeevilCoord,
  weevilModeCode,
} from "@montevideo-world/shared";
import { Weevil } from "@montevideo-world/shared/schema";

/** Lo que los picudos necesitan de la sala: dónde están los jugadores y cómo picarlos. */
export interface WeevilHost {
  /** Jugadores del barrio con su tile actual. Se pide una vez por tick (y sólo si hay picudos persiguiendo). */
  players(): ReadonlyArray<WeevilTarget>;
  /** Un picudo picó a este jugador. */
  bite(sessionId: string): void;
}

/** Un jugador al que los picudos pueden perseguir. */
export interface WeevilTarget {
  id: string;
  tile: TilePoint;
}

/**
 * Estado de cada picudo que no viaja al cliente. La posición exacta (tiles con decimales) y el modo
 * viven acá; al Schema va la posición en centésimas de tile y el modo como número (`sync`).
 */
interface WeevilMeta {
  palm: TilePoint;
  bornAt: number;
  lastBiteAt: number;
  deadAt: number;
  x: number;
  y: number;
  mode: WeevilMode;
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
      const meta: WeevilMeta = {
        palm,
        bornAt: now + i * 150,
        lastBiteAt: 0,
        deadAt: 0,
        x: palm.x + (Math.random() - 0.5) * 0.6,
        y: palm.y + 0.3 + Math.random() * 0.3,
        mode: "emerge",
      };
      weevil.mode = weevilModeCode("emerge");
      this.sync(weevil, meta);
      this.weevils.set(id, weevil);
      this.meta.set(id, meta);
    }
    return count;
  }

  /** Patada desde el tile `from`: si el picudo está vivo y al alcance, muere. */
  kick(id: string, from: TilePoint, now: number): "killed" | "far" | "missing" {
    const weevil = this.weevils.get(id);
    const meta = this.meta.get(id);
    if (!weevil || !meta || meta.mode === "dead") return "missing";
    if (distanceSq(meta, from) > WEEVIL_KICK_RANGE * WEEVIL_KICK_RANGE) return "far";
    this.setMode(weevil, meta, "dead");
    if (weevil.targetId !== "") weevil.targetId = "";
    meta.deadAt = now;
    return "killed";
  }

  /** Cuántos picudos hay en la sala (vivos o aplastados todavía en el piso). */
  get size() {
    return this.weevils.size;
  }

  /** Simulación: llamar cada `dtMs`. Sin picudos no hace nada. */
  tick(dtMs: number, now: number) {
    if (this.weevils.size === 0) return;
    const step = (WEEVIL_SPEED * dtMs) / 1000;
    // Los jugadores se piden una sola vez por tick (no una por picudo), y sólo si alguno persigue.
    let players: ReadonlyArray<WeevilTarget> | null = null;
    for (const [id, weevil] of this.weevils) {
      const meta = this.meta.get(id);
      if (!meta) {
        this.weevils.delete(id);
        continue;
      }
      if (meta.mode === "dead") {
        if (now - meta.deadAt > DEAD_MS) this.remove(id);
        continue;
      }
      if (meta.mode === "emerge") {
        if (now - meta.bornAt < WEEVIL_EMERGE_MS) continue;
        this.setMode(weevil, meta, "chase");
      }

      const target = now - meta.bornAt < WEEVIL_LIFETIME_MS ? this.nearestPlayer(meta, (players ??= this.host.players())) : null;
      if (!target) {
        // Nadie cerca (o ya se cansaron): vuelven a la palmera y se meten.
        this.setMode(weevil, meta, "leave");
        if (weevil.targetId !== "") weevil.targetId = "";
        if (this.moveTowards(weevil, meta, meta.palm, step, 0.2)) this.remove(id);
        continue;
      }

      this.setMode(weevil, meta, "chase");
      if (weevil.targetId !== target.id) weevil.targetId = target.id;
      const distance = Math.sqrt(distanceSq(meta, target.tile));
      if (distance > WEEVIL_BITE_RANGE * 0.7) this.moveTowards(weevil, meta, target.tile, step, WEEVIL_BITE_RANGE * 0.7);
      if (distance <= WEEVIL_BITE_RANGE && now - meta.lastBiteAt >= WEEVIL_BITE_MS) {
        meta.lastBiteAt = now;
        weevil.bites += 1;
        this.host.bite(target.id);
      }
    }
  }

  /** El jugador más cercano dentro de `WEEVIL_AGGRO_RANGE` (no importa quién sacudió la palmera). */
  private nearestPlayer(from: TilePoint, players: ReadonlyArray<WeevilTarget>): WeevilTarget | null {
    let best: WeevilTarget | null = null;
    // Distancias al cuadrado: para comparar alcanza, sin raíces.
    let bestDistance = WEEVIL_AGGRO_RANGE * WEEVIL_AGGRO_RANGE;
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
  private moveTowards(weevil: Weevil, meta: WeevilMeta, to: TilePoint, step: number, stopAt: number): boolean {
    const dx = to.x - meta.x;
    const dy = to.y - meta.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopAt) return true;
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
  private sync(weevil: Weevil, meta: WeevilMeta) {
    const x = encodeWeevilCoord(meta.x);
    const y = encodeWeevilCoord(meta.y);
    if (weevil.x !== x) weevil.x = x;
    if (weevil.y !== y) weevil.y = y;
  }

  private setMode(weevil: Weevil, meta: WeevilMeta, mode: WeevilMode) {
    if (meta.mode === mode) return;
    meta.mode = mode;
    weevil.mode = weevilModeCode(mode);
  }

  private remove(id: string) {
    this.weevils.delete(id);
    this.meta.delete(id);
  }
}

function distanceSq(a: TilePoint, b: TilePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
