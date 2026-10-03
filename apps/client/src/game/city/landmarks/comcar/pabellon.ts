import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { PRISON_CONCRETE } from "./common";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Pabellón de celdas: bloque gris de tres pisos con ventanitas enrejadas, una franja descascarada,
 * la puerta de rejas al sur y el tanque de agua en la azotea.
 */
function drawPabellon(p: IsoPainter) {
  const top = 66;
  p.box(-0.45, -0.45, 2.45, 2.45, 0, top, boxColors(PRISON_CONCRETE));
  for (const face of facesOf(2.45, 2.45)) {
    p.faceRect(face, -0.45, 2.45, 0, 6, shade(PRISON_CONCRETE, -30));
    p.faceRect(face, -0.45, 2.45, 22, 24, shade(PRISON_CONCRETE, -14));
    p.faceRect(face, -0.45, 2.45, 44, 46, shade(PRISON_CONCRETE, -14));
    barredWindows(p, face, -0.35, 2.35, 8, top - 4, 8, 3);
  }
  // Puerta de rejas.
  const south: Face = { side: "south", y: 2.45 };
  p.faceRect(south, 0.75, 1.25, 0, 16, 0x26292e);
  for (let i = 1; i < 6; i++) {
    const u = 0.75 + (0.5 * i) / 6;
    p.faceRect(south, u - 0.012, u + 0.012, 0, 16, 0x8c9096);
  }
  // Pretil y tanque de agua.
  p.box(-0.5, -0.5, 2.5, 2.5, top, top + 3, boxColors(shade(PRISON_CONCRETE, -8)));
  p.box(0.2, 0.2, 0.75, 0.75, top + 3, top + 16, boxColors(0x7d8288));
}

/** Ventanas chicas con barrotes, en una grilla sobre la cara. */
function barredWindows(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, z1: number, cols: number, rows: number) {
  const cellU = (u1 - u0) / cols;
  const cellZ = (z1 - z0) / rows;
  const w = cellU * 0.42;
  const h = cellZ * 0.42;
  for (let row = 0; row < rows; row++) {
    const wz = z0 + row * cellZ + (cellZ - h) / 2;
    for (let col = 0; col < cols; col++) {
      const wu = u0 + col * cellU + (cellU - w) / 2;
      p.faceRect(face, wu, wu + w, wz, wz + h, 0x22252a);
      for (const t of [0.33, 0.66]) p.faceRect(face, wu + w * t - 0.008, wu + w * t + 0.008, wz, wz + h, 0x9aa0a6);
    }
  }
}

export const pabellon: LandmarkDrawing = {
  size: 3,
  maxZ: 84,
  draw: drawPabellon,
};
