import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";
import { cylinder, onCylinder } from "./common";

/**
 * Edificio London París (The Standard Life, 1905–1908), en 18 de Julio y Río Negro: ecléctico, de
 * piedra gris clara. Cinco pisos con balcones distintos en cada uno (hierro, balaustrada de piedra,
 * corridos), pilastras, la planta baja de vidrieras de la vieja tienda por departamentos y la
 * **mansarda** de pizarra con lucarnas. En la esquina (la sureste), la **torre octogonal** con
 * "LONDON PARIS" escrito y el **reloj triple** abajo; encima, un templete circular de columnas con
 * la cúpula de zinc y, arriba de todo, el **Atlas con el mundo**, símbolo de la aseguradora.
 */

const STONE = 0xe1dbcd;
const TRIM = shade(STONE, 12);
const DARK_STONE = shade(STONE, -24);
const SLATE = 0x56616d;
const ZINC = 0x7f8d8f;
const IRON = 0x262626;
const SIGN = 0x1f2733;
const GOLD = 0xd9b44a;
const BRONZE = 0x4b4a3a;
const FLOOR_PX = 18;
const GROUND = 24;
const FLOORS = 4;
const CORNICE = GROUND + FLOORS * FLOOR_PX;

/** Balcón de cada piso: hierro (pares), balaustrada de piedra (impares). */
function balconies(p: IsoPainter, face: Face, u0: number, u1: number, z: number, stone: boolean) {
  for (let u = u0 + 0.1; u < u1 - 0.1; u += 0.5) {
    if (stone) {
      p.faceRect(face, u, u + 0.32, z, z + 1.6, TRIM);
      for (let k = u + 0.03; k < u + 0.32; k += 0.05) p.faceRect(face, k, k + 0.02, z + 1.6, z + 5, TRIM);
      p.faceRect(face, u, u + 0.32, z + 5, z + 6, TRIM);
    } else {
      p.faceRect(face, u, u + 0.32, z, z + 1, IRON);
      for (let k = u + 0.02; k < u + 0.32; k += 0.04) p.faceRect(face, k, k + 0.01, z + 1, z + 5, IRON);
      p.faceRect(face, u, u + 0.32, z + 5, z + 5.8, IRON);
    }
  }
}

function drawLondonParis(p: IsoPainter) {
  const g = p.g;
  // --- El cuerpo sobre las dos calles ---
  p.box(-0.5, -0.5, 3.5, 3.5, 0, CORNICE, boxColors(STONE));
  for (const face of facesOf(3.5, 3.5)) {
    // Planta baja: vidrieras grandes con lo que vende la tienda, entre pilares de piedra oscura.
    p.faceRect(face, -0.5, 3.5, 0, GROUND, DARK_STONE);
    p.windows(face, -0.45, 2.45, 2, GROUND - 4, 5, 1, { color: 0xbfd8e4, widthRatio: 0.84, heightRatio: 0.92 });
    const colors = [0xe63946, 0x2b3a55, 0xf2b705, 0x6cace4, 0x7b1e2b, 0xf1f1f1];
    for (let i = 0; i < 14; i++) {
      const u = -0.35 + i * 0.2;
      p.facePoly(face, [[u - 0.05, 16], [u + 0.05, 16], [u + 0.04, 8], [u - 0.04, 8]], colors[i % colors.length]);
    }
    p.faceRect(face, -0.5, 3.5, GROUND - 3, GROUND, TRIM);
    // Pisos: ventanas con arco, un balcón distinto en cada piso y pilastras.
    for (let f = 0; f < FLOORS; f++) {
      const z = GROUND + f * FLOOR_PX;
      p.windows(face, -0.42, 2.5, z + 3, z + FLOOR_PX - 1, 6, 1, { color: WINDOW, arched: f === FLOORS - 1, widthRatio: 0.48, heightRatio: 0.78 });
      balconies(p, face, -0.45, 2.55, z + 2, f % 2 === 1);
    }
    for (const u of [-0.47, 0.55, 1.55, 2.5]) p.faceRect(face, u, u + 0.06, GROUND, CORNICE - 2, TRIM);
  }
  p.box(-0.55, -0.55, 3.55, 3.55, CORNICE, CORNICE + 5, boxColors(TRIM));
  // Mansarda de pizarra con lucarnas (ojos de buey).
  p.box(-0.35, -0.35, 2.7, 2.7, CORNICE + 5, CORNICE + 22, boxColors(SLATE));
  for (const face of facesOf(2.7, 2.7)) {
    for (let u = 0; u < 2.6; u += 0.6) {
      const c = p.facePoint(face, u, CORNICE + 13);
      g.fillStyle(TRIM, 1).fillEllipse(c.x, c.y, 8, 8);
      g.fillStyle(WINDOW, 1).fillEllipse(c.x, c.y, 5, 5);
    }
  }
  p.box(-0.35, -0.35, 2.7, 2.7, CORNICE + 22, CORNICE + 25, boxColors(shade(SLATE, 14)));

  // --- La torre octogonal de la esquina ---
  const t = { x: 2.95, y: 2.95, r: 0.62 };
  const towerTop = CORNICE + 44;
  cylinder(p, t.x, t.y, t.r, 0, towerTop, STONE);
  for (let f = 0; f < FLOORS; f++) {
    const z = GROUND + f * FLOOR_PX;
    for (const theta of [0.15, 0.785, 1.42]) {
      const a = onCylinder(p, t.x, t.y, t.r, theta - 0.18, z + 4);
      const b = onCylinder(p, t.x, t.y, t.r, theta + 0.18, z + FLOOR_PX - 2);
      g.fillStyle(WINDOW, 1).fillRect(Math.min(a.x, b.x), b.y, Math.abs(b.x - a.x), a.y - b.y);
    }
  }
  // El letrero "LONDON PARIS" en una franja oscura con letras doradas.
  const band0 = CORNICE + 4;
  for (let i = 0; i < 12; i++) {
    const theta = -0.2 + (i / 11) * 1.95;
    const top = onCylinder(p, t.x, t.y, t.r + 0.02, theta, band0 + 10);
    const bottom = onCylinder(p, t.x, t.y, t.r + 0.02, theta, band0);
    g.fillStyle(SIGN, 1).fillRect(top.x - 3.5, top.y, 7, bottom.y - top.y);
    if (i !== 6) g.fillStyle(GOLD, 1).fillRect(top.x - 1.6, top.y + 2.5, 3.2, 5);
  }
  // El reloj triple, arriba del letrero.
  for (const theta of [0.1, 0.785, 1.47]) {
    const c = onCylinder(p, t.x, t.y, t.r + 0.02, theta, band0 + 22);
    g.fillStyle(TRIM, 1).fillCircle(c.x, c.y, 6.5);
    g.fillStyle(0xf8f4ea, 1).fillCircle(c.x, c.y, 5);
    g.lineStyle(1, 0x2b2b30, 1).lineBetween(c.x, c.y, c.x, c.y - 3.5);
    g.lineBetween(c.x, c.y, c.x + 2.5, c.y + 1);
  }
  p.box(t.x - t.r - 0.06, t.y - t.r - 0.06, t.x + t.r + 0.06, t.y + t.r + 0.06, towerTop, towerTop + 4, boxColors(TRIM));

  // Templete circular de columnas, la cúpula de zinc y el Atlas con el mundo.
  const tz = towerTop + 4;
  const tr = 0.38;
  cylinder(p, t.x, t.y, tr, tz, tz + 3, TRIM);
  for (let i = 0; i < 7; i++) {
    const theta = -Math.PI / 4 + (i / 6) * Math.PI;
    const base = onCylinder(p, t.x, t.y, tr - 0.04, theta, tz + 3);
    const top = onCylinder(p, t.x, t.y, tr - 0.04, theta, tz + 24);
    g.lineStyle(2.4, TRIM, 1).lineBetween(base.x, base.y, top.x, top.y);
  }
  cylinder(p, t.x, t.y, tr, tz + 24, tz + 28, TRIM);
  p.dome(t.x, t.y, tz + 28, 20, ZINC);
  p.spire(t.x, t.y, tz + 46, tz + 52, IRON, 2);
  // Atlas: de rodillas, con el mundo en los hombros.
  const a = p.p(t.x, t.y, tz + 52);
  g.fillStyle(BRONZE, 1);
  g.fillTriangle(a.x - 5, a.y, a.x + 5, a.y, a.x, a.y - 10);
  g.fillRect(a.x - 2.5, a.y - 15, 5, 7);
  g.lineStyle(2, BRONZE, 1).lineBetween(a.x - 2.5, a.y - 14, a.x - 6, a.y - 20);
  g.lineBetween(a.x + 2.5, a.y - 14, a.x + 6, a.y - 20);
  g.fillStyle(shade(BRONZE, 18), 1).fillCircle(a.x, a.y - 25, 7);
  g.lineStyle(0.8, shade(BRONZE, -20), 1).strokeEllipse(a.x, a.y - 25, 14, 5);
  g.lineBetween(a.x, a.y - 32, a.x, a.y - 18);
}

export const londonParis: LandmarkDrawing = {
  size: 4,
  maxZ: 240,
  draw: drawLondonParis,
};
