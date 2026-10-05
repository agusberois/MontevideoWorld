import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * Columna de la Paz (Plaza Cagancha): base escalonada de mármol, el pedestal con las placas, la
 * columna corintia y arriba la estatua de la Paz con el brazo en alto. Es el kilómetro 0 del país.
 */

const MARBLE = 0xe9e4da;
const BRONZE = 0x4b5a46;

function drawColumnaDeLaPaz(p: IsoPainter) {
  const g = p.g;
  p.box(-0.45, -0.45, 1.45, 1.45, 0, 4, boxColors(shade(MARBLE, -12)));
  p.box(-0.25, -0.25, 1.25, 1.25, 4, 8, boxColors(shade(MARBLE, -6)));
  p.box(0.05, 0.05, 0.95, 0.95, 8, 34, boxColors(MARBLE));
  for (const face of [
    { side: "south" as const, y: 0.95 },
    { side: "east" as const, x: 0.95 },
  ]) {
    p.faceRect(face, 0.25, 0.75, 14, 26, shade(BRONZE, 10));
  }
  p.box(0.0, 0.0, 1.0, 1.0, 34, 38, boxColors(shade(MARBLE, 8)));

  // Fuste de la columna, con estrías, y el capitel.
  const bottom = p.p(0.5, 0.5, 38);
  const top = p.p(0.5, 0.5, 118);
  g.fillStyle(MARBLE, 1).fillRect(bottom.x - 5, top.y, 10, bottom.y - top.y);
  g.fillStyle(shade(MARBLE, -14), 1).fillRect(bottom.x + 1.5, top.y, 3.5, bottom.y - top.y);
  for (const dx of [-2.5, 0.5]) g.fillStyle(shade(MARBLE, -6), 1).fillRect(bottom.x + dx, top.y, 0.8, bottom.y - top.y);
  g.fillStyle(shade(MARBLE, -8), 1).fillEllipse(bottom.x, bottom.y, 14, 5);
  g.fillStyle(shade(MARBLE, 6), 1).fillRect(top.x - 8, top.y - 6, 16, 6);
  g.fillStyle(shade(MARBLE, -10), 1).fillRect(top.x - 8, top.y - 2, 16, 2);

  // La Paz: figura de bronce de pie, con la túnica, las alas y el brazo derecho en alto.
  const feet = { x: top.x, y: top.y - 6 };
  g.fillStyle(shade(BRONZE, -18), 1).fillPoints(
    [
      { x: feet.x - 3, y: feet.y - 18 },
      { x: feet.x - 11, y: feet.y - 26 },
      { x: feet.x - 7, y: feet.y - 12 },
    ],
    true,
  );
  g.fillStyle(BRONZE, 1).fillPoints(
    [
      { x: feet.x - 5, y: feet.y },
      { x: feet.x + 5, y: feet.y },
      { x: feet.x + 3, y: feet.y - 20 },
      { x: feet.x - 3, y: feet.y - 20 },
    ],
    true,
  );
  g.fillCircle(feet.x, feet.y - 23, 3);
  g.lineStyle(2, BRONZE, 1).lineBetween(feet.x + 2, feet.y - 18, feet.x + 6, feet.y - 32);
  g.fillStyle(shade(BRONZE, 25), 1).fillCircle(feet.x + 6, feet.y - 33, 1.6);
}

export const columnaDeLaPaz: LandmarkDrawing = {
  size: 2,
  maxZ: 170,
  draw: drawColumnaDeLaPaz,
};
