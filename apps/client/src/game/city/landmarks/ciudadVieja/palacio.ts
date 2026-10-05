import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Palacio de estilo francés (Palacio Estévez, Palacio Taranco): piedra clara, ventanales y mansarda. */
const STONE = 0xe6dcc6;

function drawPalacio(p: IsoPainter) {
  p.box(-0.5, -0.5, 2.5, 2.5, 0, 44, boxColors(STONE));
  for (const face of facesOf(2.5, 2.5)) {
    p.faceRect(face, -0.5, 2.5, 0, 6, shade(STONE, -18));
    p.windows(face, -0.4, 2.4, 8, 42, 4, 2, { color: WINDOW, arched: true, widthRatio: 0.45, heightRatio: 0.75 });
  }
  p.box(-0.55, -0.55, 2.55, 2.55, 44, 48, boxColors(shade(STONE, -10)));
  p.pyramid(-0.5, -0.5, 2.5, 2.5, 48, 66, 0x5d6b78, 0x4a5763);
}

export const palacio: LandmarkDrawing = { size: 3, maxZ: 68, draw: drawPalacio };
