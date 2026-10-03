import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Palacio Salvo: torre escalonada de 1928 con remate tipo faro. */

function drawPalacioSalvo(p: IsoPainter) {
  const stone = 0xd9c4a0;
  const trim = shade(stone, 14);
  const tiers: Array<{ inset: number; z0: number; z1: number; cols: number; rows: number }> = [
    { inset: 0, z0: 0, z1: 120, cols: 8, rows: 9 },
    { inset: 0.55, z0: 126, z1: 205, cols: 6, rows: 6 },
    { inset: 1.05, z0: 210, z1: 250, cols: 4, rows: 3 },
  ];

  for (const tier of tiers) {
    const a = -0.5 + tier.inset;
    const b = 3.5 - tier.inset;
    p.box(a, a, b, b, tier.z0, tier.z1, boxColors(stone));
    for (const face of facesOf(b, b)) {
      p.windows(face, a + 0.12, b - 0.12, tier.z0 + 6, tier.z1 - 4, tier.cols, tier.rows, {
        color: WINDOW,
        widthRatio: 0.45,
        heightRatio: 0.55,
      });
    }
    // Cornisa saliente sobre cada cuerpo.
    p.box(a, a, b, b, tier.z1, tier.z1 + 5, boxColors(trim));
  }

  // Basamento comercial más oscuro.
  for (const face of facesOf(3.5, 3.5)) p.faceRect(face, -0.5, 3.5, 0, 12, shade(stone, -28));

  // Linterna con arcos, cúpula y antena.
  const a = 0.85;
  const b = 2.15;
  p.box(a, a, b, b, 255, 284, boxColors(stone));
  for (const face of facesOf(b, b)) p.windows(face, a + 0.1, b - 0.1, 259, 281, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.55, heightRatio: 0.85 });
  p.box(a - 0.05, a - 0.05, b + 0.05, b + 0.05, 284, 288, boxColors(trim));
  p.dome(1.5, 1.5, 288, 16, 0xcdb48a);
  p.spire(1.5, 1.5, 300, 336, 0x55555c, 2);
  p.g.fillStyle(0xffd166, 1);
  const light = p.p(1.5, 1.5, 336);
  p.g.fillCircle(light.x, light.y, 2.5);
}

export const palacioSalvo: LandmarkDrawing = {
  size: 4,
  maxZ: 340,
  draw: drawPalacioSalvo,
};
