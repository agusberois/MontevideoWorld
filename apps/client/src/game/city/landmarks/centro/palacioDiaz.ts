import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Díaz (Vázquez Barrière y Ruano, 1929), en 18 de Julio 1333: rascacielos art déco de 17
 * pisos, angosto y alto, con pilastras corridas de arriba abajo, la galería comercial en la planta
 * baja (con el acceso de cielorraso decorado) y el **remate escalonado** que se separa de las
 * medianeras: tres escalones y un faro arriba.
 */

const STONE = 0xd6cbb2;
const PIER = shade(STONE, 14);
const SPANDREL = shade(STONE, -14);
const BASE = 0x8d7f69;
const FLOOR_PX = 13;

/** Pilastras de arriba abajo y antepechos con un rombo art déco entre piso y piso. */
function decoFace(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, floors: number) {
  const z1 = z0 + floors * FLOOR_PX;
  const bays = Math.max(2, Math.round((u1 - u0) / 0.32));
  const bay = (u1 - u0) / bays;
  for (let f = 0; f < floors; f++) {
    const z = z0 + f * FLOOR_PX;
    for (let i = 0; i < bays; i++) {
      const u = u0 + i * bay;
      p.faceRect(face, u + bay * 0.2, u + bay * 0.8, z + 4, z + FLOOR_PX - 1, WINDOW);
      p.faceRect(face, u + bay * 0.2, u + bay * 0.8, z + 1, z + 3.5, SPANDREL);
      if (f % 3 === 1) {
        const c = u + bay / 2;
        p.facePoly(face, [[c - 0.04, z + 2.2], [c, z + 3.4], [c + 0.04, z + 2.2], [c, z + 1]], PIER);
      }
    }
  }
  for (let i = 0; i <= bays; i++) p.faceRect(face, u0 + i * bay - 0.03, u0 + i * bay + 0.03, z0, z1 + 4, PIER);
}

function block(p: IsoPainter, a: number, b: number, z0: number, floors: number) {
  const z1 = z0 + floors * FLOOR_PX;
  p.box(a, a, b, b, z0, z1, boxColors(STONE));
  for (const face of facesOf(b, b)) decoFace(p, face, a, b, z0, floors);
  p.box(a - 0.03, a - 0.03, b + 0.03, b + 0.03, z1, z1 + 4, boxColors(PIER));
  return z1 + 4;
}

function drawPalacioDiaz(p: IsoPainter) {
  const a = 0.1;
  const b = 3.1;
  // Planta baja: la galería comercial con su gran acceso en arco al medio.
  p.box(a, a, b, b, 0, 22, boxColors(BASE));
  for (const face of facesOf(b, b)) {
    p.windows(face, a + 0.05, b - 0.05, 2, 19, 5, 1, { color: 0x2b3442, widthRatio: 0.8, heightRatio: 0.9 });
    p.faceArch(face, 1.3, 1.9, 0, 21, 0x1f1a14);
    p.faceArch(face, 1.36, 1.84, 2, 19, 0xe2b53e, 0.35);
  }
  p.box(a - 0.05, a - 0.05, b + 0.05, b + 0.05, 22, 25, boxColors(shade(BASE, 18)));

  // El fuste de 14 pisos y el remate escalonado (tres escalones y el faro).
  let z = block(p, a, b, 25, 14);
  z = block(p, a + 0.35, b - 0.35, z, 2);
  z = block(p, a + 0.7, b - 0.7, z, 1);
  z = block(p, a + 1.0, b - 1.0, z, 1);
  const c = (a + b) / 2;
  p.box(c - 0.2, c - 0.2, c + 0.2, c + 0.2, z, z + 16, boxColors(PIER));
  p.pyramid(c - 0.2, c - 0.2, c + 0.2, c + 0.2, z + 16, z + 30, PIER, shade(PIER, -16));
  p.spire(c, c, z + 30, z + 46, 0x55555c, 1.5);
  const light = p.p(c, c, z + 46);
  p.g.fillStyle(0xd62828, 1).fillCircle(light.x, light.y, 2);
}

export const palacioDiaz: LandmarkDrawing = {
  size: 4,
  maxZ: 340,
  draw: drawPalacioDiaz,
};
