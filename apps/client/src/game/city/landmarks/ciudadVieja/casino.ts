import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Casino (Ciudad Vieja, 3 × 3): edificio rojo oscuro y dorado de tres pisos, con la marquesina de
 * lamparitas sobre la entrada (cara sur), el cartel "CASINO" en neón, columnas doradas, ventanales
 * con luz cálida, una corona de focos en el techo y las fichas y los naipes pintados en la cara este.
 * Se entra por la puerta (`Door`, cualquiera).
 */

const WALL = 0x7a1424;
const GOLD = 0xe2b53e;
const GLOW = 0xffe08a;
const NEON = 0xff3d7f;
const HEIGHT = 74;

/** Fila de lamparitas encendidas a lo largo de una cara. */
function bulbs(p: IsoPainter, face: Face, u0: number, u1: number, z: number, step = 0.18) {
  for (let u = u0; u <= u1; u += step) {
    const c = p.facePoint(face, u, z);
    p.g.fillStyle(GLOW, 1).fillCircle(c.x, c.y, 1.6);
  }
}

function drawCasino(p: IsoPainter) {
  const south: Face = { side: "south", y: 2.5 };
  const east: Face = { side: "east", x: 2.5 };
  const g = p.g;

  p.box(-0.5, -0.5, 2.5, 2.5, 0, HEIGHT, boxColors(WALL));
  for (const face of facesOf(2.5, 2.5)) {
    p.faceRect(face, -0.5, 2.5, 0, 6, shade(WALL, -30));
    // Dos pisos de ventanales con luz y columnas doradas entre medio.
    p.windows(face, -0.4, 2.4, 30, 66, 4, 2, { color: shade(GLOW, -10), arched: true, widthRatio: 0.45, heightRatio: 0.75 });
    for (const u of [-0.5, 0.25, 1.0, 1.75, 2.44]) p.faceRect(face, u, u + 0.06, 6, HEIGHT - 4, GOLD);
    p.faceRect(face, -0.5, 2.5, HEIGHT - 5, HEIGHT - 2, GOLD);
    bulbs(p, face, -0.45, 2.45, HEIGHT - 1);
  }

  // Entrada: puerta de vidrio dorada bajo la marquesina de lamparitas, con el cartel en neón.
  p.faceRect(south, 0.55, 1.45, 0, 22, 0x2a1a10);
  p.faceRect(south, 0.97, 1.03, 0, 22, GOLD);
  p.faceRect(south, 0.6, 0.92, 2, 20, shade(GLOW, -30), 0.6);
  p.faceRect(south, 1.08, 1.4, 2, 20, shade(GLOW, -30), 0.6);
  p.box(0.2, 2.5, 1.8, 2.95, 24, 28, boxColors(GOLD));
  const marquee: Face = { side: "south", y: 2.95 };
  bulbs(p, marquee, 0.25, 1.75, 26, 0.12);
  // Cartel "CASINO" (letras de neón sobre un fondo oscuro) arriba de la marquesina.
  p.faceRect(south, 0.15, 1.85, 30, 38, 0x1a0a10);
  const text = "CASINO";
  for (let i = 0; i < text.length; i++) {
    const c = p.facePoint(south, 0.3 + i * 0.28, 34);
    g.fillStyle(NEON, 1).fillRect(c.x - 2, c.y - 3, 4, 6);
    g.fillStyle(0xffffff, 0.7).fillRect(c.x - 1, c.y - 2, 2, 4);
  }

  // Cara este: una ficha y dos naipes gigantes.
  const chip = p.facePoint(east, 1, 18);
  g.fillStyle(0xffffff, 1).fillCircle(chip.x, chip.y, 8);
  g.fillStyle(0xd62828, 1).fillCircle(chip.x, chip.y, 6);
  g.fillStyle(0xffffff, 1).fillCircle(chip.x, chip.y, 2.4);
  for (const [u, color] of [
    [0.2, 0xd62828],
    [1.8, 0x111111],
  ] as const) {
    const card = p.facePoint(east, u, 18);
    g.fillStyle(0xffffff, 1).fillRect(card.x - 4, card.y - 6, 8, 11);
    g.fillStyle(color, 1).fillCircle(card.x, card.y - 0.5, 2.2);
  }

  // Techo: pretil dorado y una corona de focos con un rombo de neón al medio.
  p.box(-0.5, -0.5, 2.5, 2.5, HEIGHT, HEIGHT + 4, boxColors(GOLD));
  const top = p.p(1, 1, HEIGHT + 16);
  g.fillStyle(NEON, 1).fillPoints(
    [
      { x: top.x, y: top.y - 10 },
      { x: top.x + 9, y: top.y },
      { x: top.x, y: top.y + 10 },
      { x: top.x - 9, y: top.y },
    ],
    true,
  );
  g.fillStyle(GLOW, 1).fillCircle(top.x, top.y, 3);
  p.spire(1, 1, HEIGHT + 4, HEIGHT + 6, GOLD, 3);
}

export const casino: LandmarkDrawing = {
  size: 3,
  maxZ: HEIGHT + 30,
  draw: drawCasino,
};
