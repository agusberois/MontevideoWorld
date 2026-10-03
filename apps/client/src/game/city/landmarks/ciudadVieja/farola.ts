import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Farola de la Escollera Sarandí: torrecita blanca con franjas rojas y linterna. */

function drawFarola(p: IsoPainter) {
  const white = 0xf2f0ea;
  const red = 0xc0392b;
  p.box(-0.42, -0.42, 0.42, 0.42, 0, 6, boxColors(0x8d8a83));
  p.box(-0.22, -0.22, 0.22, 0.22, 6, 62, boxColors(white));
  for (const [z0, z1] of [
    [18, 26],
    [38, 46],
  ]) {
    p.box(-0.225, -0.225, 0.225, 0.225, z0, z1, boxColors(red), false);
  }
  p.box(-0.3, -0.3, 0.3, 0.3, 62, 65, boxColors(0x3a3f4c));
  // Linterna vidriada con la luz encendida.
  p.box(-0.16, -0.16, 0.16, 0.16, 65, 76, boxColors(0xffe28a), false);
  for (const face of facesOf(0.16, 0.16)) {
    const [u0, u1] = [-0.16, 0.16];
    p.faceRect(face, u0, u0 + 0.03, 65, 76, 0x3a3f4c);
    p.faceRect(face, u1 - 0.03, u1, 65, 76, 0x3a3f4c);
  }
  p.pyramid(-0.2, -0.2, 0.2, 0.2, 76, 88, red, shade(red, -20));
  p.spire(0, 0, 88, 94, 0x3a3f4c, 1.5);
}

export const farola: LandmarkDrawing = {
  size: 1,
  maxZ: 96,
  draw: drawFarola,
};
