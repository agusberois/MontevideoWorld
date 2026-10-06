import * as Phaser from "phaser";
import { TILE_HEIGHT, type StringLight, type TilePoint } from "@montevideo-world/shared";
import { isoPoint } from "../iso";
import type { NightLight } from "./DayNight";

/**
 * Guirnaldas de lucecitas (`CityDefinition.stringLights`): postes finos de hierro y un cable que
 * cuelga entre ellos, con lamparitas cálidas cada medio tile. Van por arriba de las cabezas. De
 * noche cada lamparita suma un halo chiquito (`stringLightGlows`).
 */

const HALF_H = TILE_HEIGHT / 2;
/** Altura (px) de la punta de los postes, donde se ata el cable. */
const POST_Z = 64;
const POST_COLOR = 0x26262b;
const WIRE_COLOR = 0x1c1c20;
/** Lamparitas: blanco cálido con alguna más amarilla o anaranjada, como las de verdad. */
const BULB_COLORS = [0xfff1c4, 0xffe08a, 0xfff1c4, 0xffc77a] as const;
/** Lamparitas por tile de largo. */
const BULBS_PER_TILE = 2;

interface Bulb {
  x: number;
  y: number;
  z: number;
  color: number;
}

/** Cuánto cuelga el cable en el medio (px), según el largo en tiles. */
function sagFor(length: number): number {
  return 6 + length * 1.6;
}

/** Puntos del cable (en tiles, con su altura) de una punta a la otra, cada `1 / BULBS_PER_TILE` tile. */
function wirePoints({ from, to }: StringLight): Bulb[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(2, Math.round(length * BULBS_PER_TILE));
  const sag = sagFor(length);
  const points: Bulb[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      // Parábola: el cable baja hacia el medio.
      z: POST_Z - 2 - sag * 4 * t * (1 - t),
      color: BULB_COLORS[(i + Math.round(from.x + from.y)) % BULB_COLORS.length],
    });
  }
  return points;
}

/** Profundidad de un punto del mapa: la misma regla que las piezas (`x + y` del tile, un pelo adelante). */
function depthAt(x: number, y: number): number {
  return (Math.round(x) + Math.round(y)) * HALF_H + 2;
}

/**
 * Dibuja los postes y las guirnaldas. Cada tramo de cable va con la profundidad del tile que cruza
 * (así lo tapan los edificios que tiene delante), pero no como un `Graphics` por tramo (Phaser los
 * vuelve a triangular en cada frame y cortan el lote): todo lo que tiene la misma profundidad se
 * hornea una sola vez a una textura (`keyPrefix`-profundidad) y queda como una `Image`.
 */
export function drawStringLights(scene: Phaser.Scene, garlands: readonly StringLight[], keyPrefix: string) {
  /** Lo que se dibuja con cada profundidad (en coordenadas de mundo) y la caja que ocupa. */
  const layers = new Map<number, { draws: Array<(g: Phaser.GameObjects.Graphics) => void>; minX: number; minY: number; maxX: number; maxY: number }>();
  const add = (depth: number, points: Array<{ x: number; y: number }>, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    let layer = layers.get(depth);
    if (!layer) {
      layer = { draws: [], minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      layers.set(depth, layer);
    }
    layer.draws.push(draw);
    for (const { x, y } of points) {
      layer.minX = Math.min(layer.minX, x);
      layer.minY = Math.min(layer.minY, y);
      layer.maxX = Math.max(layer.maxX, x);
      layer.maxY = Math.max(layer.maxY, y);
    }
  };

  const posts = new Map<string, TilePoint>();
  for (const { from, to } of garlands) {
    for (const post of [from, to]) posts.set(`${post.x},${post.y}`, post);
  }
  for (const post of posts.values()) {
    const base = isoPoint(post.x, post.y, 0);
    const top = isoPoint(post.x, post.y, POST_Z);
    add(depthAt(post.x, post.y), [base, top], (g) => {
      g.fillStyle(0x000000, 0.2).fillEllipse(base.x, base.y, 10, 4);
      g.fillStyle(POST_COLOR, 1).fillRect(base.x - 2.5, base.y - 4, 5, 4);
      g.lineStyle(2, POST_COLOR, 1).lineBetween(base.x, base.y - 3, top.x, top.y);
      g.fillStyle(POST_COLOR, 1).fillCircle(top.x, top.y, 2);
    });
  }

  for (const garland of garlands) {
    const points = wirePoints(garland);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const pa = isoPoint(a.x, a.y, a.z);
      const pb = isoPoint(b.x, b.y, b.z);
      // La lamparita cuelga del medio del tramo (la de las puntas sería el poste).
      const bulb = isoPoint((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2 - 3);
      add(depthAt((a.x + b.x) / 2, (a.y + b.y) / 2), [pa, pb, bulb], (g) => {
        g.lineStyle(1, WIRE_COLOR, 0.9).lineBetween(pa.x, pa.y, pb.x, pb.y);
        g.lineStyle(1, WIRE_COLOR, 0.9).lineBetween(bulb.x, bulb.y - 3, bulb.x, bulb.y);
        g.fillStyle(a.color, 1).fillCircle(bulb.x, bulb.y + 1.5, 2.2);
      });
    }
  }

  const MARGIN = 8;
  for (const [depth, layer] of layers) {
    const left = Math.floor(layer.minX - MARGIN);
    const top = Math.floor(layer.minY - MARGIN);
    const key = `${keyPrefix}-${depth}`;
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({}, false);
      g.translateCanvas(-left, -top);
      for (const draw of layer.draws) draw(g);
      g.generateTexture(key, Math.ceil(layer.maxX + MARGIN) - left, Math.ceil(layer.maxY + MARGIN) - top);
      g.destroy();
    }
    scene.add.image(left, top, key).setOrigin(0, 0).setDepth(depth);
  }
}

/** Un halo chico por lamparita, para `CityRenderer.nightLights`. */
export function stringLightGlows(garlands: readonly StringLight[]): NightLight[] {
  const lights: NightLight[] = [];
  for (const garland of garlands) {
    const points = wirePoints(garland);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const bulb = isoPoint((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2 - 3);
      lights.push({ x: bulb.x, y: bulb.y + 1.5, radius: 14, color: a.color });
    }
  }
  return lights;
}
