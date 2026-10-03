import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Espacio de Arte Contemporáneo, en la ex Cárcel de Miguelete: el panóptico de ladrillo con la
 * rotonda central y su cúpula, y las alas de celdas (ahora salas) que salen de ella. El ala que da a
 * la calle (cara sur) está restaurada en blanco con el cartel del museo y un cubo de vidrio.
 */

const BRICK = 0xb5654a;
const RESTORED = 0xf1efe9;
const STONE = 0xd8cdb8;
const DOME = 0x6d7a80;

function drawEac(p: IsoPainter) {
  // Alas de atrás (norte y oeste), de ladrillo viejo con ventanitas de celda.
  p.box(2.0, -0.5, 3.0, 2.2, 0, 34, boxColors(BRICK));
  p.box(-0.5, 2.0, 2.2, 3.0, 0, 34, boxColors(BRICK));
  for (const face of facesOf(3.0, 2.2)) {
    const [u0, u1] = face.side === "south" ? [2.0, 3.0] : [-0.5, 2.2];
    p.windows(face, u0, u1, 6, 30, face.side === "south" ? 1 : 4, 2, { color: 0x2a2420, widthRatio: 0.3, heightRatio: 0.5 });
  }
  p.windows({ side: "south", y: 3.0 }, -0.5, 2.0, 6, 30, 4, 2, { color: 0x2a2420, widthRatio: 0.3, heightRatio: 0.5 });

  // Rotonda central con la cúpula del panóptico.
  p.box(1.7, 1.7, 3.3, 3.3, 0, 56, boxColors(STONE));
  for (const face of facesOf(3.3, 3.3)) {
    p.windows(face, 1.7, 3.3, 36, 52, 2, 1, { color: WINDOW, arched: true, widthRatio: 0.4 });
  }
  p.box(1.66, 1.66, 3.34, 3.34, 56, 60, boxColors(shade(STONE, -12)));
  p.dome(2.5, 2.5, 60, 22, DOME);
  p.spire(2.5, 2.5, 82, 92, 0x3b4046, 1.5);

  // Ala este (restaurada, frente a Arenal Grande) y ala sur (con el cartel del museo).
  p.box(3.3, 2.0, 5.5, 3.0, 0, 38, boxColors(RESTORED));
  p.box(2.0, 3.3, 3.0, 5.5, 0, 38, boxColors(RESTORED));
  const eastWing: Face = { side: "east", x: 5.5 };
  p.windows(eastWing, 2.0, 3.0, 6, 34, 2, 2, { color: WINDOW, widthRatio: 0.45, heightRatio: 0.6 });
  p.windows({ side: "south", y: 3.0 }, 3.3, 5.5, 6, 34, 4, 2, { color: WINDOW, widthRatio: 0.45, heightRatio: 0.6 });
  const southWing: Face = { side: "south", y: 5.5 };
  p.windows({ side: "east", x: 3.0 }, 3.3, 5.5, 6, 34, 4, 2, { color: WINDOW, widthRatio: 0.45, heightRatio: 0.6 });
  // Cartel "EAC": franja negra con letras blancas resumidas en tres bloques.
  p.faceRect(southWing, 2.05, 2.95, 24, 33, 0x1f1f22);
  for (const [u0, u1] of [
    [2.15, 2.35],
    [2.42, 2.62],
    [2.69, 2.89],
  ]) {
    p.faceRect(southWing, u0, u1, 26, 31, 0xf1efe9);
  }
  p.faceRect(southWing, 2.3, 2.7, 0, 18, 0x2b3442);

  // Cubo de vidrio contemporáneo en el patio sureste.
  p.box(3.7, 3.7, 5.3, 5.3, 0, 22, boxColors(0x9fc9d9, 0xd8eef5));
  for (const face of facesOf(5.3, 5.3)) {
    for (let i = 1; i < 4; i++) {
      const u = 3.7 + (1.6 * i) / 4;
      p.line(p.facePoint(face, u, 0), p.facePoint(face, u, 22), 0x5b6b75, 1, 0.6);
    }
  }
}

export const eac: LandmarkDrawing = {
  size: 6,
  maxZ: 96,
  draw: drawEac,
  // Cartel "MW": sobre el techo plano del ala este, que da a Arenal Grande.
  roof: { u: 4.6, v: 2.5, z: 38 },
};
