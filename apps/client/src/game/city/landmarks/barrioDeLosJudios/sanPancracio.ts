import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { DARK_OPENING, WINDOW, WOOD, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Iglesia de San Pancracio (parroquia del Inmaculado Corazón de María): nave de revoque crema con
 * techo a dos aguas y una sola torre campanario al frente (cara este), con la puerta en la base.
 */

const PLASTER = 0xf0e3c4;
const TRIM = 0xd9c49a;
const ROOF = 0x9c5b45;
const SPIRE = 0x6f8f8a;

function drawSanPancracio(p: IsoPainter) {
  const south: Face = { side: "south", y: 2.6 };

  // Nave con techo a dos aguas (cumbrera de oeste a este).
  p.box(-0.5, 0.4, 2.6, 2.6, 0, 50, boxColors(PLASTER));
  p.windows(south, -0.4, 2.5, 12, 44, 4, 1, { color: WINDOW, arched: true, widthRatio: 0.35, heightRatio: 0.8 });
  p.faceRect(south, -0.5, 2.6, 0, 4, shade(PLASTER, -25));
  p.faceRect(south, -0.5, 2.6, 47, 50, TRIM);
  p.fill(shade(ROOF, -10), [p.p(-0.5, 0.4, 50), p.p(2.6, 0.4, 50), p.p(2.6, 1.5, 68), p.p(-0.5, 1.5, 68)]);
  p.fill(ROOF, [p.p(-0.5, 2.6, 50), p.p(2.6, 2.6, 50), p.p(2.6, 1.5, 68), p.p(-0.5, 1.5, 68)]);
  p.facePoly(
    { side: "east", x: 2.6 },
    [
      [0.4, 50],
      [2.6, 50],
      [1.5, 68],
    ],
    PLASTER,
  );

  // Torre al frente: puerta, reloj, campanario y aguja.
  const x0 = 2.6;
  const x1 = 3.5;
  const y0 = 1.05;
  const y1 = 1.95;
  p.box(x0, y0, x1, y1, 0, 104, boxColors(PLASTER));
  const front: Face = { side: "east", x: x1 };
  p.faceArch(front, 1.25, 1.75, 0, 30, WOOD);
  p.faceRect(front, y0, y1, 34, 37, TRIM);
  const clock = p.facePoint(front, 1.5, 54);
  p.g.fillStyle(0xf8f4ea, 1);
  p.g.fillEllipse(clock.x, clock.y, 11, 11);
  p.line(clock, { x: clock.x, y: clock.y - 4 }, 0x2b2b30, 1);
  p.line(clock, { x: clock.x + 3, y: clock.y }, 0x2b2b30, 1);
  for (const face of facesOf(x1, y1)) {
    const [u0, u1] = face.side === "south" ? [x0, x1] : [y0, y1];
    p.windows(face, u0, u1, 74, 98, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5 });
  }
  p.box(x0 - 0.04, y0 - 0.04, x1 + 0.04, y1 + 0.04, 104, 108, boxColors(TRIM));
  p.pyramid(x0, y0, x1, y1, 108, 140, SPIRE, shade(SPIRE, -15));
  const top = p.p((x0 + x1) / 2, (y0 + y1) / 2, 140);
  p.line(top, { x: top.x, y: top.y - 10 }, 0xd9c48a, 1.5);
  p.line({ x: top.x - 3, y: top.y - 7 }, { x: top.x + 3, y: top.y - 7 }, 0xd9c48a, 1.5);
}

export const sanPancracio: LandmarkDrawing = {
  size: 4,
  maxZ: 154,
  draw: drawSanPancracio,
};
