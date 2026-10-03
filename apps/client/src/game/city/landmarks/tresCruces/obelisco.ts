import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/** Obelisco a los Constituyentes: escalinata, tres figuras de bronce y el fuste de granito. */
function drawObelisco(p: IsoPainter) {
  const granite = 0xbdb6aa;
  p.box(-0.45, -0.45, 0.45, 0.45, 0, 3, boxColors(0xa39d92));
  p.box(-0.3, -0.3, 0.3, 0.3, 3, 8, boxColors(granite));
  // Figuras de bronce (Ley, Libertad, Fuerza) contra el pedestal, en las caras que se ven.
  const g = p.g;
  for (const [x, y] of [
    [0.0, 0.36],
    [0.36, 0.0],
    [0.3, 0.3],
  ]) {
    const base = p.p(x, y, 3);
    g.fillStyle(0x3f4d3c, 1);
    g.fillEllipse(base.x, base.y - 6, 5, 11);
    g.fillCircle(base.x, base.y - 13, 2);
  }
  // Fuste que se afina hacia arriba y punta piramidal.
  const z0 = 8;
  const z1 = 66;
  const b = 0.17;
  const t = 0.09;
  p.fill(shade(granite, -6), [p.p(-b, b, z0), p.p(b, b, z0), p.p(t, t, z1), p.p(-t, t, z1)]);
  p.fill(shade(granite, -20), [p.p(b, b, z0), p.p(b, -b, z0), p.p(t, -t, z1), p.p(t, t, z1)]);
  p.pyramid(-t, -t, t, t, z1, z1 + 8, shade(granite, 6), shade(granite, -14));
}

export const obelisco: LandmarkDrawing = {
  size: 1,
  maxZ: 76,
  draw: drawObelisco,
};
