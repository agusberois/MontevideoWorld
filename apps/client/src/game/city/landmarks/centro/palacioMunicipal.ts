import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, drawUruguayFlag, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Municipal (la Intendencia, Mauricio Cravotto, 1941), en un área de 8 × 8, pasando Ejido.
 * Moderno, de hormigón y piedra clara (el revestimiento de ladrillo del proyecto nunca se puso):
 * - Las **alas** bajas de cuatro pisos alrededor del patio (sobre Soriano, Ejido y Santiago de Chile).
 * - El **cuerpo principal** sobre la explanada de 18 de Julio: cinco pisos de ventanas corridas, la
 *   planta baja en **pórtico** de pilares, la entrada al medio con la escalinata y los relieves.
 * - La **torre** de 22 pisos (78 m) al medio, con pilares de arriba abajo, el **ascensor exterior**
 *   vidriado sobre la cara este (sube al piso 22) y el **mirador** vidriado arriba, con la bandera.
 */

const CONCRETE = 0xd8d1c2;
const PIER = shade(CONCRETE, 12);
const GLASS = 0x9fc9d9;
const DARK = 0x2a2f36;
const FLOOR_PX = 12;

/** Cuerpo con ventanas corridas (franjas) en cada piso y la losa marcada. */
function body(p: IsoPainter, x0: number, y0: number, x1: number, y1: number, z0: number, floors: number) {
  const z1 = z0 + floors * FLOOR_PX;
  p.box(x0, y0, x1, y1, z0, z1, boxColors(CONCRETE));
  for (const face of facesOf(x1, y1)) {
    const [u0, u1] = face.side === "south" ? [x0, x1] : [y0, y1];
    for (let f = 0; f < floors; f++) {
      const z = z0 + f * FLOOR_PX;
      p.faceRect(face, u0 + 0.05, u1 - 0.05, z + 3, z + FLOOR_PX - 2, WINDOW);
      for (let u = u0 + 0.25; u < u1 - 0.1; u += 0.25) p.faceRect(face, u - 0.015, u + 0.015, z + 3, z + FLOOR_PX - 2, PIER);
    }
  }
  p.box(x0 - 0.04, y0 - 0.04, x1 + 0.04, y1 + 0.04, z1, z1 + 3, boxColors(PIER));
  return z1 + 3;
}

function drawPalacioMunicipal(p: IsoPainter) {
  const g = p.g;
  // Alas de atrás y de los costados, más bajas.
  body(p, -0.5, -0.5, 7.5, 1.6, 0, 4);
  body(p, -0.5, 1.6, 1.2, 7.3, 0, 4);
  body(p, 5.8, 1.6, 7.5, 7.3, 0, 4);

  // La torre: 22 pisos, pilares corridos, el mirador vidriado arriba y la bandera.
  const t = { a: 2.7, b: 4.3, y0: 1.9, y1: 3.5 };
  const shaft = 22 * FLOOR_PX;
  p.box(t.a, t.y0, t.b, t.y1, 0, shaft, boxColors(CONCRETE));
  for (const face of [
    { side: "south", y: t.y1 },
    { side: "east", x: t.b },
  ] as const) {
    const [u0, u1] = face.side === "south" ? [t.a, t.b] : [t.y0, t.y1];
    for (let f = 0; f < 21; f++) {
      const z = f * FLOOR_PX;
      p.faceRect(face, u0 + 0.08, u1 - 0.08, z + 3, z + FLOOR_PX - 2, WINDOW);
    }
    for (let u = u0; u <= u1 + 0.001; u += (u1 - u0) / 5) p.faceRect(face, u - 0.035, u + 0.035, 0, shaft, PIER);
    // El mirador del piso 22: todo vidriado.
    p.faceRect(face, u0 + 0.04, u1 - 0.04, shaft - FLOOR_PX + 1, shaft - 1, GLASS);
  }
  p.box(t.a - 0.08, t.y0 - 0.08, t.b + 0.08, t.y1 + 0.08, shaft, shaft + 5, boxColors(PIER));
  p.box(t.a + 0.3, t.y0 + 0.3, t.b - 0.3, t.y1 - 0.3, shaft + 5, shaft + 16, boxColors(CONCRETE));
  drawUruguayFlag(p, (t.a + t.b) / 2, (t.y0 + t.y1) / 2, shaft + 16);

  // El ascensor exterior, pegado a la cara este de la torre: el tubo vidriado y la cabina.
  const e = { x0: t.b, x1: t.b + 0.32, y0: 2.5, y1: 2.9 };
  p.box(e.x0, e.y0, e.x1, e.y1, 0, shaft + 4, { top: shade(GLASS, 10), south: GLASS, east: shade(GLASS, -12) });
  for (let z = 0; z < shaft; z += FLOOR_PX * 2) {
    p.line(p.p(e.x1, e.y0, z), p.p(e.x1, e.y1, z), DARK, 1, 0.5);
  }
  p.box(e.x0 + 0.03, e.y0 + 0.03, e.x1 - 0.03, e.y1 - 0.03, 150, 162, boxColors(0xf2f2f2));

  // Cuerpo principal sobre la explanada, delante de la torre.
  const front = { x0: 1.2, x1: 5.8, y0: 4.2, y1: 7.0 };
  const portico = 16;
  // Planta baja en pórtico: el fondo oscuro y los pilares adelante.
  p.box(front.x0 + 0.15, front.y0, front.x1 - 0.15, front.y1 - 0.25, 0, portico, boxColors(DARK));
  for (let x = front.x0 + 0.05; x <= front.x1 - 0.05; x += 0.46) p.box(x - 0.05, front.y1 - 0.12, x + 0.05, front.y1, 0, portico, boxColors(PIER));
  for (let y = front.y0 + 0.2; y <= front.y1 - 0.1; y += 0.46) p.box(front.x1 - 0.12, y - 0.05, front.x1, y + 0.05, 0, portico, boxColors(PIER));
  body(p, front.x0, front.y0, front.x1, front.y1, portico, 5);
  // Entrada al medio: los relieves a los costados y la escalinata hacia la explanada.
  const south: Face = { side: "south", y: front.y1 };
  for (const u of [2.55, 4.45]) p.faceRect(south, u - 0.25, u + 0.25, portico + 4, portico + 44, shade(CONCRETE, 18));
  for (const u of [2.55, 4.45]) {
    const c = p.facePoint(south, u, portico + 24);
    g.lineStyle(1.2, shade(CONCRETE, -25), 1).strokeEllipse(c.x, c.y, 8, 22);
  }
  for (let i = 0; i < 3; i++) p.box(2.9, front.y1 + i * 0.12, 4.1, front.y1 + (i + 1) * 0.12, 0, 4 - i * 1.3, boxColors(shade(CONCRETE, 6)), false);
}

export const palacioMunicipal: LandmarkDrawing = {
  size: 8,
  maxZ: 320,
  draw: drawPalacioMunicipal,
  // Cartel "MW": sobre la azotea del cuerpo principal, a la derecha.
  roof: { u: 5.1, v: 5.8, z: 79 },
};
