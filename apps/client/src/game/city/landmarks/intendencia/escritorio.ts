import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * Escritorio de atención al público de la Intendencia (2 × 2): la fila de atrás es la del empleado
 * (un NPC parado ahí, sin dibujo: es piso) y en la de adelante, la mesa de madera con la computadora
 * corrida a un costado (para no taparle la cara al empleado), una pila de expedientes, el sello y un
 * cartelito con el número de turno en el frente.
 */

const WOOD = 0x8a5a36;
const TOP = 0xb98b5e;
const METAL = 0x3b3f46;

function drawDesk(p: IsoPainter) {
  // La mesa, sobre la fila de adelante.
  p.box(-0.45, 0.55, 1.45, 1.35, 0, 16, boxColors(WOOD));
  p.box(-0.5, 0.5, 1.5, 1.4, 16, 18, boxColors(TOP));
  const front = { side: "south" as const, y: 1.35 };
  // Cajones y el cartelito del turno.
  p.faceRect(front, -0.3, 0.2, 4, 12, shade(WOOD, -14));
  p.faceRect(front, 0.8, 1.3, 4, 12, shade(WOOD, -14));
  p.faceRect(front, 0.38, 0.62, 9, 14, 0xf4efe3);
  p.faceRect(front, 0.44, 0.56, 10.5, 12.5, 0x1d4fa0);

  // Computadora corrida a la derecha del empleado, con el teclado adelante.
  p.box(0.75, 0.62, 1.15, 0.7, 18, 32, boxColors(METAL));
  p.faceRect({ side: "south", y: 0.7 }, 0.79, 1.11, 20, 30, 0x2c6e8f);
  p.box(0.9, 0.7, 1.0, 0.8, 18, 21, boxColors(METAL));
  p.box(0.7, 0.9, 1.15, 1.05, 18, 19.5, boxColors(0xd7d7dc));

  // Pila de expedientes y el sello.
  for (let i = 0; i < 4; i++) {
    p.box(1.22, 0.65, 1.42, 0.95, 18 + i * 1.6, 19.5 + i * 1.6, boxColors(i % 2 === 0 ? 0xe9dfc4 : 0xd4c49a), false);
  }
  p.box(-0.3, 1.0, -0.15, 1.15, 18, 22, boxColors(0x8f1f2c), false);
}

export const officeDesk: LandmarkDrawing = { size: 2, maxZ: 34, draw: drawDesk };
