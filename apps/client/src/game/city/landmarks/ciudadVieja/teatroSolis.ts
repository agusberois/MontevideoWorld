import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, WOOD, drawUruguayFlag } from "../common";
import type { LandmarkDrawing } from "../types";

/** Teatro Solís: cuerpo neoclásico con pórtico de columnas hacia el este. */

function drawTeatroSolis(p: IsoPainter) {
  const cream = 0xeee3cc;
  const trim = 0xf7f0e0;
  const front = 2.75; // cara este del cuerpo principal; el pórtico va de acá a 3.5

  p.box(-0.5, -0.5, front, 3.5, 0, 58, boxColors(cream));
  const south: Face = { side: "south", y: 3.5 };
  p.windows(south, -0.4, front - 0.1, 6, 54, 5, 2, { color: WINDOW, arched: true, widthRatio: 0.42, heightRatio: 0.7 });
  p.faceRect(south, -0.5, front, 0, 4, shade(cream, -22));

  // Puertas bajo el pórtico.
  p.windows({ side: "east", x: front }, 0.2, 2.8, 0, 30, 3, 1, { color: WOOD, arched: true, widthRatio: 0.45, heightRatio: 0.85 });
  p.box(-0.5, -0.5, front, 3.5, 58, 62, boxColors(trim));

  // Pórtico: piso, seis columnas y entablamento.
  p.box(front, 0.05, 3.5, 2.95, 0, 4, boxColors(0xc9bda5));
  const columns = 6;
  for (let i = 0; i < columns; i++) {
    const cy = 0.2 + (i * 2.6) / (columns - 1);
    p.box(3.26, cy - 0.07, 3.4, cy + 0.07, 4, 46, boxColors(0xf6f0e2), false);
  }
  p.box(front, 0.05, 3.5, 2.95, 46, 58, boxColors(trim));
  p.faceRect({ side: "east", x: 3.5 }, 0.05, 2.95, 50, 53, shade(trim, -18));

  // Ático central y bandera.
  p.box(0.1, 0.3, 2.3, 2.7, 62, 80, boxColors(cream));
  p.windows({ side: "east", x: 2.3 }, 0.4, 2.6, 66, 78, 3, 1, { color: WINDOW, widthRatio: 0.35 });
  p.box(0.05, 0.25, 2.35, 2.75, 80, 83, boxColors(trim));
  drawUruguayFlag(p, 1.2, 1.5, 83);
}

export const teatroSolis: LandmarkDrawing = {
  size: 4,
  maxZ: 108,
  draw: drawTeatroSolis,
};
