import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, WOOD, drawUruguayFlag, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Santos (Juan A. Capurro, 1885), en 18 de Julio 1205, hoy la Cancillería: casona de
 * **renacimiento italiano** de dos plantas, revoque color arena con molduras blancas. Planta baja
 * almohadillada con ventanas de arco, planta alta con ventanas con frontón (triangular y curvo,
 * alternados) y balconcitos de balaustres; al medio de la fachada el **pórtico** de columnas con el
 * balcón arriba; cornisa con ménsulas, **balaustrada** con jarrones sobre la azotea y la bandera.
 */

const PLASTER = 0xe8d2ac;
const TRIM = 0xf6f1e6;
const RUSTIC = shade(PLASTER, -10);
const GROUND = 30;
const TOP = 66;

/** Frontón de una ventana de la planta alta: triangular o curvo. */
function pediment(p: IsoPainter, face: Face, u: number, z: number, half: number, curved: boolean) {
  if (curved) {
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * Math.PI;
      points.push([u - Math.cos(t) * half, z + Math.sin(t) * 4]);
    }
    p.facePoly(face, points, TRIM);
  } else {
    p.facePoly(face, [[u - half, z], [u + half, z], [u, z + 5]], TRIM);
  }
}

function facade(p: IsoPainter, face: Face) {
  // Planta baja almohadillada: hiladas marcadas y ventanas de arco con reja.
  p.faceRect(face, -0.5, 2.5, 0, GROUND, RUSTIC);
  for (let z = 4; z < GROUND; z += 4) p.line(p.facePoint(face, -0.5, z), p.facePoint(face, 2.5, z), 0x000000, 1, 0.12);
  for (let u = -0.2; u < 2.4; u += 0.6) {
    if (face.side === "south" && Math.abs(u - 1.0) < 0.1) continue;
    p.faceArch(face, u - 0.12, u + 0.12, 4, 24, WINDOW);
    for (let k = u - 0.1; k < u + 0.12; k += 0.05) p.faceRect(face, k, k + 0.012, 4, 20, 0x262626);
  }
  p.faceRect(face, -0.5, 2.5, GROUND - 2, GROUND + 1, TRIM);
  // Planta alta: ventanas con frontón y balconcito de balaustres.
  for (let u = -0.2, i = 0; u < 2.4; u += 0.6, i++) {
    if (face.side === "south" && Math.abs(u - 1.0) < 0.1) continue;
    p.faceRect(face, u - 0.14, u + 0.14, GROUND + 4, GROUND + 24, TRIM);
    p.faceRect(face, u - 0.1, u + 0.1, GROUND + 5, GROUND + 23, WINDOW);
    pediment(p, face, u, GROUND + 25, 0.17, i % 2 === 1);
    p.faceRect(face, u - 0.16, u + 0.16, GROUND + 3, GROUND + 4, TRIM);
    for (let k = u - 0.14; k < u + 0.15; k += 0.04) p.faceRect(face, k, k + 0.015, GROUND, GROUND + 3, TRIM);
  }
  // Pilastras en las esquinas.
  for (const u of [-0.48, 2.4]) p.faceRect(face, u, u + 0.08, 0, TOP, TRIM);
}

function drawPalacioSantos(p: IsoPainter) {
  const g = p.g;
  p.box(-0.5, -0.5, 2.5, 2.5, 0, TOP, boxColors(PLASTER));
  for (const face of facesOf(2.5, 2.5)) facade(p, face);

  // Pórtico al medio de la fachada sur: dos columnas, la puerta de madera y el balcón arriba.
  const south: Face = { side: "south", y: 2.5 };
  p.faceArch(south, 0.82, 1.18, 0, 24, WOOD);
  p.faceRect(south, 0.99, 1.01, 0, 22, shade(WOOD, -25));
  p.box(0.6, 2.5, 1.4, 2.75, GROUND - 2, GROUND + 1, boxColors(TRIM));
  for (const x of [0.66, 1.34]) p.box(x - 0.04, 2.66, x + 0.04, 2.74, 0, GROUND - 2, boxColors(TRIM));
  const porch: Face = { side: "south", y: 2.75 };
  for (let k = 0.62; k < 1.38; k += 0.05) p.faceRect(porch, k, k + 0.02, GROUND + 1, GROUND + 6, TRIM);
  p.faceRect(porch, 0.6, 1.4, GROUND + 6, GROUND + 7, TRIM);
  p.faceArch(south, 0.85, 1.15, GROUND + 3, GROUND + 26, WINDOW);
  p.facePoly(south, [[0.78, GROUND + 27], [1.22, GROUND + 27], [1.0, GROUND + 34]], TRIM);

  // Cornisa con ménsulas y balaustrada con jarrones.
  p.box(-0.55, -0.55, 2.55, 2.55, TOP, TOP + 4, boxColors(TRIM));
  for (const face of facesOf(2.5, 2.5)) {
    for (let u = -0.4; u < 2.45; u += 0.15) p.faceRect(face, u, u + 0.05, TOP - 3, TOP, shade(TRIM, -12));
    const rail: Face = face.side === "south" ? { side: "south", y: 2.52 } : { side: "east", x: 2.52 };
    for (let u = -0.45; u < 2.5; u += 0.07) p.faceRect(rail, u, u + 0.03, TOP + 4, TOP + 10, TRIM);
    p.faceRect(rail, -0.5, 2.52, TOP + 10, TOP + 12, TRIM);
    for (const u of [-0.45, 0.5, 1.5, 2.45]) {
      const c = p.facePoint(rail, u, TOP + 15);
      g.fillStyle(TRIM, 1).fillEllipse(c.x, c.y, 5, 6);
      g.fillRect(c.x - 1.5, c.y + 2, 3, 2);
    }
  }
  drawUruguayFlag(p, 1, 1, TOP + 4);
}

export const palacioSantos: LandmarkDrawing = {
  size: 3,
  maxZ: 110,
  draw: drawPalacioSantos,
};
