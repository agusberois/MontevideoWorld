import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { facesOf } from "../common";
import { GLASS, ovalPoints } from "./common";
import type { LandmarkDrawing } from "../types";

/** Sanatorio Americano: basamento y torre blanca con cruz roja y helipuerto en la azotea. */
function drawSanatorio(p: IsoPainter) {
  const white = 0xf2f4f5;
  const top = 132;
  p.box(-0.5, -0.5, 3.5, 3.5, 0, 22, boxColors(0xd9dde0));
  for (const face of facesOf(3.5, 3.5)) {
    p.windows(face, -0.4, 3.4, 3, 20, 6, 1, { color: GLASS, widthRatio: 0.7, heightRatio: 0.7 });
  }
  p.box(0.0, 0.0, 3.1, 3.1, 22, top, boxColors(white));
  for (const face of facesOf(3.1, 3.1)) {
    p.windows(face, 0.1, 3.0, 26, top - 6, 6, 9, { color: 0x4a6a7e, widthRatio: 0.6, heightRatio: 0.55 });
  }
  // Cruz roja sobre la fachada sur.
  const south: Face = { side: "south", y: 3.1 };
  p.faceRect(south, 1.15, 1.95, top - 30, top - 8, 0xffffff);
  p.faceRect(south, 1.47, 1.63, top - 27, top - 11, 0xd7263d);
  p.faceRect(south, 1.27, 1.83, top - 21, top - 17, 0xd7263d);
  p.box(-0.05, -0.05, 3.15, 3.15, top, top + 3, boxColors(shade(white, -10)));
  // Helipuerto: círculo oscuro con la H amarilla.
  p.fill(0x4b4f55, ovalPoints(p, 1.55, 1.55, 1.15, 1.15, top + 3.2, 0, Math.PI * 2));
  p.g.lineStyle(1.5, 0xffd166, 1);
  p.g.strokePoints(ovalPoints(p, 1.55, 1.55, 1.0, 1.0, top + 3.3, 0, Math.PI * 2), true);
  for (const [a, b] of [
    [p.p(1.2, 1.25, top + 3.3), p.p(1.2, 1.85, top + 3.3)],
    [p.p(1.9, 1.25, top + 3.3), p.p(1.9, 1.85, top + 3.3)],
    [p.p(1.2, 1.55, top + 3.3), p.p(1.9, 1.55, top + 3.3)],
  ]) {
    p.line(a, b, 0xffd166, 2);
  }
}

export const sanatorio: LandmarkDrawing = {
  size: 4,
  maxZ: 150,
  draw: drawSanatorio,
};
