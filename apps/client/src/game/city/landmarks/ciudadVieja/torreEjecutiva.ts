import { IsoPainter, boxColors } from "../../IsoPainter";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Torre Ejecutiva (Presidencia): bloque moderno de vidrio oscuro sobre una base de piedra clara. */
function drawTorreEjecutiva(p: IsoPainter) {
  p.box(-0.5, -0.5, 2.5, 2.5, 0, 14, boxColors(0xd8d2c4));
  p.box(-0.3, -0.3, 2.3, 2.3, 14, 96, boxColors(0x3d5568));
  for (const face of facesOf(2.3, 2.3)) p.windows(face, -0.25, 2.25, 18, 92, 6, 9, { color: 0x6f8fa8, widthRatio: 0.8, heightRatio: 0.7 });
  p.box(-0.35, -0.35, 2.35, 2.35, 96, 100, boxColors(0xd8d2c4));
}

export const torreEjecutiva: LandmarkDrawing = { size: 3, maxZ: 102, draw: drawTorreEjecutiva };
