import { IsoPainter, boxColors } from "../../IsoPainter";
import { drawBowl, ovalPoints } from "./common";
import type { LandmarkDrawing } from "../types";

/** Velódromo Municipal: óvalo con pista peraltada de ladrillo, césped al centro y una tribuna. */
function drawVelodromo(p: IsoPainter) {
  drawBowl(p, 1.5, 1.5, 1.0, 0.82, [
    { r: 1.95, z: 9, color: 0xc9c4ba },
    { r: 1.82, z: 8, color: 0xb5653f },
    { r: 1.32, z: 2, color: 0x7fae5a },
  ], 0xa7a196);
  // Líneas de la pista.
  p.g.lineStyle(1, 0xffffff, 0.85);
  p.g.strokePoints(ovalPoints(p, 1.5, 1.5, 1.55, 1.55 * 0.82, 5.2, 0, Math.PI * 2), true);
  // Tribuna techada sobre la recta sur.
  p.box(0.4, 3.0, 2.6, 3.45, 0, 13, boxColors(0xb9b4aa));
  p.windows({ side: "south", y: 3.45 }, 0.45, 2.55, 2, 11, 6, 1, { color: 0x3a3f4c, widthRatio: 0.6 });
  p.box(0.35, 2.95, 2.65, 3.5, 13, 15, boxColors(0x6f7c86));
}

export const velodromo: LandmarkDrawing = {
  size: 4,
  maxZ: 26,
  draw: drawVelodromo,
};
