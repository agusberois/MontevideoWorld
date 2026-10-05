import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Rinaldi (Isola y Armas, 1929), en 18 de Julio 839, a pasos de la Plaza Independencia:
 * edificio de renta art déco de ocho pisos, revoque símil piedra color arena. Basamento con los
 * locales y la puerta de hierro, pilastras que suben de corrido y terminan en remates escalonados
 * sobre la azotea, antepechos con zigzag, bow windows en el medio de cada fachada y la cornisa
 * dentada arriba.
 */

const STONE = 0xe3d1a8;
const PIER = shade(STONE, 14);
const PANEL = shade(STONE, -12);
const BASE = 0x8a7a62;
const FLOOR_PX = 15;
const BASE_TOP = 20;
const FLOORS = 7;
const TOP = BASE_TOP + FLOORS * FLOOR_PX;

/** Antepecho con zigzag art déco entre `u0` y `u1` a la altura `z`. */
function zigzag(p: IsoPainter, face: Face, u0: number, u1: number, z: number) {
  const teeth = Math.max(3, Math.round((u1 - u0) / 0.07));
  const step = (u1 - u0) / teeth;
  const points: Array<[number, number]> = [[u0, z]];
  for (let i = 0; i < teeth; i++) {
    points.push([u0 + (i + 0.5) * step, z + 2.5], [u0 + (i + 1) * step, z]);
  }
  p.facePoly(face, points, PIER);
}

function drawRinaldi(p: IsoPainter) {
  const g = p.g;
  // Basamento: locales con vidriera y la puerta de hierro forjado del edificio.
  p.box(-0.5, -0.5, 2.5, 2.5, 0, BASE_TOP, boxColors(BASE));
  for (const face of facesOf(2.5, 2.5)) {
    p.windows(face, -0.45, 2.45, 2, BASE_TOP - 3, 4, 1, { color: 0x2b3442, widthRatio: 0.78, heightRatio: 0.88 });
  }
  const south: Face = { side: "south", y: 2.5 };
  p.faceRect(south, 0.75, 1.25, 0, BASE_TOP - 2, 0x1f1f22);
  for (let u = 0.8; u < 1.25; u += 0.08) p.faceRect(south, u, u + 0.015, 1, BASE_TOP - 3, 0xc9a227);

  // Cuerpo: pisos con ventanas entre pilastras, antepechos con zigzag y un bow window al medio.
  p.box(-0.5, -0.5, 2.5, 2.5, BASE_TOP, TOP, boxColors(STONE));
  for (const face of facesOf(2.5, 2.5)) {
    for (let f = 0; f < FLOORS; f++) {
      const z = BASE_TOP + f * FLOOR_PX;
      p.windows(face, -0.4, 2.4, z + 4, z + FLOOR_PX - 1, 6, 1, { color: WINDOW, widthRatio: 0.55, heightRatio: 0.9 });
      p.faceRect(face, -0.45, 2.45, z + 1, z + 3.5, PANEL);
      if (f % 2 === 0) zigzag(p, face, -0.4, 2.4, z + 1);
    }
    for (const u of [-0.47, 0.5, 1.5, 2.43]) p.faceRect(face, u, u + 0.07, BASE_TOP, TOP + 12, PIER);
    // Bow window al medio, del primer al sexto piso.
    if (face.side === "south") p.box(0.65, 2.5, 1.35, 2.68, BASE_TOP + FLOOR_PX, TOP - FLOOR_PX, boxColors(PIER));
    else p.box(2.5, 0.65, 2.68, 1.35, BASE_TOP + FLOOR_PX, TOP - FLOOR_PX, boxColors(PIER));
    const bay: Face = face.side === "south" ? { side: "south", y: 2.68 } : { side: "east", x: 2.68 };
    p.windows(bay, 0.7, 1.3, BASE_TOP + FLOOR_PX + 2, TOP - FLOOR_PX - 2, 2, FLOORS - 2, { color: WINDOW, widthRatio: 0.7, heightRatio: 0.7 });
  }

  // Cornisa dentada y remates escalonados de las pilastras sobre la azotea.
  p.box(-0.53, -0.53, 2.53, 2.53, TOP, TOP + 4, boxColors(PIER));
  for (const face of facesOf(2.5, 2.5)) {
    for (let u = -0.4; u < 2.45; u += 0.2) p.faceRect(face, u, u + 0.08, TOP - 3, TOP, PANEL);
  }
  for (const [x, y] of [
    [2.43, 2.43],
    [0.5, 2.43],
    [1.5, 2.43],
    [2.43, 0.5],
    [2.43, 1.5],
  ]) {
    p.box(x - 0.07, y - 0.07, x + 0.07, y + 0.07, TOP + 4, TOP + 14, boxColors(PIER));
    p.box(x - 0.04, y - 0.04, x + 0.04, y + 0.04, TOP + 14, TOP + 20, boxColors(shade(PIER, 6)));
  }
  // Remate central sobre la fachada sur: el frontón escalonado con el nombre (en bloques dorados).
  p.facePoly(south, [[0.5, TOP + 4], [1.5, TOP + 4], [1.5, TOP + 14], [1.3, TOP + 14], [1.3, TOP + 20], [0.7, TOP + 20], [0.7, TOP + 14], [0.5, TOP + 14]], STONE);
  for (let i = 0; i < 4; i++) {
    const c = p.facePoint(south, 0.78 + i * 0.15, TOP + 10);
    g.fillStyle(0xc9a227, 1).fillRect(c.x - 1.5, c.y - 2, 3, 4);
  }
}

export const artDeco: LandmarkDrawing = {
  size: 3,
  maxZ: 160,
  draw: drawRinaldi,
};
