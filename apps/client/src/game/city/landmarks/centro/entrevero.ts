import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * El Entrevero (José Belloni, Plaza Fabini): el grupo de bronce de jinetes y caballos trenzados en una
 * pelea, con las lanzas para todos lados, sobre una base de granito en medio de la fuente.
 */

const BRONZE = 0x4b5a46;
const GRANITE = 0x8e9296;
const WATER = 0x4f9fc4;

type Pt = readonly [number, number];

function drawEntrevero(p: IsoPainter) {
  const g = p.g;
  const c = p.p(1, 1, 0);

  // La fuente: espejo de agua ovalado con borde de piedra.
  g.fillStyle(shade(GRANITE, -25), 1).fillEllipse(c.x, c.y + 2, 150, 76);
  g.fillStyle(0xc9c0b0, 1).fillEllipse(c.x, c.y - 2, 150, 76);
  g.fillStyle(WATER, 1).fillEllipse(c.x, c.y - 2, 136, 66);
  g.fillStyle(shade(WATER, 25), 1).fillEllipse(c.x - 30, c.y - 10, 30, 8);
  g.fillStyle(shade(WATER, 25), 1).fillEllipse(c.x + 34, c.y + 8, 22, 6);

  // Base de granito.
  p.box(0.35, 0.35, 1.65, 1.65, 0, 16, boxColors(GRANITE));

  // El grupo de bronce: cuerpos de caballos y jinetes amontonados, más oscuros los de atrás.
  const base = p.p(1, 1, 16);
  const at = ([x, y]: Pt) => ({ x: base.x + x, y: base.y + y });
  const blob = (points: readonly Pt[], color: number) => g.fillStyle(color, 1).fillPoints(points.map(at), true);
  const limb = (a: Pt, b: Pt, width: number, color: number) => {
    g.lineStyle(width, color, 1);
    g.lineBetween(at(a).x, at(a).y, at(b).x, at(b).y);
  };
  const far = shade(BRONZE, -25);
  const mid = shade(BRONZE, -10);
  const light = shade(BRONZE, 22);

  // Lanzas de atrás.
  limb([-30, -20], [-6, -64], 1.6, far);
  limb([28, -18], [4, -70], 1.6, far);
  // Caballo de atrás, encabritado hacia la izquierda.
  blob(
    [
      [-4, -14],
      [-22, -22],
      [-30, -36],
      [-26, -46],
      [-18, -40],
      [-12, -30],
      [2, -26],
    ],
    far,
  );
  limb([-16, -16], [-18, 0], 3, far);
  // Caballo del medio, cayendo hacia la derecha.
  blob(
    [
      [-10, -10],
      [14, -12],
      [30, -22],
      [34, -32],
      [26, -34],
      [16, -26],
      [-6, -24],
    ],
    mid,
  );
  limb([20, -16], [26, 0], 3, mid);
  limb([-4, -12], [-8, 0], 3, mid);
  // Jinetes: torsos, brazos en alto y cabezas.
  for (const [x, y, color] of [
    [-14, -42, far],
    [6, -38, mid],
    [20, -46, BRONZE],
  ] as const) {
    blob(
      [
        [x - 4, y + 12],
        [x + 4, y + 12],
        [x + 3, y],
        [x - 3, y],
      ],
      color,
    );
    g.fillStyle(color, 1).fillCircle(at([x, y - 3]).x, at([x, y - 3]).y, 3.2);
    limb([x + 2, y + 2], [x + 10, y - 10], 2.2, color);
  }
  // Caballo de adelante, con la cabeza alta y la crin.
  blob(
    [
      [-20, -6],
      [8, -4],
      [18, -10],
      [24, -24],
      [30, -30],
      [24, -36],
      [14, -24],
      [-4, -20],
      [-18, -18],
    ],
    BRONZE,
  );
  limb([-14, -8], [-20, 0], 3.4, BRONZE);
  limb([6, -6], [10, 0], 3.4, BRONZE);
  // Lanzas de adelante y brillo del bronce.
  limb([-2, -20], [-34, -58], 1.8, shade(BRONZE, -5));
  limb([22, -40], [40, -76], 1.8, shade(BRONZE, -5));
  g.lineStyle(1.3, light, 1);
  g.strokePoints([at([-16, -18]), at([-2, -20]), at([14, -24]), at([24, -34])], false);

  // Chorros de la fuente alrededor de la base.
  g.lineStyle(1.5, 0xbfe6f5, 0.85);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(c.x + side * 40, c.y - 4);
    g.lineTo(c.x + side * 46, c.y - 18);
    g.lineTo(c.x + side * 52, c.y - 6);
    g.strokePath();
  }
}

export const entrevero: LandmarkDrawing = {
  size: 3,
  maxZ: 110,
  draw: drawEntrevero,
};
