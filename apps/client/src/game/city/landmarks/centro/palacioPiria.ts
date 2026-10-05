import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, WOOD, drawUruguayFlag, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Piria (Camille Gardelle, 1917), frente a la Plaza Cagancha, hoy la Suprema Corte de
 * Justicia: ecléctico a la francesa, de piedra gris clara. Planta baja almohadillada con arcos, dos
 * pisos nobles con columnas pareadas y balcones de balaustres, la cornisa pesada y la **mansarda**
 * de pizarra con ojos de buey; en la esquina (sureste) el **pabellón** con cúpula de mansarda curva y
 * linterna, y al medio de la fachada sur el frontón con el escudo. La bandera, sobre la mansarda.
 */

const STONE = 0xdcd3c1;
const TRIM = shade(STONE, 12);
const RUSTIC = shade(STONE, -10);
const SLATE = 0x56616d;
const GROUND = 28;
const NOBLE = 2;
const FLOOR_PX = 22;
const CORNICE = GROUND + NOBLE * FLOOR_PX;

function facade(p: IsoPainter, face: Face, u0: number, u1: number) {
  // Planta baja almohadillada con arcos.
  p.faceRect(face, u0, u1, 0, GROUND, RUSTIC);
  for (let z = 5; z < GROUND; z += 5) p.line(p.facePoint(face, u0, z), p.facePoint(face, u1, z), 0x000000, 1, 0.12);
  for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.55) p.faceArch(face, u - 0.14, u + 0.14, 3, 24, WINDOW);
  p.faceRect(face, u0, u1, GROUND - 2, GROUND + 1, TRIM);
  // Pisos nobles: ventanas altas entre columnas pareadas, balcón de balaustres en el primero.
  for (let f = 0; f < NOBLE; f++) {
    const z = GROUND + f * FLOOR_PX;
    for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.55) {
      p.faceRect(face, u - 0.1, u + 0.1, z + 4, z + FLOOR_PX - 3, WINDOW);
      p.faceRect(face, u - 0.13, u + 0.13, z + FLOOR_PX - 3, z + FLOOR_PX - 1, TRIM);
      if (f === 0) {
        for (let k = u - 0.14; k < u + 0.15; k += 0.035) p.faceRect(face, k, k + 0.014, z + 1, z + 4, TRIM);
        p.faceRect(face, u - 0.16, u + 0.16, z + 4, z + 5, TRIM);
      }
    }
    for (let u = u0 + 0.025; u < u1; u += 0.55) {
      p.faceRect(face, u, u + 0.04, z, z + FLOOR_PX, TRIM);
      p.faceRect(face, u + 0.07, u + 0.11, z, z + FLOOR_PX, TRIM);
    }
  }
}

/** Mansarda curva (la cúpula del pabellón): perfil que sube curvado hasta la linterna. */
function mansardDome(p: IsoPainter, a: number, b: number, z0: number, height: number) {
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    // Cada escalón más adentro que el anterior, cada vez más: el perfil se curva hacia la linterna.
    const inset = (1 - Math.cos((t1 * Math.PI) / 2)) * 0.35;
    p.box(a + inset, a + inset, b - inset, b - inset, z0 + t0 * height, z0 + t1 * height, boxColors(shade(SLATE, i * 3)), false);
  }
}

function drawPalacioPiria(p: IsoPainter) {
  const g = p.g;
  p.box(-0.5, -0.5, 3.5, 3.5, 0, CORNICE, boxColors(STONE));
  for (const face of facesOf(3.5, 3.5)) facade(p, face, -0.5, 3.5);
  // Puerta principal al medio de la fachada sur, con el frontón y el escudo arriba.
  const south: Face = { side: "south", y: 3.5 };
  p.faceArch(south, 1.25, 1.75, 0, 26, WOOD);
  p.faceRect(south, 1.49, 1.51, 0, 24, shade(WOOD, -25));
  p.box(-0.55, -0.55, 3.55, 3.55, CORNICE, CORNICE + 6, boxColors(TRIM));
  for (const face of facesOf(3.5, 3.5)) {
    for (let u = -0.45; u < 3.45; u += 0.14) p.faceRect(face, u, u + 0.05, CORNICE - 3, CORNICE, shade(TRIM, -14));
  }

  // Mansarda de pizarra con ojos de buey.
  p.box(-0.3, -0.3, 3.0, 3.0, CORNICE + 6, CORNICE + 26, boxColors(SLATE));
  for (const face of facesOf(3.0, 3.0)) {
    for (let u = 0.1; u < 2.9; u += 0.55) {
      const c = p.facePoint(face, u, CORNICE + 15);
      g.fillStyle(TRIM, 1).fillEllipse(c.x, c.y, 9, 10);
      g.fillStyle(WINDOW, 1).fillEllipse(c.x, c.y, 5.5, 6.5);
    }
  }
  p.box(-0.3, -0.3, 3.0, 3.0, CORNICE + 26, CORNICE + 28, boxColors(shade(SLATE, 16)));
  // Frontón al medio de la fachada sur con el escudo (tapa la mansarda de ese tramo).
  p.facePoly(south, [[0.9, CORNICE + 6], [2.1, CORNICE + 6], [1.5, CORNICE + 24]], TRIM);
  const shield = p.facePoint(south, 1.5, CORNICE + 13);
  g.fillStyle(0x2b4a7a, 1).fillEllipse(shield.x, shield.y, 7, 9);
  g.fillStyle(0xf2c94c, 1).fillCircle(shield.x, shield.y - 1, 1.8);

  // El pabellón de la esquina: un cuerpo más alto con la cúpula de mansarda curva y la linterna.
  const a = 2.6;
  const b = 3.55;
  p.box(a, a, b, b, CORNICE + 6, CORNICE + 18, boxColors(STONE));
  for (const face of facesOf(b, b)) p.windows(face, a + 0.1, b - 0.1, CORNICE + 8, CORNICE + 16, 2, 1, { color: WINDOW, arched: true, widthRatio: 0.45 });
  p.box(a - 0.03, a - 0.03, b + 0.03, b + 0.03, CORNICE + 18, CORNICE + 21, boxColors(TRIM));
  mansardDome(p, a, b, CORNICE + 21, 26);
  const c = (a + b) / 2;
  p.box(c - 0.1, c - 0.1, c + 0.1, c + 0.1, CORNICE + 47, CORNICE + 57, boxColors(TRIM));
  p.pyramid(c - 0.12, c - 0.12, c + 0.12, c + 0.12, CORNICE + 57, CORNICE + 64, SLATE, shade(SLATE, -12));
  p.spire(c, c, CORNICE + 64, CORNICE + 72, 0x3b4046, 1.4);
  drawUruguayFlag(p, 1.2, 1.2, CORNICE + 28);
}

export const palacioPiria: LandmarkDrawing = {
  size: 4,
  maxZ: 160,
  draw: drawPalacioPiria,
};
