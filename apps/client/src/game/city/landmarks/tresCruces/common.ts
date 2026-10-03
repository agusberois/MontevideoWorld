import { shade } from "../../../color";
import { IsoPainter, Vec2 } from "../../IsoPainter";

/** Lo que comparten los edificios de Tres Cruces y el Parque Batlle. */

export const CONCRETE = 0xe6e2d9;
export const GLASS = 0x6fa3c0;

/**
 * Óvalo en escalones (estadio, velódromo) visto desde la cámara. `rings` va de afuera hacia
 * adentro: cada anillo baja de altura y el último es el centro (cancha). Para que lo de adelante
 * tape bien: primero la mitad de atrás de afuera hacia adentro, después el centro (y `drawCenter`), y por último la
 * mitad de adelante de adentro hacia afuera, y el muro exterior.
 */
export function drawBowl(
  p: IsoPainter,
  cx: number,
  cy: number,
  aspectX: number,
  aspectY: number,
  rings: ReadonlyArray<{ r: number; z: number; color: number }>,
  wall: number,
  pillars = false,
  /** Lo que va sobre el centro (líneas de la cancha), tapado por la mitad de adelante. */
  drawCenter?: () => void,
) {
  // "Adelante" = hacia la cámara (x + y crece): de -45° a 135°.
  const front: [number, number] = [-Math.PI / 4, (3 * Math.PI) / 4];
  const back: [number, number] = [(3 * Math.PI) / 4, (7 * Math.PI) / 4];
  const arc = (i: number, [t0, t1]: [number, number], z = rings[i].z) =>
    ovalPoints(p, cx, cy, rings[i].r * aspectX, rings[i].r * aspectY, z, t0, t1);
  const band = (i: number, range: [number, number]) => [...arc(i, range), ...arc(i + 1, range).reverse()];

  for (let i = 0; i < rings.length - 1; i++) p.fill(shade(rings[i].color, -10), band(i, back));
  const last = rings.length - 1;
  p.fill(rings[last].color, arc(last, [0, Math.PI * 2]));
  drawCenter?.();
  for (let i = rings.length - 2; i >= 0; i--) p.fill(rings[i].color, band(i, front));

  // Muro exterior (sólo se ve la mitad de adelante).
  const wallPoints = [...arc(0, front), ...arc(0, front, 0).reverse()];
  p.fill(wall, wallPoints);
  p.outline(wallPoints);
  if (pillars) {
    for (let i = 0; i <= 12; i++) {
      const t = front[0] + ((front[1] - front[0]) * i) / 12;
      const x = cx + Math.cos(t) * rings[0].r * aspectX;
      const y = cy + Math.sin(t) * rings[0].r * aspectY;
      p.line(p.p(x, y, 0), p.p(x, y, rings[0].z), shade(wall, -18), 1.5);
    }
  }
  p.g.lineStyle(1, 0x000000, 0.25);
  p.g.strokePoints(arc(0, [0, Math.PI * 2]), true);
}

/** Puntos de un óvalo horizontal a la altura `z`, de `t0` a `t1` (radianes). */
export function ovalPoints(p: IsoPainter, cx: number, cy: number, rx: number, ry: number, z: number, t0: number, t1: number, steps = 40): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    points.push(p.p(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, z));
  }
  return points;
}
