import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, WOOD, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Sinagoga del barrio: templo de piedra clara con ventanales de medio punto, frontón con la estrella
 * de David sobre la entrada (cara este) y dos torrecitas con cupulín a los lados.
 */

const STONE = 0xe9dfcc;
const TRIM = 0xcdbf9f;
const DOME = 0x7a9fb8;
const STAR = 0x2f5d8a;

function drawSinagoga(p: IsoPainter) {
  const east: Face = { side: "east", x: 2.5 };
  const south: Face = { side: "south", y: 2.3 };

  // Nave.
  p.box(-0.5, -0.3, 2.5, 2.3, 0, 52, boxColors(STONE));
  p.windows(south, -0.4, 2.4, 10, 46, 4, 1, { color: WINDOW, arched: true, widthRatio: 0.4, heightRatio: 0.8 });
  p.faceRect(south, -0.5, 2.5, 0, 4, shade(STONE, -25));
  p.box(-0.55, -0.35, 2.55, 2.35, 52, 56, boxColors(TRIM));

  // Fachada este: escalinata, puerta de madera, ventana redonda y frontón con la estrella.
  p.box(2.5, 0.6, 2.75, 1.4, 0, 4, boxColors(shade(STONE, -10)));
  p.faceArch(east, 0.75, 1.25, 4, 34, WOOD);
  p.windows(east, -0.2, 0.6, 12, 46, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.5, heightRatio: 0.8 });
  p.windows(east, 1.4, 2.2, 12, 46, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.5, heightRatio: 0.8 });
  p.facePoly(
    east,
    [
      [-0.3, 56],
      [2.3, 56],
      [1.0, 78],
    ],
    STONE,
  );
  drawStarOfDavid(p, east, 1.0, 64, 0.22, 7);
  p.faceRect(east, 0.55, 1.45, 40, 42, TRIM);

  // Torrecitas a los lados de la fachada.
  for (const [y0, y1] of [
    [-0.5, 0.1],
    [1.9, 2.5],
  ]) {
    p.box(1.9, y0, 2.5, y1, 0, 70, boxColors(STONE));
    for (const face of facesOf(2.5, y1)) {
      const [u0, u1] = face.side === "south" ? [1.9, 2.5] : [y0, y1];
      p.windows(face, u0, u1, 50, 66, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.45 });
    }
    p.box(1.86, y0 - 0.04, 2.54, y1 + 0.04, 70, 73, boxColors(TRIM));
    p.dome(2.2, (y0 + y1) / 2, 73, 9, DOME);
  }
}

/** Estrella de David sobre una cara: dos triángulos (u = centro a lo largo de la cara, z = altura del centro). */
function drawStarOfDavid(p: IsoPainter, face: Face, u: number, z: number, halfWidth: number, halfHeight: number) {
  const up: Array<[number, number]> = [
    [u - halfWidth, z - halfHeight * 0.5],
    [u + halfWidth, z - halfHeight * 0.5],
    [u, z + halfHeight],
  ];
  const down: Array<[number, number]> = [
    [u - halfWidth, z + halfHeight * 0.5],
    [u + halfWidth, z + halfHeight * 0.5],
    [u, z - halfHeight],
  ];
  for (const triangle of [up, down]) {
    const points = triangle.map(([tu, tz]) => p.facePoint(face, tu, tz));
    p.g.lineStyle(1.6, STAR, 1);
    p.g.strokePoints(points, true);
  }
}

export const sinagoga: LandmarkDrawing = {
  size: 3,
  maxZ: 90,
  draw: drawSinagoga,
};
