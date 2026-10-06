import * as Phaser from "phaser";
import type { Npc, TilePoint } from "@montevideo-world/shared";
import { Avatar } from "./Avatar";
import { lookFromAppearance } from "./avatarLook";

/** Cuánto se queda quieto entre paseo y paseo (al azar entre estos dos). */
const PAUSE_MIN_MS = 2500;
const PAUSE_MAX_MS = 7000;

interface Walker {
  npc: Npc;
  avatar: Avatar;
  waitMs: number;
}

/**
 * Personajes del barrio que no son jugadores (`CityDefinition.npcs`, p. ej. el barman del casino):
 * un `Avatar` como cualquiera, con nombre, que no se puede clickear (no está en los avatares de los
 * jugadores) y que de a ratos camina a otro tile de su `roam` (detrás de la barra), como atendiendo.
 * Es sólo del cliente: cada uno lo ve moverse a su manera.
 */
export class Npcs {
  private readonly walkers: Walker[];

  constructor(scene: Phaser.Scene, npcs: readonly Npc[]) {
    this.walkers = npcs.map((npc) => {
      const start = center(npc);
      const avatar = new Avatar(scene, {
        look: lookFromAppearance(npc.appearance),
        color: npc.appearance.color,
        name: npc.name,
        outfit: npc.outfit,
        tileX: start.x,
        tileY: start.y,
        isLocal: false,
      });
      return { npc, avatar, waitMs: pause() };
    });
  }

  tick(delta: number) {
    for (const walker of this.walkers) {
      walker.avatar.tick(delta);
      if (walker.avatar.isWalking()) continue;
      walker.waitMs -= delta;
      if (walker.waitMs > 0) continue;
      walker.waitMs = pause();
      walkTo(walker.avatar, pick(walker.npc));
    }
  }

  destroy() {
    for (const { avatar } of this.walkers) avatar.destroy();
    this.walkers.length = 0;
  }
}

function pause(): number {
  return PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
}

function center({ roam }: Npc): TilePoint {
  return { x: roam.x + Math.floor(roam.width / 2), y: roam.y + Math.floor(roam.height / 2) };
}

function pick({ roam }: Npc): TilePoint {
  return { x: roam.x + Math.floor(Math.random() * roam.width), y: roam.y + Math.floor(Math.random() * roam.height) };
}

/** Camina tile por tile en línea recta (dentro del `roam` no hay nada que esquivar). */
function walkTo(avatar: Avatar, target: TilePoint) {
  let { x, y } = avatar.endTile();
  const steps: TilePoint[] = [];
  while (x !== target.x || y !== target.y) {
    x += Math.sign(target.x - x);
    y += Math.sign(target.y - y);
    steps.push({ x, y });
  }
  for (const step of steps) avatar.pushTile(step.x, step.y);
}
