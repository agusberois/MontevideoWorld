import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { PRISON_CONCRETE } from "./common";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Garita de vigilancia: columna de hormigón, cabina con ventanales, techo y un reflector. */
function drawGarita(p: IsoPainter) {
  const legTop = 62;
  const cabinTop = 80;
  p.box(-0.16, -0.16, 0.16, 0.16, 0, legTop, boxColors(shade(PRISON_CONCRETE, -6)));
  p.box(-0.34, -0.34, 0.34, 0.34, legTop - 3, legTop, boxColors(shade(PRISON_CONCRETE, -20)));
  p.box(-0.3, -0.3, 0.3, 0.3, legTop, cabinTop, boxColors(0xd9d4c8));
  for (const face of facesOf(0.3, 0.3)) p.faceRect(face, -0.24, 0.24, legTop + 6, cabinTop - 3, 0x2f3a44);
  p.pyramid(-0.38, -0.38, 0.38, 0.38, cabinTop, cabinTop + 10, 0x5b4a3f, 0x463931);
  // Reflector.
  p.box(0.22, 0.22, 0.34, 0.34, cabinTop + 1, cabinTop + 5, boxColors(0x2b2b30));
  p.fill(0xfff3b0, [p.p(0.34, 0.26, cabinTop + 4), p.p(0.34, 0.32, cabinTop + 4), p.p(0.34, 0.32, cabinTop + 2), p.p(0.34, 0.26, cabinTop + 2)]);
}

export const garita: LandmarkDrawing = {
  size: 1,
  maxZ: 100,
  draw: drawGarita,
};
