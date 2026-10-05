import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * La Niké de Samotracia de la Intendencia (a la derecha de la entrada): copia de la Victoria alada,
 * sin cabeza ni brazos, con las alas abiertas hacia atrás y la túnica pegada al cuerpo por el viento,
 * parada sobre la proa de un barco encima de un pedestal de granito.
 */

const GRANITE = 0x8e9296;
const MARBLE = 0xe9e4da;

function drawNike(p: IsoPainter) {
  const g = p.g;
  p.box(-0.4, -0.4, 1.4, 1.4, 0, 6, boxColors(shade(GRANITE, 14)));
  p.box(-0.05, -0.05, 1.05, 1.05, 6, 40, boxColors(GRANITE));
  p.faceRect({ side: "south", y: 1.05 }, 0.25, 0.75, 18, 26, 0x8a6d3b);
  // La proa del barco donde se para.
  const base = p.p(0.5, 0.5, 40);
  g.fillStyle(shade(MARBLE, -12), 1).fillPoints(
    [
      { x: base.x - 10, y: base.y },
      { x: base.x + 12, y: base.y - 2 },
      { x: base.x + 8, y: base.y - 7 },
      { x: base.x - 9, y: base.y - 6 },
    ],
    true,
  );
  const f = { x: base.x, y: base.y - 7 };
  // Alas abiertas hacia atrás (la de atrás más oscura) y el cuerpo con la túnica.
  g.fillStyle(shade(MARBLE, -18), 1).fillPoints(
    [
      { x: f.x - 2, y: f.y - 24 },
      { x: f.x - 20, y: f.y - 44 },
      { x: f.x - 16, y: f.y - 30 },
      { x: f.x - 8, y: f.y - 20 },
    ],
    true,
  );
  g.fillStyle(MARBLE, 1).fillPoints(
    [
      { x: f.x - 6, y: f.y },
      { x: f.x + 5, y: f.y },
      { x: f.x + 4, y: f.y - 14 },
      { x: f.x + 2, y: f.y - 28 },
      { x: f.x - 3, y: f.y - 28 },
      { x: f.x - 4, y: f.y - 14 },
    ],
    true,
  );
  g.fillStyle(shade(MARBLE, -6), 1).fillPoints(
    [
      { x: f.x, y: f.y - 26 },
      { x: f.x - 14, y: f.y - 50 },
      { x: f.x - 6, y: f.y - 40 },
      { x: f.x - 2, y: f.y - 30 },
    ],
    true,
  );
  // Pliegues de la túnica.
  g.lineStyle(0.8, shade(MARBLE, -22), 1);
  for (const dx of [-2, 0.5, 3]) g.lineBetween(f.x + dx, f.y - 2, f.x + dx * 0.6, f.y - 22);
}

export const nike: LandmarkDrawing = {
  size: 2,
  maxZ: 110,
  draw: drawNike,
};
