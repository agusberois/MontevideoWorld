import { shade } from "../../../color";
import { IsoPainter } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/** Fuente de la Plaza Matriz. */

function drawFuente(p: IsoPainter) {
  const stone = 0xc9c0b0;
  const water = 0x4f9fc4;
  const g = p.g;
  const c = p.p(0, 0, 0);

  g.fillStyle(shade(stone, -20), 1);
  g.fillEllipse(c.x, c.y - 2, 54, 27);
  g.fillStyle(stone, 1);
  g.fillEllipse(c.x, c.y - 6, 54, 27);
  g.fillStyle(water, 1);
  g.fillEllipse(c.x, c.y - 6, 45, 21);
  g.fillStyle(shade(water, 25), 1);
  g.fillEllipse(c.x - 8, c.y - 8, 14, 4);

  g.fillStyle(stone, 1);
  g.fillRect(c.x - 3, c.y - 30, 6, 24);
  g.fillEllipse(c.x, c.y - 30, 24, 9);
  g.fillStyle(water, 1);
  g.fillEllipse(c.x, c.y - 31, 18, 5);
  g.fillStyle(stone, 1);
  g.fillRect(c.x - 1.5, c.y - 42, 3, 12);
  g.fillCircle(c.x, c.y - 44, 3);

  // Chorros que caen del plato superior.
  g.lineStyle(1.5, 0xbfe6f5, 0.85);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(c.x + side * 10, c.y - 30);
    g.lineTo(c.x + side * 15, c.y - 22);
    g.lineTo(c.x + side * 17, c.y - 10);
    g.strokePath();
  }
}

export const fuente: LandmarkDrawing = {
  size: 1,
  maxZ: 52,
  draw: drawFuente,
};
