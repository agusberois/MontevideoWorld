import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";
import { roundedBand, roundedBox } from "./common";

/**
 * Palacio Lapido (Aubriot y Valabrega, 1933), en 18 de Julio y Río Branco: doce pisos blancos que
 * **doblan la esquina en curva** (la sureste) con balcones corridos y las ventanas en franjas; la
 * planta baja con los locales (ahí estuvo La Tribuna Popular), los pisos de arriba que se retiran
 * en dos escalones y, en la esquina, la torre con el mástil.
 */

const WHITE = 0xf1eee6;
const BAND = 0x34414f;
const SLAB = 0xfbfaf6;
const SHOP = 0x2b3442;
const FLOOR_PX = 15;
const GROUND = 20;
const FLOORS = 10;
const BODY_TOP = GROUND + FLOORS * FLOOR_PX;

/** Un cuerpo con la esquina curva y sus pisos: franja de ventanas y losa del balcón en cada piso. */
function stage(p: IsoPainter, a: number, b: number, r: number, z0: number, floors: number) {
  const z1 = z0 + floors * FLOOR_PX;
  roundedBox(p, a, a, b, b, r, z0, z1, WHITE);
  for (let i = 0; i < floors; i++) {
    const z = z0 + i * FLOOR_PX;
    roundedBand(p, a, a, b, b, r, z + 4, z + 11, BAND);
    roundedBand(p, a, a, b, b, r, z + 1, z + 3, SLAB, 0.06);
  }
  roundedBand(p, a, a, b, b, r, z1 - 1, z1 + 2, shade(WHITE, 8), 0.04);
  return z1;
}

function drawLapido(p: IsoPainter) {
  // Planta baja: locales vidriados y la marquesina corrida.
  roundedBox(p, -0.5, -0.5, 3.5, 3.5, 1.3, 0, GROUND, shade(WHITE, -8));
  roundedBand(p, -0.5, -0.5, 3.5, 3.5, 1.3, 2, GROUND - 4, SHOP);
  for (let u = 0; u < 3.4; u += 0.5) {
    p.faceRect({ side: "south", y: 3.5 }, u - 0.02, u + 0.02, 2, GROUND - 4, shade(WHITE, -20));
    p.faceRect({ side: "east", x: 3.5 }, u - 0.5 - 0.02, u - 0.5 + 0.02, 2, GROUND - 4, shade(WHITE, -20));
  }
  roundedBand(p, -0.5, -0.5, 3.5, 3.5, 1.3, GROUND - 3, GROUND, SLAB, 0.14);

  // El cuerpo de diez pisos y los dos escalones de arriba.
  stage(p, -0.5, 3.5, 1.3, GROUND, FLOORS);
  const step1 = stage(p, -0.2, 3.2, 1.1, BODY_TOP + 2, 1);
  const step2 = stage(p, 0.2, 2.9, 0.9, step1 + 2, 1);

  // La torre de la esquina: un cilindro más alto con franjas verticales, la losa de remate y el mástil.
  const t = { x: 2.3, y: 2.3, r: 0.45 };
  const towerTop = step2 + 40;
  roundedBox(p, t.x - t.r, t.y - t.r, t.x + t.r, t.y + t.r, t.r * 0.95, step2, towerTop, WHITE);
  for (const u of [-0.25, 0, 0.25]) {
    p.faceRect({ side: "south", y: t.y + t.r }, t.x + u - 0.04, t.x + u + 0.04, step2 + 6, towerTop - 6, BAND);
  }
  p.box(t.x - t.r - 0.08, t.y - t.r - 0.08, t.x + t.r + 0.08, t.y + t.r + 0.08, towerTop, towerTop + 4, boxColors(SLAB));
  p.spire(t.x, t.y, towerTop + 4, towerTop + 40, 0x55555c, 1.6);
}

export const lapido: LandmarkDrawing = {
  size: 4,
  maxZ: 300,
  draw: drawLapido,
};
