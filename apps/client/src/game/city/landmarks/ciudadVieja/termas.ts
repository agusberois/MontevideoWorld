import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Hotel del Donador (por fuera; adentro está el spa con el jacuzzi): un cinco estrellas ostentoso de
 * mármol blanco con todo en dorado. Cinco pisos con balcones de baranda dorada y ventanales de medio
 * punto, pilastras, un pórtico de columnas sobre la entrada (cara sur, la de la vereda) con la
 * alfombra roja, la marquesina dorada y las cinco estrellas, y arriba una mansarda de pizarra con
 * crestería dorada, una cúpula al medio y dos banderas. Sólo entran los donadores (`Door.access`).
 */

const MARBLE = 0xf6f1e6;
const MARBLE_SHADE = shade(MARBLE, -14);
const GOLD = 0xd4a52c;
const GOLD_LIGHT = 0xf2d16b;
const GLASS = 0x2b3d52;
const SLATE = 0x3b4350;
const CARPET = 0xb3122e;
const HEIGHT = 108;
const FLOORS = 5;
const FLOOR = 18;

/** Baranda dorada de balcón (una franja con barrotes) sobre una cara, de u0 a u1 a la altura z. */
function balcony(p: IsoPainter, face: Face, u0: number, u1: number, z: number) {
  p.faceRect(face, u0, u1, z, z + 1.4, GOLD);
  for (let u = u0; u <= u1; u += 0.08) p.faceRect(face, u, u + 0.018, z - 4, z, GOLD);
  p.faceRect(face, u0, u1, z - 4.5, z - 3.6, shade(GOLD, -20));
}

function drawHotel(p: IsoPainter) {
  const south: Face = { side: "south", y: 3.5 };
  const g = p.g;

  // Cuerpo de mármol: basamento almohadillado, pisos con ventanales y balcones dorados, pilastras.
  p.box(-0.5, -0.5, 3.5, 3.5, 0, HEIGHT, boxColors(MARBLE));
  for (const face of facesOf(3.5, 3.5)) {
    p.faceRect(face, -0.5, 3.5, 0, 16, MARBLE_SHADE);
    for (let z = 4; z < 16; z += 4) p.faceRect(face, -0.5, 3.5, z, z + 0.6, shade(MARBLE, -26));
    p.faceRect(face, -0.5, 3.5, 16, 18, GOLD);
    for (let floor = 0; floor < FLOORS; floor++) {
      const z0 = 18 + floor * FLOOR;
      p.windows(face, -0.4, 3.4, z0 + 2, z0 + FLOOR - 1, 6, 1, { color: GLASS, arched: true, widthRatio: 0.5, heightRatio: 0.82 });
      // Un brillo dorado en cada ventanal (luz cálida de adentro).
      p.windows(face, -0.4, 3.4, z0 + 3, z0 + 6, 6, 1, { color: shade(GOLD_LIGHT, -10), widthRatio: 0.3, heightRatio: 0.6 });
      if (floor > 0) balcony(p, face, -0.42, 3.42, z0 + 4);
    }
    for (const u of [-0.5, 0.5, 1.5, 2.5, 3.44]) p.faceRect(face, u, u + 0.06, 18, HEIGHT - 6, shade(MARBLE, 6));
    // Cornisa dorada con dentículos.
    p.faceRect(face, -0.5, 3.5, HEIGHT - 6, HEIGHT - 3, GOLD);
    for (let u = -0.45; u < 3.5; u += 0.12) p.faceRect(face, u, u + 0.05, HEIGHT - 3, HEIGHT - 1.5, shade(GOLD, -15));
  }

  // Mansarda de pizarra con lucarnas y crestería dorada, cúpula al medio y dos banderas.
  p.box(-0.55, -0.55, 3.55, 3.55, HEIGHT, HEIGHT + 3, boxColors(GOLD));
  p.pyramid(-0.4, -0.4, 3.4, 3.4, HEIGHT + 3, HEIGHT + 34, SLATE, shade(SLATE, -14));
  for (const [u, v] of [
    [0.6, 3.15],
    [1.5, 3.15],
    [2.4, 3.15],
    [3.15, 0.6],
    [3.15, 1.5],
    [3.15, 2.4],
  ]) {
    const c = p.p(u, v, HEIGHT + 9);
    g.fillStyle(MARBLE, 1).fillRect(c.x - 3.5, c.y - 7, 7, 8);
    g.fillStyle(GOLD_LIGHT, 1).fillRect(c.x - 2.2, c.y - 5.5, 4.4, 5);
  }
  p.dome(1.5, 1.5, HEIGHT + 30, 14, GOLD);
  p.spire(1.5, 1.5, HEIGHT + 37, HEIGHT + 52, GOLD, 2);
  for (const [u, v, color] of [
    [0.1, 3.3, 0x4f86c6],
    [3.3, 0.1, 0xe0476b],
  ] as const) {
    const base = p.p(u, v, HEIGHT + 3);
    const top = p.p(u, v, HEIGHT + 30);
    g.lineStyle(1.5, 0xc9c9c9, 1).lineBetween(base.x, base.y, top.x, top.y);
    g.fillStyle(color, 1).fillTriangle(top.x, top.y, top.x + 10, top.y + 3, top.x, top.y + 7);
  }

  // Pórtico de entrada (sobre la cara sur): columnas de mármol, frontón con las cinco estrellas y la
  // marquesina dorada; adelante, la alfombra roja hasta la vereda.
  p.fill(CARPET, [p.p(1.15, 3.5, 0.2), p.p(1.85, 3.5, 0.2), p.p(1.85, 4.45, 0.2), p.p(1.15, 4.45, 0.2)]);
  p.fill(shade(CARPET, 25), [p.p(1.15, 3.5, 0.3), p.p(1.2, 3.5, 0.3), p.p(1.2, 4.45, 0.3), p.p(1.15, 4.45, 0.3)]);
  p.faceArch(south, 1.15, 1.85, 0, 26, 0x5a3a1c);
  p.faceRect(south, 1.48, 1.52, 2, 24, GOLD);
  for (const u of [0.9, 2.1]) {
    p.box(u - 0.07, 3.5, u + 0.07, 3.85, 0, 34, boxColors(MARBLE));
    p.box(u - 0.1, 3.5, u + 0.1, 3.88, 34, 36, boxColors(GOLD));
  }
  p.box(0.75, 3.5, 2.25, 3.92, 36, 41, boxColors(GOLD));
  const front: Face = { side: "south", y: 3.92 };
  p.facePoly(
    front,
    [
      [0.75, 41],
      [2.25, 41],
      [1.5, 52],
    ],
    MARBLE,
  );
  for (let i = 0; i < 5; i++) {
    const star = p.facePoint(front, 1.1 + i * 0.2, 45.5);
    drawStar(p.g, star.x, star.y, 2.4);
  }
  // Faroles dorados a los costados de la puerta.
  for (const u of [0.6, 2.4]) {
    const lamp = p.facePoint(south, u, 22);
    g.fillStyle(GOLD, 1).fillRect(lamp.x - 1.5, lamp.y - 6, 3, 6);
    g.fillStyle(0xfff3b0, 1).fillCircle(lamp.x, lamp.y - 7, 2.6);
  }
}

/** Estrellita dorada de cinco puntas (las del cartel del hotel). */
function drawStar(g: IsoPainter["g"], x: number, y: number, r: number) {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
  }
  g.fillStyle(GOLD, 1).fillPoints(points, true);
}

export const termas: LandmarkDrawing = {
  size: 4,
  maxZ: HEIGHT + 56,
  draw: drawHotel,
};
