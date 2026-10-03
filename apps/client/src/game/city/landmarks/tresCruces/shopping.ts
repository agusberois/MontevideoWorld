import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { CONCRETE, GLASS } from "./common";
import type { LandmarkDrawing } from "../types";

/** Shopping Tres Cruces: volumen blanco con vidriados, franja roja, y la terminal con ómnibus al este. */
function drawShoppingTresCruces(p: IsoPainter) {
  const red = 0xd7263d;
  const south: Face = { side: "south", y: 2.6 };
  const east: Face = { side: "east", x: 2.7 };

  p.box(-0.5, -0.5, 2.7, 2.6, 0, 34, boxColors(CONCRETE));
  p.windows(south, -0.4, 2.6, 6, 26, 6, 2, { color: GLASS, widthRatio: 0.85, heightRatio: 0.8 });
  p.windows(east, -0.4, 2.5, 6, 26, 5, 2, { color: GLASS, widthRatio: 0.85, heightRatio: 0.8 });
  p.faceRect(south, 0.7, 1.4, 0, 12, 0x2f3d4b);
  p.faceRect(south, -0.5, 2.7, 27, 31, red);
  p.faceRect(east, -0.5, 2.6, 27, 31, red);
  p.box(-0.5, -0.5, 2.7, 2.6, 34, 36, boxColors(shade(CONCRETE, 8)));
  // Claraboya del patio de comidas.
  p.box(0.2, 0.0, 1.6, 1.0, 36, 40, boxColors(GLASS));

  // Terminal: andenes al este, con ómnibus bajo el alero.
  p.box(2.7, -0.45, 3.45, 2.55, 0, 2, boxColors(0xb9b4aa));
  for (const [y0, y1, color] of [
    [-0.25, 0.95, 0xf2f2f2],
    [1.2, 2.4, 0x2d6cb4],
  ] as const) {
    p.box(2.85, y0, 3.3, y1, 2, 14, boxColors(color));
    p.faceRect({ side: "east", x: 3.3 }, y0 + 0.05, y1 - 0.05, 8, 12, 0x2f3d4b);
    p.faceRect({ side: "east", x: 3.3 }, y0, y1, 4, 5.5, red);
  }
  for (const y of [-0.35, 1.05, 2.45]) p.box(3.38, y - 0.04, 3.45, y + 0.04, 2, 22, boxColors(0x8d8a83), false);
  p.box(2.7, -0.45, 3.5, 2.55, 22, 25, boxColors(0xd8d4cb));
}

export const shopping: LandmarkDrawing = {
  size: 4,
  maxZ: 72,
  draw: drawShoppingTresCruces,
  // Cartel "MW": sobre la azotea, del lado de la explanada.
  roof: { u: 1.0, v: 1.2, z: 36 },
};
