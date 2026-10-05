import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * El David de la explanada de la Intendencia: pedestal de granito y la réplica en bronce del David de
 * Miguel Ángel, de pie en contrapposto (el peso en la pierna derecha), con la honda al hombro.
 */

const GRANITE = 0x8e9296;
const BRONZE = 0x5a5a3f;

function drawDavid(p: IsoPainter) {
  const g = p.g;
  p.box(-0.4, -0.4, 1.4, 1.4, 0, 6, boxColors(shade(GRANITE, 14)));
  p.box(0.0, 0.0, 1.0, 1.0, 6, 46, boxColors(GRANITE));
  p.faceRect({ side: "south", y: 1.0 }, 0.25, 0.75, 22, 30, 0x8a6d3b);
  p.box(-0.05, -0.05, 1.05, 1.05, 46, 50, boxColors(shade(GRANITE, 10)));

  const f = p.p(0.5, 0.5, 50);
  const dark = shade(BRONZE, -20);
  const light = shade(BRONZE, 22);
  const limb = (x0: number, y0: number, x1: number, y1: number, width: number, color: number) => {
    g.lineStyle(width, color, 1).lineBetween(f.x + x0, f.y + y0, f.x + x1, f.y + y1);
    g.fillStyle(color, 1).fillCircle(f.x + x1, f.y + y1, width / 2);
  };
  // Piernas: la derecha recta (sostiene), la izquierda flexionada hacia afuera.
  limb(-2, -2, -2.5, -22, 4, BRONZE);
  limb(4, -1, 2.5, -11, 3.6, dark);
  limb(2.5, -11, 2.5, -22, 4, dark);
  // Torso girado, cadera inclinada.
  g.fillStyle(BRONZE, 1).fillPoints(
    [
      { x: f.x - 5, y: f.y - 22 },
      { x: f.x + 5, y: f.y - 21 },
      { x: f.x + 5.5, y: f.y - 40 },
      { x: f.x - 5.5, y: f.y - 39 },
    ],
    true,
  );
  // Brazos: el derecho al costado, el izquierdo doblado con la honda al hombro.
  limb(-5, -38, -7, -26, 3, BRONZE);
  limb(5, -38, 8, -32, 3, dark);
  limb(8, -32, 4, -40, 2.6, dark);
  g.lineStyle(0.8, shade(BRONZE, -35), 1).lineBetween(f.x + 4, f.y - 40, f.x - 3, f.y - 28);
  // Cabeza con los rulos, mirando a la izquierda.
  g.fillStyle(BRONZE, 1).fillRect(f.x - 1.5, f.y - 43, 3, 3);
  g.fillCircle(f.x - 0.5, f.y - 46, 3.6);
  g.fillStyle(dark, 1).fillCircle(f.x + 0.5, f.y - 48, 2.6);
  // Brillo del bronce.
  g.fillStyle(light, 1).fillRect(f.x - 4, f.y - 38, 1.4, 14);
}

export const david: LandmarkDrawing = {
  size: 2,
  maxZ: 110,
  draw: drawDavid,
};
