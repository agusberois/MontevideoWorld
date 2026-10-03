import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { drawUruguayFlag, facesOf } from "../common";
import { drawBowl, ovalPoints } from "./common";
import type { LandmarkDrawing } from "../types";

/**
 * Geometría del Estadio Centenario (coordenadas del dibujo base de 5 × 5, antes de escalar).
 * `rings` va de afuera hacia adentro: el borde, cuatro escalones de tribuna y la cancha.
 */
const CENTENARIO_BOWL = {
  size: 5,
  cx: 2.2,
  cy: 2.0,
  aspectY: 0.92,
  rings: [
    { r: 2.3, z: 34, color: 0xd9d4c9 },
    { r: 2.12, z: 30, color: 0xa9b3bb },
    { r: 1.92, z: 23, color: 0x8fa3ad },
    { r: 1.72, z: 16, color: 0xa9b3bb },
    { r: 1.52, z: 9, color: 0x8fa3ad },
    { r: 1.35, z: 4, color: 0x5f9a46 },
  ],
} as const;

/**
 * Estadio Centenario: la Torre de los Homenajes (atrás, al oeste), la tribuna en escalones con los
 * colores de las cuatro tribunas, la cancha con sus líneas y el muro exterior.
 */
function drawEstadioCentenario(p: IsoPainter) {
  drawTorreHomenajes(p, -0.2, 2.0);
  const { cx, cy, aspectY, rings } = CENTENARIO_BOWL;
  // Las líneas van sobre el césped pero antes de la tribuna de adelante, que las tapa: si no, se
  // dibujarían por encima de las gradas y la cancha se saldría del estadio.
  const drawPitch = () => {
    const z = 4.2;
    const hx = 0.95;
    const hy = 0.6;
    const g = p.g;
    g.lineStyle(1, 0xffffff, 0.9);
    g.strokePoints([p.p(cx - hx, cy - hy, z), p.p(cx + hx, cy - hy, z), p.p(cx + hx, cy + hy, z), p.p(cx - hx, cy + hy, z)], true);
    g.lineBetween(p.p(cx, cy - hy, z).x, p.p(cx, cy - hy, z).y, p.p(cx, cy + hy, z).x, p.p(cx, cy + hy, z).y);
    g.strokePoints(ovalPoints(p, cx, cy, 0.2, 0.2, z, 0, Math.PI * 2), true);
    for (const side of [-1, 1]) {
      const x0 = cx + side * hx;
      const x1 = cx + side * (hx - 0.28);
      g.strokePoints([p.p(x0, cy - 0.3, z), p.p(x1, cy - 0.3, z), p.p(x1, cy + 0.3, z), p.p(x0, cy + 0.3, z)], false);
    }
  };
  drawBowl(p, cx, cy, 1.0, aspectY, rings, 0xbcb6aa, true, drawPitch);
}

/** Torre de los Homenajes: alta, blanca, con nervaduras verticales, mirador y mástil con bandera. */
function drawTorreHomenajes(p: IsoPainter, x: number, y: number) {
  const white = 0xf3f1ea;
  const w = 0.2;
  const top = 96;
  p.box(x - w, y - w, x + w, y + w, 0, top, boxColors(white));
  for (const face of facesOf(x + w, y + w)) {
    const [u0, u1] = face.side === "south" ? [x - w, x + w] : [y - w, y + w];
    for (let i = 1; i < 4; i++) {
      const u = u0 + ((u1 - u0) * i) / 4;
      p.faceRect(face, u - 0.012, u + 0.012, 10, top - 14, shade(white, -22));
    }
    p.faceRect(face, u0 + 0.05, u1 - 0.05, top - 12, top - 4, 0x3a3f4c);
  }
  p.box(x - w - 0.04, y - w - 0.04, x + w + 0.04, y + w + 0.04, top, top + 4, boxColors(shade(white, -6)));
  drawUruguayFlag(p, x, y, top + 4);
}

export const estadioCentenario: LandmarkDrawing = {
  size: CENTENARIO_BOWL.size,
  maxZ: 112,
  draw: drawEstadioCentenario,
};
