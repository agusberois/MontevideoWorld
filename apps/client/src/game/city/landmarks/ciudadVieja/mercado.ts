import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { IRON, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Mercado del Puerto: muros de ladrillo, gran techo de hierro y la torre del reloj al centro. Ocupa
 * 4 × 4 tiles; al lado, sobre la misma manzana, está la Parrilla del Mercado.
 */

function drawMercado(p: IsoPainter) {
  const brick = 0xa4553c;
  const iron = 0x56625f;

  p.box(-0.5, -0.5, 3.5, 3.5, 0, 32, boxColors(brick));
  for (const face of facesOf(3.5, 3.5)) {
    p.windows(face, -0.4, 3.4, 4, 30, 6, 1, { color: 0x2e2a28, arched: true, widthRatio: 0.6, heightRatio: 0.85 });
  }
  p.box(-0.5, -0.5, 3.5, 3.5, 32, 35, boxColors(0xd9c9b0));

  p.pyramid(-0.5, -0.5, 3.5, 3.5, 35, 75, shade(iron, 8), shade(iron, -12));
  // Nervaduras de hierro del techo.
  const apex = p.p(1.5, 1.5, 75);
  for (let i = 1; i < 6; i++) {
    const t = -0.5 + (i * 4) / 6;
    p.line(p.p(t, 3.5, 35), apex, IRON, 1, 0.35);
    p.line(p.p(3.5, t, 35), apex, IRON, 1, 0.35);
  }

  // Torre del reloj.
  const a = 1.22;
  const b = 1.78;
  p.box(a, a, b, b, 68, 104, boxColors(0x7d8a86));
  for (const face of facesOf(b, b)) {
    const clock = p.facePoint(face, 1.5, 92);
    p.g.fillStyle(0xf4efe3, 1);
    p.g.fillEllipse(clock.x, clock.y, 9, 9);
    p.line(clock, { x: clock.x, y: clock.y - 3.5 }, IRON, 1);
    p.line(clock, { x: clock.x + 2.5, y: clock.y }, IRON, 1);
  }
  p.pyramid(a - 0.04, a - 0.04, b + 0.04, b + 0.04, 104, 120, shade(iron, 8), shade(iron, -12));
}

export const mercado: LandmarkDrawing = {
  size: 4,
  maxZ: 122,
  draw: drawMercado,
};
